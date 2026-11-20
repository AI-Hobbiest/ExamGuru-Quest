# Content provenance and intellectual-property controls

Status: M6 productisation policy  
Date: 2026-11-20

## Objectives

Protect original ExamGuru code, educational content and learning workflows; prevent accidental use of third-party material beyond its licence; and make it possible to trace each released content package to its source and review history.

## Provenance record required for every content family

- Content family and stable identifier.
- Author/creator or source organisation.
- Source URL, book/title, edition, chapter/page or source reference where applicable.
- Source type: original, licensed, public-domain, openly licensed, official public release, user-provided or AI-assisted draft.
- Licence/permission and any attribution requirement.
- Whether redistribution, modification and commercial use are permitted.
- ExamGuru editor/reviewer and review date.
- Version, approval state and intended release audience.
- Classification level (C0–C4) from the content classification policy.

## Review requirements

1. Original ExamGuru questions and notes should have an authoring record and revision history.
2. AI-assisted content is a draft until a human content reviewer verifies factual accuracy, answer correctness, syllabus alignment, originality and provenance.
3. Do not copy large textbook passages or commercial question-bank content into ExamGuru unless the required rights are documented.
4. Public examination papers are not automatically free of copyright restrictions. Record the source and the permitted use before redistributing the PDF or extracted content.
5. NCERT/CBSE, SOF, CLAT and other exam names may be used descriptively where appropriate; do not imply endorsement or affiliation without permission.
6. Keep answer keys, unreleased assessments, master prompts, review notes and generation logs out of public release artifacts unless deliberately approved.
7. Do not strip third-party attribution, licence notices or source references.
8. For institution-created content, record tenant ownership and creator membership; do not treat it as shared platform IP by default.

## Release provenance

Every release should carry a manifest with:
- Source commit and release version.
- Build timestamp and artifact file hashes.
- Content package identifiers and versions.
- Content classification and approval state.
- Third-party attribution/licence references.
- Automated security and regression check results.

The manifest contains no passwords, student personal data, secrets or private authoring notes.

## Anti-copying controls — realistic boundary

- Keep source code and master authoring content in a private source repository.
- Deliver only the browser assets and learner content required for the public product.
- Keep sensitive logic and protected content behind a trusted API with server-side authorization.
- Use customer-specific content/package watermarking where appropriate, with privacy and data-protection review.
- Maintain provenance, release history and access/audit evidence to support takedown or rights enforcement.

No browser-delivered code or content can be made impossible to copy. Obfuscation, watermarking and UI restrictions are deterrents and traceability aids, not absolute protection or a substitute for access control and legal rights.
