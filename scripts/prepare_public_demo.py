#!/usr/bin/env python3
"""Prepare a public, synthetic-only ExamGuru demo build.

The private source retains its account records. This script replaces those records
in the deployable site and disables the local-only administrator password check.
Static GitHub Pages authentication remains demo convenience, not security.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
import shutil

DEMO_DIR = Path("deployment/demo-data")
PRIVATE_IDENTIFIERS = (
    "c6pilot", "hamsini", "jp10", "sonaakshi", "srivatsav", "akshaya",
    "jayaprakash", "sathya", "shrutika",
)
ADMIN_EMAIL = "Jayaprakashganathe@gmail.com"
ADMIN_HASH = "c5c784554396ac628057cbad338efdf79fe7b1d797317728cf4b52d14af18ae2"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-root", required=True, type=Path)
    args = parser.parse_args()
    root = args.site_root.resolve()
    if not (root / "index.html").is_file() or not (root / "js/login-page.js").is_file():
        raise SystemExit("Public site root is incomplete; refusing to publish demo data.")

    for filename in ("student-accounts.json", "family-access.json"):
        source = DEMO_DIR / filename
        target = root / "data" / filename
        if not source.is_file() or not target.parent.is_dir():
            raise SystemExit(f"Missing demo fixture or site data directory: {source}")
        shutil.copyfile(source, target)

    student_data = json.loads((root / "data/student-accounts.json").read_text(encoding="utf-8"))
    family_data = json.loads((root / "data/family-access.json").read_text(encoding="utf-8"))
    if student_data.get("kind") != "c10-student-accounts" or family_data.get("kind") != "c10-family-access":
        raise SystemExit("Demo account fixtures have unexpected schemas.")
    if not student_data.get("accounts") or any(not str(row.get("username", "")).startswith("demo.") for row in student_data["accounts"]):
        raise SystemExit("Public student account set is not synthetic-only.")
    if not family_data.get("parents") or any(not str(row.get("username", "")).startswith("demo.") for row in family_data["parents"]):
        raise SystemExit("Public parent account set is not synthetic-only.")
    valid_student_ids = {str(row.get("studentId")) for row in student_data["accounts"]}
    for link in family_data.get("parentStudentLinks", []):
        if str(link.get("studentId")) not in valid_student_ids:
            raise SystemExit("A demo parent link references a non-demo student.")

    # No personal administrator identity or reusable password digest is shipped.
    login_path = root / "js/login-page.js"
    login = login_path.read_text(encoding="utf-8")
    if ADMIN_HASH not in login or ADMIN_EMAIL not in login:
        raise SystemExit("Expected local-only admin credential markers were not found; refusing unsafe build.")
    login = login.replace(ADMIN_EMAIL, "__PUBLIC_DEMO_ADMIN_DISABLED__")
    login, count = re.subn(
        r'const ADMIN_PASSWORD_SHA256="[^"]*";',
        'const ADMIN_PASSWORD_SHA256="";',
        login,
        count=1,
    )
    if count != 1:
        raise SystemExit("Could not disable the static admin credential.")
    login_path.write_text(login, encoding="utf-8")

    # Scrub the administrator email from all published text assets, including role guards.
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".js", ".html", ".json", ".css", ".txt", ".xml"}:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if ADMIN_EMAIL in content:
            path.write_text(content.replace(ADMIN_EMAIL, "__PUBLIC_DEMO_ADMIN_DISABLED__"), encoding="utf-8")

    # Ensure no original account identities or administrator credential digest escaped.
    for filename in ("student-accounts.json", "family-access.json"):
        content = (root / "data" / filename).read_text(encoding="utf-8").lower()
        for identifier in PRIVATE_IDENTIFIERS:
            if identifier in content:
                raise SystemExit(f"Private account identifier leaked into {filename}: {identifier}")
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".js", ".html", ".json", ".css", ".txt", ".xml"}:
            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            if ADMIN_HASH in content or ADMIN_EMAIL in content:
                raise SystemExit(f"Administrator credential marker remains in public asset: {path.relative_to(root)}")

    print(f"Prepared public demo build: {len(student_data['accounts'])} synthetic students, "
          f"{len(family_data['parents'])} synthetic parent(s); real account files replaced.")
    print("Static administrator sign-in disabled in the public demo build.")


if __name__ == "__main__":
    main()
