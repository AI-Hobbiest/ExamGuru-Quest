#!/usr/bin/env python3
"""Extract unchanged PDF files from official CBSE Class X ZIP packages.

The PDF payload bytes are copied verbatim. No page edits, recompression, merge,
watermark, OCR, or content conversion is performed.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

USER_AGENT = "ExamGuru-Quest-CBSE-PYQ-Extractor/1.0 (+https://ai-hobbiest.github.io/ExamGuru-Quest/)"
MAX_DOWNLOAD_BYTES = 300 * 1024 * 1024
MAX_MEMBER_BYTES = 150 * 1024 * 1024
MAX_TOTAL_UNCOMPRESSED_BYTES = 700 * 1024 * 1024
MAX_NESTED_DEPTH = 3


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def safe_pdf_name(value: str) -> str:
    base = PurePosixPath(value.replace("\\", "/")).name
    base = re.sub(r"[^A-Za-z0-9._() -]+", "-", base).strip(" .-_")
    if not base:
        base = "CBSE-paper.pdf"
    if not base.lower().endswith(".pdf"):
        base += ".pdf"
    return base[:150]


def validate_source_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "www.cbse.gov.in"
        or not parsed.path.startswith("/cbsenew/")
        or not parsed.path.lower().endswith(".zip")
    ):
        raise ValueError(f"Refusing non-CBSE ZIP source URL: {url}")


def download_package(url: str, cache_dir: Path) -> tuple[bytes, bool]:
    validate_source_url(url)
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / (hashlib.sha256(url.encode("utf-8")).hexdigest() + ".zip")
    if cache_file.is_file() and cache_file.stat().st_size > 4:
        payload = cache_file.read_bytes()
        if zipfile.is_zipfile(io.BytesIO(payload)):
            return payload, True
        cache_file.unlink(missing_ok=True)

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/zip, application/octet-stream, */*",
        },
    )
    last_error = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                final_url = response.geturl()
                if urllib.parse.urlparse(final_url).hostname != "www.cbse.gov.in":
                    raise ValueError(f"CBSE archive redirected outside cbse.gov.in: {final_url}")
                declared_length = response.headers.get("Content-Length")
                if declared_length and int(declared_length) > MAX_DOWNLOAD_BYTES:
                    raise ValueError(f"CBSE package exceeds the {MAX_DOWNLOAD_BYTES // (1024 * 1024)} MB safety limit: {url}")
                chunks = []
                total = 0
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_DOWNLOAD_BYTES:
                        raise ValueError(f"CBSE package exceeds the download safety limit: {url}")
                    chunks.append(chunk)
                payload = b"".join(chunks)
            if not zipfile.is_zipfile(io.BytesIO(payload)):
                raise ValueError(f"CBSE archive response is not a valid ZIP package: {url}")
            temporary = cache_file.with_suffix(".zip.tmp")
            temporary.write_bytes(payload)
            temporary.replace(cache_file)
            return payload, False
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            last_error = exc
            if isinstance(exc, ValueError) and "not a valid ZIP" in str(exc):
                raise
            if attempt < 4:
                time.sleep(attempt * 2)
    raise RuntimeError(f"Unable to download CBSE package after retries: {url}: {last_error}")


def _safe_member_name(name: str) -> bool:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    return not path.is_absolute() and not any(part in ("..", "") for part in path.parts)


def extract_pdf_members(
    payload: bytes,
    *,
    depth: int = 0,
    seen_archives: set[str] | None = None,
) -> list[tuple[str, bytes]]:
    if depth > MAX_NESTED_DEPTH:
        raise ValueError("Nested ZIP depth exceeded the safety limit.")
    seen_archives = seen_archives if seen_archives is not None else set()
    archive_hash = sha256_bytes(payload)
    if archive_hash in seen_archives:
        return []
    seen_archives.add(archive_hash)

    found: list[tuple[str, bytes]] = []
    total_uncompressed = 0
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for info in archive.infolist():
            if info.is_dir() or not _safe_member_name(info.filename):
                continue
            total_uncompressed += int(info.file_size or 0)
            if total_uncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES:
                raise ValueError("ZIP package exceeds the total extraction safety limit.")
            lower_name = info.filename.lower()
            if lower_name.endswith(".pdf"):
                if info.file_size <= 0 or info.file_size > MAX_MEMBER_BYTES:
                    raise ValueError(f"PDF member has an invalid or excessive size: {info.filename}")
                pdf_bytes = archive.read(info)
                if b"%PDF-" not in pdf_bytes[:1024]:
                    raise ValueError(f"ZIP member is named PDF but has no PDF header: {info.filename}")
                found.append((info.filename, pdf_bytes))
            elif lower_name.endswith(".zip") and depth < MAX_NESTED_DEPTH:
                nested_bytes = archive.read(info)
                if zipfile.is_zipfile(io.BytesIO(nested_bytes)):
                    found.extend(extract_pdf_members(
                        nested_bytes, depth=depth + 1, seen_archives=seen_archives
                    ))
    return found


def store_pdf_files(
    extracted: list[tuple[str, bytes]],
    output_dir: Path,
    global_file_index: dict[str, dict],
) -> list[dict]:
    rows = []
    files_dir = output_dir / "files"
    files_dir.mkdir(parents=True, exist_ok=True)
    for original_name, payload in extracted:
        digest = sha256_bytes(payload)
        filename = safe_pdf_name(original_name)
        relative_path = f"cbse-papers/files/{digest[:24]}-{filename}"
        destination = files_dir / f"{digest[:24]}-{filename}"
        if not destination.exists():
            destination.write_bytes(payload)
        row = {
            "filename": filename,
            "archivePath": original_name.replace("\\", "/"),
            "path": "./" + relative_path,
            "sizeBytes": len(payload),
            "sha256": digest,
            "unchanged": True,
        }
        global_file_index[digest] = row
        rows.append(row)
    rows.sort(key=lambda item: (item["filename"].lower(), item["sha256"]))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalogue", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--cache-dir", default=Path(".cache/cbse-pyq"), type=Path)
    args = parser.parse_args()

    catalogue = json.loads(args.catalogue.read_text(encoding="utf-8"))
    if catalogue.get("kind") != "cbse-class10-pyq-catalog" or catalogue.get("classId") != "10":
        raise ValueError("Unexpected CBSE catalogue kind or class.")
    records = catalogue.get("records")
    if not isinstance(records, list) or not records:
        raise ValueError("CBSE PYQ catalogue contains no records.")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    package_cache: dict[str, tuple[bytes, bool]] = {}
    global_file_index: dict[str, dict] = {}
    manifest_records = []
    downloaded_packages = 0
    cached_packages = 0

    for record in records:
        record_id = str(record.get("id", "")).strip()
        if not record_id or not re.fullmatch(r"[a-z0-9-]+", record_id):
            raise ValueError(f"Invalid catalogue record id: {record_id!r}")
        paper_url = record.get("paperUrl")
        if not paper_url:
            raise ValueError(f"Paper package URL is missing for {record_id}")
        kinds = [("paper", paper_url)]
        scheme_url = record.get("markingSchemeUrl")
        if scheme_url:
            kinds.append(("markingScheme", scheme_url))

        result = {
            "id": record_id,
            "year": str(record.get("year", "")),
            "examType": str(record.get("examType", "")),
            "subjectId": str(record.get("subjectId", "")),
            "subjectName": str(record.get("subjectName", "")),
            "subjectCode": str(record.get("subjectCode", "")),
            "paperFiles": [],
            "markingSchemeFiles": [],
        }
        for kind, url in kinds:
            if url not in package_cache:
                payload, from_cache = download_package(url, args.cache_dir)
                package_cache[url] = (payload, from_cache)
                if from_cache:
                    cached_packages += 1
                else:
                    downloaded_packages += 1
            payload, _ = package_cache[url]
            pdfs = extract_pdf_members(payload)
            if not pdfs:
                raise ValueError(f"No PDF files were found in the {kind} ZIP package for {record_id}: {url}")
            files = store_pdf_files(pdfs, args.output_dir, global_file_index)
            result["paperFiles" if kind == "paper" else "markingSchemeFiles"] = files
        manifest_records.append(result)
        print(
            f"[CBSE] {record_id}: {len(result['paperFiles'])} question PDF(s), "
            f"{len(result['markingSchemeFiles'])} marking-scheme PDF(s)"
        )

    manifest = {
        "schemaVersion": 1,
        "kind": "cbse-class10-pyq-pdf-manifest",
        "classId": "10",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Central Board of Secondary Education (CBSE), official Class X archive",
        "handling": {
            "extraction": "PDF files extracted from CBSE ZIP packages.",
            "preservation": "Each extracted PDF is published byte-for-byte as contained in the ZIP. No watermark, merge, page edit, re-compression, OCR, or content conversion is applied.",
            "attribution": "Every paper card identifies CBSE as the source and displays the year and examination type.",
        },
        "packageCount": len(package_cache),
        "downloadedPackageCount": downloaded_packages,
        "cachedPackageCount": cached_packages,
        "uniquePdfFileCount": len(global_file_index),
        "totalPdfBytes": sum(item["sizeBytes"] for item in global_file_index.values()),
        "records": manifest_records,
    }
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"[CBSE] Extraction complete: {len(manifest_records)} records, "
        f"{len(package_cache)} ZIP packages ({downloaded_packages} downloaded, {cached_packages} cached), "
        f"{len(global_file_index)} unique PDFs, {sum(item[\"sizeBytes\"] for item in global_file_index.values()) / (1024 * 1024):.1f} MiB."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[CBSE] ERROR: {exc}", file=sys.stderr)
        raise
