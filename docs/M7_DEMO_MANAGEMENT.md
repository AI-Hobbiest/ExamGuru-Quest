# M7 — Demo Management

Status: In progress
Working branch: `productisation/m7-demo-management`
Dependency: M6 security foundation and provider-neutral API contract
Persistence: provider-neutral service contract only; no production demo access until a trusted server is deployed

## Goal

Give Platform Admins a controlled way to demonstrate ExamGuru to prospective institutions and stakeholders without exposing real institutions, real learner records, credentials, restricted content or administrative powers.

M7 supports both:
1. **Pre-created persona demos** — Platform Admin selects a maintained persona template, such as Institution Admin, Institution Viewer, Teacher, HOD/Teacher, Parent or Student.
2. **On-demand demos** — Platform Admin chooses a permitted combination of demo roles and a sample-data profile for a specific demonstration.

The two creation paths use the same isolated environment lifecycle and security rules.

## Approved policy

- Default duration: **7 days**.
- Permitted duration choices: **1, 3, 7 or 14 days**.
- Every demo has its own synthetic demo tenant and sample data namespace.
- Demo access never creates or modifies a real institution, membership, student, parent-child relationship, class, assignment, attempt, report or learning record.
- No Platform Admin role can be issued to a demo.
- HOD is an additional responsibility on a Teacher persona, not an independent global role. A HOD demo must include Teacher.
- Institution Viewer remains a separate read-only persona.
- Existing HOD rules remain intact: primary/backup appointment model, maximum two active HODs per department, and teachers may teach in departments outside their primary department.
- Expiry is enforced server-side on every authenticated request. Client clocks, browser storage and hidden UI controls are never sufficient.
- Expiry and revocation invalidate existing sessions; a session-version check is required.
- All lifecycle changes are audited without credentials, passwords, session tokens or secrets.

## Platform Admin workflows

### Persona catalogue
- Maintain versioned persona templates with role composition, sample-data profile, allowed modules and restrictions.
- Allow Platform Admin to create a demo from a selected template.
- Template changes do not silently mutate already-created demos.
- HOD persona template includes Teacher plus a department-scoped HOD appointment; it does not bypass the two-HOD department rule in a demo dataset.

### On-demand generator
- Select one or more permitted roles.
- HOD can be selected only with Teacher.
- Choose sample-data profile and duration.
- Validate role combinations and template restrictions before creating the isolated environment.
- Never allow Platform Admin, real institution IDs, or references to production learners.

### Lifecycle management
- List active, expired and revoked demo environments.
- Extend an active or expired-but-not-revoked demo within the maximum 14-day remaining lifetime.
- Reset demo sample data to its approved template baseline.
- Revoke immediately.
- Revoke and expiry invalidate all sessions and access tokens.
- Repeated revoke requests are idempotent.
- Record create, extend, reset and revoke actions in append-only audit history.

## Security and isolation requirements

- Every demo tenant uses a reserved namespace and synthetic identities/data only.
- No production institution, student, parent, teacher, attempt or learning-record identifier may be reused as a demo-owned record.
- Sample content must be released/demo-safe content only. No C2/C3/C4 material, answer keys, unreleased papers, master banks, or restricted institution content.
- Demo accounts cannot export institution datasets, download backups containing real data, manage billing, change global security settings, create real institutions, invite real users or grant privileged roles.
- Demo session context carries demo ID and session version; the server resolves the tenant and roles from the stored demo record.
- Every protected request checks status, expiry, revocation and current session version.
- No client-supplied tenant ID or role is authoritative.
- Audit records are append-only and redact credentials and tokens.

## Implementation already added in this slice

- `js/domain/demo-management.js`: provider-neutral lifecycle service with Platform Admin authorization injection, persona-template validation, on-demand role validation, expiry, extend/reset/revoke, session-version invalidation and audit events.
- `tests/demo-management.test.js`: lifecycle tests for both creation paths, role restrictions, expiry, session invalidation, reset, revoke, authorization and audit redaction.

The service is not connected to public pages or production auth. It must be backed by trusted server-side authorization, repositories, session validation and sample-data isolation before any external demo URL or credentials are issued.

## Work packages

### M7.0 — Policy and persona catalogue
Define versioned persona templates, permitted role combinations, sample-data profiles and restrictions.

### M7.1 — Demo lifecycle domain service
Implement create, list, extend, reset, revoke, expiry and audit with injected provider-neutral repositories.

### M7.2 — Server-enforced access
Implement authenticated demo sessions with server-side expiry/revocation/session-version checks. This is a hard release gate, not optional future polish.

### M7.3 — Isolated demo data provisioning
Provision synthetic tenant, identities, academic structure, sample content and sample learning records. Verify zero references to production records.

### M7.4 — Platform Admin interfaces
Provide both persona-based creation and on-demand demo generation, plus lifecycle management, reset, extension, immediate revoke and audit history.

### M7.5 — Abuse controls and release gates
Restrict sensitive operations and exports; test role escalation, cross-tenant access, expired/revoked sessions, IDOR, credential leakage and demo-to-production data contamination.

## Acceptance criteria

1. Platform Admin is the only actor allowed to create, list, extend, reset or revoke demos.
2. Both pre-created persona and on-demand demo flows work.
3. Duration defaults to 7 days and only 1/3/7/14-day choices are accepted.
4. Demo expiry is checked server-side for every request, not just at login.
5. Expiry, extension, reset and revocation invalidate prior sessions as specified.
6. A revoked demo cannot be extended or reset.
7. A demo cannot receive Platform Admin privileges.
8. HOD requires Teacher; Institution Viewer remains a separate read-only role.
9. Every demo uses an isolated synthetic tenant and sample data; no real learner data is copied.
10. Restricted content, exports and sensitive operations are unavailable to demo users.
11. Create, extend, reset and revoke are audited; credentials and tokens never enter audit logs.
12. Existing Independent Learner, school, Parent, Student, Teacher, HOD and Institution Viewer experiences remain unchanged.
13. No cloud provider, paid infrastructure, database or live deployment is activated without separate approval.

## Explicit non-goals

- Cloud DB migration or student-data sync.
- Public self-registration.
- Production demo links or credentials before server-enforced expiry and isolation exist.
- Subscription billing or payment integration.
- Changing repository visibility, Pages hosting or existing learner login.
- Treating local browser IAM, local storage or client-side expiry as security.

## Release protocol

Keep M7 on its own feature branch and draft PR. Do not merge or deploy until M6 dependency reconciliation, server-side enforcement, isolation tests and all existing LMS regression gates pass. A passing domain-service unit test alone is not a production-ready demo system.
