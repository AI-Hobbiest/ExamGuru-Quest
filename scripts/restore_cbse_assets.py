#!/usr/bin/env python3
"""Restore the last published CBSE PDF assets without re-downloading or re-parsing them."""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

USER_AGENT = "ExamGuru-Quest-CBSE-asset-restore/1.0"
TIMEOUT_SECONDS = 45


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--catalogue", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    base = args.base_url.rstrip("/") + "/"
    catalogue = json.loads(args.catalogue.read_text(encoding="utf-8"))
    expected_ids = {str(row["id"]) for row in catalogue.get("records", [])}
    manifest_bytes = fetch(urljoin(base, "data/cbse-class10-pyq-files.json"))
    manifest = json.loads(manifest_bytes)
    if manifest.get("kind") != "cbse-class10-pyq-pdf-manifest" or manifest.get("classId") != "10":
        raise ValueError("Published CBSE PDF manifest has an unexpected format.")
    if {str(row.get("id")) for row in manifest.get("records", [])} != expected_ids:
        raise ValueError("Published CBSE PDF manifest does not match the current catalogue; a fresh extraction is required.")

    queue_bytes = fetch(urljoin(base, "data/cbse-class10-mcq-review-queue.json"))
    queue = json.loads(queue_bytes)
    if queue.get("kind") != "cbse-class10-mcq-review-queue" or queue.get("classId") != "10":
        raise ValueError("Published CBSE MCQ review queue has an unexpected format.")

    files: dict[str, dict] = {}
    for record in manifest["records"]:
        for field in ("paperFiles", "markingSchemeFiles"):
            for item in record.get(field, []):
                relative = str(item.get("path", ""))
                if not relative.startswith("./cbse-papers/files/") or ".." in Path(relative).parts:
                    raise ValueError("Unsafe path in published CBSE manifest: " + relative)
                files[relative] = item

    output = args.output_dir
    output.mkdir(parents=True, exist_ok=True)
    (output / "data").mkdir(parents=True, exist_ok=True)
    (output / "data/cbse-class10-pyq-files.json").write_bytes(manifest_bytes)
    (output / "data/cbse-class10-mcq-review-queue.json").write_bytes(queue_bytes)

    def restore(item: dict) -> tuple[str, bytes]:
        relative = str(item["path"])
        url = urljoin(base, relative.removeprefix("./"))
        payload = fetch(url)
        digest = hashlib.sha256(payload).hexdigest()
        if digest != item.get("sha256"):
            raise ValueError("SHA-256 mismatch while restoring " + relative)
        return relative, payload

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for relative, payload in pool.map(restore, files.values()):
            destination = output / relative.removeprefix("./")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)

    print(
        f"Restored published CBSE assets: {len(manifest['records'])} records, "
        f"{len(files)} verified PDFs, {queue.get('candidateCount', 0)} review candidates. "
        "No CBSE ZIP downloads or PDF parsing were performed."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
