# M8 — Role-aware Ask ExamGuru

## Product direction
Ask ExamGuru is one shared conversational interface. Its retrieval scope is resolved from the active role, the institution's enabled content add-ons, and that institution's own published content. It must not assume every institution has the same classes, subjects, competitive exams or question banks.

## GitHub-only development boundary
GitHub Pages serves public platform catalogues and published platform banks. GitHub Actions validates and deploys. No Cloudflare, Supabase, Firebase, hosted LLM, external API or external database is used in this stage. The current institution-owned content adapter uses browser-local storage as a development-stage persistence implementation. It is intentionally behind the existing content-store interface and can be replaced by a cloud database adapter later without changing the assistant's retrieval policy.

Static GitHub files are public and browser role checks are not secure authorization. Do not put confidential student records, credentials, private institution data or authoritative permissions in public files. Browser-local institution content is not centrally shared across devices in this development stage.

## Scope resolution
1. Platform content add-ons: Curriculum classes are eligible only when the active institution has curriculum enabled and the class ID is present in its curriculum classIds. Competitive-exam packs are eligible only when competitiveExams.enabled is true and the exam ID is present in competitiveExams.examIds. A global platform catalogue describes available packages; it does not grant them to every institution.
2. Institution-owned content: Read only the active institution's own content-store records. Include banks and test papers with status published; exclude drafts. The store's active institution ID must match the auth institution ID before its content is used.
3. Role and assignment scope: Students are restricted to their mapped content class. Teachers and HODs are restricted to assigned classes when that assignment context is available. Parent, Institution Viewer and Institution Admin access remains within the active institution. Platform Admin can inspect platform-published content; institution-private content is not globally aggregated across tenants.

## Retrieval behaviour
- Ask ExamGuru uses the same content-store interface as institution learning. The assistant does not read the local-storage key directly.
- Platform curriculum and competitive exam content is discovered through catalogues and published files. Missing or planned packages are not represented as available.
- Published institution banks index prompts, options and explanations; published papers index their available titles and question prompts.
- Count queries report platform bank counts and active-institution published bank content separately.
- Student Visual Revision cards are limited to the student's entitled class.
- Knowledge Base resources must be published and satisfy audience, class, institution and department metadata.
- Search is deterministic, bounded, and source-linked. No-match answers explicitly state that the enabled published material did not contain a match.
- Greeting/help intent is answered from the active role profile without requiring a knowledge search.

## Storage migration seam
The assistant consumes the ExamGuruInstitutionContent and ExamGuruLocalIAM APIs, not raw storage keys. The local adapter is a DEV-stage implementation. When cloud DB is approved, replace the persistence adapter behind these APIs and retain the same tenant, publication, entitlement and role-scope contracts.

## Acceptance gates
1. No institution receives curriculum or exam content unless the corresponding add-on is enabled and the ID is granted.
2. No cross-institution content is indexed.
3. Draft institution banks and papers are excluded.
4. Published institution banks and papers from the active institution are searchable.
5. Student searches remain within the mapped content class.
6. Teacher/HOD searches use assigned class scope where supplied.
7. Platform Admin can inspect platform-published content without default aggregation of private institution content.
8. No external runtime or service is introduced.
9. Tests cover add-on filtering, tenant isolation, publication filtering, class isolation, competitive exam entitlement and help/greeting intent.
10. GitHub Actions LMS-regression must pass before merge and deployment.

## Known static-hosting limitations
GitHub Pages does not enforce server-side RBAC. The browser-local adapter is suitable for DEV validation only; it does not provide secure multi-user tenancy, central sharing or cross-device synchronisation. Those capabilities remain for the separately approved cloud DB stage.