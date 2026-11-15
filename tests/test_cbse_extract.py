"from __future__ import annotations
import io
import sys
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from extract_cbse_papers import extract_pdf_members, safe_pdf_name

pdf_one = b"%PDF-1.4\n% original bytes unchanged\n%%EOF"
pdf_two = b"%PDF-1.7\n% another original PDF\n%%EOF"
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
print("CBSE extraction tests passed: original PDF bytes preserved, nested PDFs found, unsafe ZIP paths ignored.")
