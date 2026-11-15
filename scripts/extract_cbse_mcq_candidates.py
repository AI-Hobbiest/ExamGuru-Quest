#!/usr/bin/env python3
"""Build a review-only candidate queue from unchanged CBSE paper PDFs.

A candidate is never promoted directly into a live bank. The parser extracts
only question blocks with four recognisable A-D options. Marking-scheme matches
are suggestions for human verification, not trusted answer keys.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypdf import PdfReader
except Exception as exc:  # pragma: no cover - dependency is installed in CI
    PdfReader = None
    PDF_IMPORT_ERROR = str(exc)
else:
    PDF_IMPORT_ERROR = ""

QUESTION_START = re.compile(
    r"(?m)^[ \t]*(?:Q(?:UESTION)?[ \t]*\.?[ \t]*)?(\d{1,3})[.)][ \t]+(?=\S)",
    re.IGNORECASE,
)
OPTION_MARKER = re.compile(
    r"(?<![A-Za-z0-9])(?:\(([A-Da-d])\)|([A-Da-d])[).])[ \t]+"
)
ANSWER_LINE = re.compile(
    r"^[ \t]*(?:Q(?:UESTION)?[ \t]*\.?[ \t]*)?(\d{1,3})[.):]?[ \t]+(?:\(([A-Da-d])\)|([A-Da-d])[.)]?)[ \t]*$",
    re.IGNORECASE,
)


def normalise_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def fingerprint(prompt: str, options: list[str]) -> str:
    prompt_key = normalise_text(prompt).casefold()
    option_keys = sorted(normalise_text(item).casefold() for item in options)
    payload = prompt_key + "::" + "|".join(option_keys)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def extract_pdf_text(path: Path) -> list[str]:
    if PdfReader is None:
        raise RuntimeError("pypdf is required: " + PDF_IMPORT_ERROR)
    reader = PdfReader(str(path), strict=False)
    return [(page.extract_text() or "") for page in reader.pages]


def parse_answer_key(pages: list[str], source_file: str) -> dict[str, list[dict]]:
    answers: dict[str, list[dict]] = defaultdict(list)
    for page_number, page in enumerate(pages, start=1):
        for line in (page or "").splitlines():
            match = ANSWER_LINE.match(line)
            if not match:
                continue
            question_number = str(int(match.group(1)))
            answer = (match.group(2) or match.group(3) or "").upper()
            if answer not in {"A", "B", "C", "D"}:
                continue
            answers[question_number].append({
                "proposedOptionId": answer,
                "markingSchemeFile": source_file,
                "pageNumber": page_number,
                "verificationStatus": "unverified",
            })
    return answers


def parse_mcq_blocks(page_text: str) -> list[dict]:
    matches = list(QUESTION_START.finditer(page_text or ""))
    candidates = []
    for index, start_match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(page_text)
        block = page_text[start_match.start():end].strip()
        option_matches = list(OPTION_MARKER.finditer(block))
        labels = [(m.group(1) or m.group(2) or "").upper() for m in option_matches]
        if len(option_matches) != 4 or labels != ["A", "B", "C", "D"]:
            continue

        stem_end = option_matches[0].start()
        prompt = normalise_text(block[:stem_end])
        prompt = QUESTION_START.sub("", prompt, count=1).strip()
        if len(prompt) < 12:
            continue

        options = []
        for option_index, marker in enumerate(option_matches):
            start = marker.end()
            stop = option_matches[option_index + 1].start() if option_index + 1 < 4 else len(block)
            option_text = normalise_text(block[start:stop])
            if not option_text or len(option_text) > 500:
                options = []
                break
            options.append(option_text)
        if len(options) != 4:
            continue

        candidates.append({
            "questionNumber": str(int(start_match.group(1))),
            "prompt": prompt,
            "options": [
                {"optionId": label, "text": option_text}
                for label, option_text in zip(["A", "B", "C", "D"], options)
            ],
        })
    return candidates


def build_queue(manifest: dict, root_dir: Path) -> dict:
    if manifest.get("kind") != "cbse-class10-pyq-pdf-manifest" or manifest.get("classId") != "10":
        raise ValueError("Unexpected CBSE PDF manifest.")
    source_records = manifest.get("records")
    if not isinstance(source_records, list):
        raise ValueError("CBSE PDF manifest records are missing.")

    occurrences: dict[str, dict] = {}
    rejected = defaultdict(int)
    for record in source_records:
        year = str(record.get("year", ""))
        exam_type = str(record.get("examType", ""))
        subject_id = str(record.get("subjectId", ""))
        subject_code = str(record.get("subjectCode", ""))
        paper_id = str(record.get("id", ""))
        if not (re.fullmatch(r"20\d{2}", year) and paper_id and subject_id and subject_code):
            rejected["missing_source_metadata"] += 1
            continue

        answer_map: dict[str, list[dict]] = defaultdict(list)
        for scheme_file in record.get("markingSchemeFiles", []):
            scheme_path = root_dir / str(scheme_file.get("path", "")).removeprefix("./")
            if not scheme_path.is_file():
                rejected["missing_marking_scheme_pdf"] += 1
                continue
            try:
                for qnum, matches in parse_answer_key(extract_pdf_text(scheme_path), scheme_file.get("filename", scheme_path.name)).items():
                    answer_map[qnum].extend(matches)
            except Exception:
                rejected["unreadable_marking_scheme_pdf"] += 1

        for paper_file in record.get("paperFiles", []):
            paper_path = root_dir / str(paper_file.get("path", "")).removeprefix("./")
            if not paper_path.is_file():
                rejected["missing_paper_pdf"] += 1
                continue
            try:
                pages = extract_pdf_text(paper_path)
            except Exception:
                rejected["unreadable_paper_pdf"] += 1
                continue
            file_digest = str(paper_file.get("sha256", ""))
            for page_number, page in enumerate(pages, start=1):
                for parsed in parse_mcq_blocks(page):
                    qnum = parsed["questionNumber"]
                    options = parsed["options"]
                    texts = [item["text"] for item in options]
                    key = fingerprint(parsed["prompt"], texts)
                    source = {
                        "type": "CBSE_PYQ",
                        "reference": f"CBSE {year} {exam_type} {subject_code} · {paper_file.get('filename', '')} · Q{qnum}",
                        "year": year,
                        "examType": exam_type,
                        "paperId": paper_id,
                        "questionNumber": "Q" + qnum,
                        "subjectCode": subject_code,
                    }
                    occurrence = {
                        "source": source,
                        "paperFile": paper_file.get("filename", ""),
                        "paperFileSha256": file_digest,
                        "pageNumber": page_number,
                        "answerKeyCandidates": answer_map.get(qnum, []),
                    }
                    if key not in occurrences:
                        occurrences[key] = {
                            "candidateId": "CBSE-MCQ-" + key[:16].upper(),
                            "classId": "10",
                            "subjectId": subject_id,
                            "chapterKey": None,
                            "chapterMappingStatus": "needs-human-review",
                            "prompt": parsed["prompt"],
                            "options": options,
                            "correctOptionId": None,
                            "proposedAnswers": [],
                            "difficulty": "unspecified",
                            "difficultyStatus": "needs-human-review",
                            "competency": None,
                            "competencyStatus": "needs-human-review",
                            "explanation": "",
                            "source": source,
                            "sourceOccurrences": [],
                            "reviewStatus": "pending-human-review",
                            "reviewNotes": [
                                "Verify the exact stem and all four options against the original CBSE PDF.",
                                "Confirm the correct option against the official marking scheme; any parsed answer is only a proposal.",
                                "Map the question to the current ExamGuru chapter and topic.",
                                "Set difficulty and competency before promotion to the live question bank.",
                            ],
                        }
                    row = occurrences[key]
                    row["sourceOccurrences"].append(occurrence)
                    for proposed in occurrence["answerKeyCandidates"]:
                        row["proposedAnswers"].append({
                            **proposed,
                            "sourceOccurrence": source,
                        })

    queue = list(occurrences.values())
    queue.sort(key=lambda row: (
        row["subjectId"], row["source"]["year"], row["source"]["examType"],
        row["source"]["paperId"], row["source"]["questionNumber"], row["candidateId"]
    ))
    return {
        "schemaVersion": 1,
        "kind": "cbse-class10-mcq-review-queue",
        "classId": "10",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "CBSE official Class X question papers and marking schemes",
        "policy": "Candidates are review-only. They are not included in student question banks until a human verifies the exact question, answer, chapter, difficulty and competency.",
        "candidateCount": len(queue),
        "sourceOccurrenceCount": sum(len(row["sourceOccurrences"]) for row in queue),
        "deduplicatedOccurrenceCount": sum(max(0, len(row["sourceOccurrences"]) - 1) for row in queue),
        "candidates": queue,
        "rejectedOrSkipped": dict(rejected),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--site-root", type=Path, default=Path("_site"))
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    queue = build_queue(manifest, args.site_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"[CBSE MCQ Review] {queue['candidateCount']} deduplicated candidate(s), "
        f"{queue['sourceOccurrenceCount']} source occurrence(s); "
        "none auto-published to live banks."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[CBSE MCQ Review] ERROR: {exc}", file=sys.stderr)
        raise
