from __future__ import annotations
import io
import sys
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import extract_cbse_papers as cbse_extract
from extract_cbse_papers import extract_pdf_members, safe_pdf_name, prefetch_packages

pdf_one = b"%PDF-1.4" + bytes([10]) + b"% original bytes unchanged" + bytes([10]) + b"%%EOF"
pdf_two = b"%PDF-1.7" + bytes([10]) + b"% another original PDF" + bytes([10]) + b"%%EOF"
nested = io.BytesIO()
with zipfile.ZipFile(nested, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("Nested/second paper.pdf", pdf_two)
outer = io.BytesIO()
with zipfile.ZipFile(outer, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("Paper Set 1/Paper A.pdf", pdf_one)
    z.writestr("nested.zip", nested.getvalue())
    z.writestr("../escape.pdf", pdf_one)
    z.writestr("readme.txt", "not a PDF")
found = extract_pdf_members(outer.getvalue())
assert len(found) == 2, found
found_bytes = {Path(name).name: payload for name, payload in found}
assert found_bytes["Paper A.pdf"] == pdf_one, "extracted PDF bytes must be preserved exactly"
assert found_bytes["second paper.pdf"] == pdf_two, "nested ZIP PDFs are extracted without conversion"
assert safe_pdf_name("../unsafe/CBSE Paper?.pdf") == "CBSE Paper-.pdf"

# A slow/unavailable source package must not block every other archive in the catalogue.
def fake_download(url, cache_dir):
    if url.endswith("/unavailable.zip"):
        raise RuntimeError("simulated CBSE archive timeout")
    return (b"cached package" if url.endswith("/cached.zip") else b"fresh package",
            url.endswith("/cached.zip"))

from unittest.mock import patch
with patch.object(cbse_extract, "download_package", side_effect=fake_download):
    package_cache, package_errors = prefetch_packages([
        "https://www.cbse.gov.in/cbsenew/question-paper/2023/X/fresh.zip",
        "https://www.cbse.gov.in/cbsenew/question-paper/2023/X/unavailable.zip",
        "https://www.cbse.gov.in/cbsenew/question-paper/2023/X/cached.zip",
    ], Path("."))
assert len(package_cache) == 2, package_cache
assert len(package_errors) == 1, package_errors
assert package_errors[next(iter(package_errors))].startswith("RuntimeError:")
assert package_cache["https://www.cbse.gov.in/cbsenew/question-paper/2023/X/cached.zip"][1] is True
assert package_cache["https://www.cbse.gov.in/cbsenew/question-paper/2023/X/fresh.zip"][1] is False
print("CBSE extraction tests passed: original PDF bytes preserved, nested PDFs found, unsafe ZIP paths ignored.")
