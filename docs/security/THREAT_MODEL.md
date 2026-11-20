# ExamGuru Quest — Initial threat model

Status: M6 working baseline  
Date: 2026-11-20  
Scope: current GitHub Pages portal and future multi-tenant SaaS boundary

## Assets to protect

1. Source code, release pipeline and deployment credentials.
2. Student, parent, teacher and institution identity records.
3. Institution membership, department appointments, branch/class scopes and entitlements.
4. Student profiles, attempts, answers, reports, learning history and backups.
5. Question-bank master sources, answer keys, unreleased papers and exam blueprints.
6. Curriculum, Study Library and proprietary learning/assessment logic.
7. Demo environments, credentials, expiry records and sample data.
8. Subscription plans, billing status and feature entitlements when introduced.
9. Audit events and administrative actions.

## Trust boundaries

| Boundary | Current state | Required future control |
|---|---|---|
| Browser ↔ GitHub Pages | Static assets are public and user-controlled. | Never trust browser state for identity, permission or tenant ownership. |
| Browser ↔ API | Optional API client exists, but current API base is empty. | TLS, short-lived revocable sessions, request validation, server-side policy checks. |
| User ↔ institution | Local role/context previews exist. | Server-verified active membership and explicit branch/department/class/relationship scope. |
| Admin ↔ platform | Local admin workspace exists. | Strong platform-admin authentication, least privilege, confirmation for destructive actions and immutable audit events. |
| Public site ↔ content store | Many data files are committed to the public repository. | Only deliberately released content in public artifacts; restricted content delivered after server authorization. |
| CI ↔ production | GitHub Actions deploy Pages from main. | Least-privilege workflow permissions, protected release path, no secrets in artifacts, verification and rollback. |
| Demo ↔ production data | No secure demo service is active. | Isolated tenant/sample data, server-side expiry, revocation and reset, no real student data. |

## Threat scenarios and required controls

| Threat | Example | Required mitigation |
|---|---|---|
| Source copying | A third party clones the public repository. | Private source/build separation; release artifact minimisation; legal ownership evidence. Obfuscation is supplementary only. |
| Credential exposure | A token or password is committed. | Secret scanning, credential rotation, no secrets in frontend assets, least-privilege CI credentials. |
| Account impersonation | User edits localStorage or static account data. | Server-authenticated identity and opaque revocable sessions. |
| Role escalation | Student changes a browser role value to teacher/admin. | Deny-by-default server authorization on every protected request. |
| Tenant data leakage | User submits another institution ID. | Derive actor scope from verified memberships and enforce tenant ownership in repositories/queries. |
| Department scope escalation | Teacher accesses another department's students or HOD actions. | Explicit department membership, teaching assignments and primary/backup HOD appointments; validate each action. |
| Content scraping | User downloads every public question-bank JSON file. | Separate master sources from released content; entitlement-aware server delivery; rate limits and audit. |
| Demo abuse | Demo user extends expiry by changing the device clock. | Server-side expiry and session invalidation; demo-only synthetic data. |
| Session theft/replay | A bearer token is copied from a browser. | Short lifetime, revocation, secure storage/transport policy, session rotation and audit. |
| Supply-chain compromise | A workflow action or dependency is compromised. | Pin third-party actions to reviewed immutable SHAs before commercial launch, Dependabot, minimal workflow permissions and code review. |
| Malicious release | Unreviewed change reaches production. | Protected release branch, required checks, approval gate, artifact verification and rollback. |
| Subscription bypass | Client changes plan/entitlement fields. | Server-owned subscription and entitlement state; never trust client-supplied plan values. |

## Required authorization invariants

- Identity is distinct from platform roles and institution memberships.
- Institution Viewer remains a distinct institution-scoped membership role.
- HOD is not a global login role or standalone institution membership role. It is a department-scoped appointment layered over a teacher membership.
- A teacher may teach across departments while holding a HOD appointment in one department.
- A department supports at most one active Primary and one active Backup HOD appointment.
- A submitted institution, branch, department, class, student or bank ID is a requested target, never proof of access.
- Every protected read, write, export, report, invitation, demo operation and content request must be authorized on the server.
- Cross-tenant denial must be tested using direct API requests, not only UI navigation.
- Historical attempts and answer records retain their original ownership and academic context.

## Current residual risk

Until a trusted backend is deployed, browser-only authentication, local role previews, local demo expiry and local account administration are not suitable for external SaaS security claims. GitHub Pages cannot hold secrets or perform server-side authorization. Do not onboard real institutions or student records on the assumption that local RBAC is a security boundary.
