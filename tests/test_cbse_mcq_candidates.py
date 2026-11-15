from __future__ import annotations
import json
import tempfile
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from extract_cbse_mcq_candidates import build_queue, parse_mcq_blocks

sample = """1. Which of the following statements is correct?
(A) Statement A
(B) Statement B
(C) Statement C
(D) Statement D
2. Write a short answer in two sentences.
"""
parsed = parse_mcq_blocks(sample)
assert len(parsed) == 1, parsed
assert parsed[0]["questionNumber"] == "1"
assert parsed[0]["prompt"] == "Which of the following statements is correct?"
assert [o["optionId"] for o in parsed[0]["options"]] == ["A","B","C","D"]
assert [o["text"] for o in parsed[0]["options"]] == ["Statement A","Statement B","Statement C","Statement D"]

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    # No PDF files are needed for an empty-input contract test.
    manifest = {
        "schemaVersion": 1,
        "kind": "cbse-class10-pyq-pdf-manifest",
        "classId": "10",
        "records": [{
            "id": "2026-main-board-mathematics-standard",
            "year": "2026",
            "examType": "Main Board",
            "subjectId": "mathematics-standard",
            "subjectCode": "041",
            "paperFiles": [],
            "markingSchemeFiles": [],
        }],
    }
    queue = build_queue(manifest, root)
    assert queue["kind"] == "cbse-class10-mcq-review-queue"
    assert queue["candidateCount"] == 0
    assert queue["candidates"] == []
print("CBSE MCQ review-queue tests passed: A-D extraction, answer-neutral staging and provenance metadata contract.")
