#!/usr/bin/env python3
"""Fail the build if private account records or local admin credentials enter _site."""
import argparse
import json
from pathlib import Path

PRIVATE_MARKERS = ("c6pilot", "hamsini", "jp10", "sonaakshi", "srivatsav", "akshaya",
                   "jayaprakash", "sathya", "shrutika")
ADMIN_EMAIL = "Jayaprakashganathe@gmail.com"
ADMIN_HASH = "c5c784554396ac628057cbad338efdf79fe7b1d797317728cf4b52d14af18ae2"

parser = argparse.ArgumentParser()
parser.add_argument("--site-root", required=True, type=Path)
root = parser.parse_args().site_root
students = json.loads((root / "data/student-accounts.json").read_text(encoding="utf-8"))
family = json.loads((root / "data/family-access.json").read_text(encoding="utf-8"))
assert students["accounts"] and all(x["username"].startswith("demo.") for x in students["accounts"])
assert family["parents"] and all(x["username"].startswith("demo.") for x in family["parents"])
ids = {x["studentId"] for x in students["accounts"]}
assert all(x["studentId"] in ids for x in family["parentStudentLinks"])
for name in ("student-accounts.json", "family-access.json"):
    content = (root / "data" / name).read_text(encoding="utf-8").lower()
    assert not any(marker in content for marker in PRIVATE_MARKERS), f"Private account data leaked: {name}"
for path in root.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".js", ".html", ".json", ".css", ".txt", ".xml"}:
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        assert ADMIN_EMAIL not in content, f"Admin email leaked: {path}"
        assert ADMIN_HASH not in content, f"Admin password digest leaked: {path}"
login = (root / "js/login-page.js").read_text(encoding="utf-8")
assert 'const ADMIN_PASSWORD_SHA256="";' in login
assert 'const DEMO_ADMIN_USERNAME="demo.admin";' in login
assert 'const DEMO_ADMIN_PASSWORD_SHA256="d77e5918cf2e8b295e375ffa213681e6008f5e4b5c369e6a559c251a669d9775";' in login
admin_page = (root / "admin.html").read_text(encoding="utf-8")
assert '"demo.admin"' in admin_page, "Synthetic staging admin is not authorised by the admin page gate."
print("PASS: only synthetic accounts are published; local admin credential is disabled.")
