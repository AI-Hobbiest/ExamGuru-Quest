# ExamGuru RBAC and multi-tenant architecture v1

Status: Architecture baseline / M0 audit deliverable. Compatibility baseline: `aa1b53b772b7a106be7fc38efa13fed8fe475cd2`.

## Confirmed decisions
- A user identity may hold memberships in multiple institutions and multiple roles.
- A School Admin may administer multiple explicitly assigned institutions.
- Institutions may contain multiple branches/campuses.
- Teachers see only explicitly assigned classes, subjects and students.
- School Admins and delegated Teachers may create student/parent accounts within authorised scope.
- Parents may be linked to multiple children and institutions.
- Shared platform question banks and institution-owned question banks are both supported.
- Existing Parent, Teacher, Student and Platform Admin journeys remain compatible during phased migration.
- Cloud DB adoption is deferred, but all new contracts and application boundaries are provider-neutral.

## Architectural invariants
1. **Identity is not a role.** `users` identifies a person/login; roles are platform grants or institution memberships.
2. **Membership is scoped.** Each institution membership grants a role only within that institution. Branch scope is explicit; class/subject scope comes from assignments/enrolments.
3. **Tenant ownership is first-class.** Institution-owned records carry immutable `institutionId`; branch-owned records also carry `branchId`.
4. **Authorization is server authoritative.** UI route guards and hidden menus are UX only. Every protected read/write/export is checked by a trusted API.
5. **Client-selected tenant is untrusted.** Submitted institution/branch/class IDs are requested targets, never proof of access.
6. **Stable IDs and portable contracts.** Use opaque string IDs and ISO-8601 UTC timestamps; never use display names or array positions as foreign keys.
7. **Historical records preserve context.** Attempts retain question-bank/version and enrolment context. Promotions/transfers create new enrolments; old results are not rewritten.
8. **Provider neutrality.** Domain services depend on repository interfaces, not localStorage, D1 SQL, Cloudflare bindings, GitHub Pages paths or vendor SDKs.
9. **No silent migration inference.** A free-text legacy school name cannot establish an institution or branch. Ambiguous records remain unmapped until reviewed.
10. **Compatibility before cutover.** Legacy formats remain readable through a versioned anti-corruption adapter until reconciliation passes.

## M0 current-state audit

### Foundations to retain
- `data/contracts/v1/` already defines portable JSON contracts for profiles, attempts, answers, banks, backups and local-store envelopes.
- `js/storage.js` is a local persistence boundary and has an explicit sync outbox/adapter seam.
- `docs/data-sync-migration.md` correctly states no remote sync adapter is configured in the current static deployment.
- `cloudflare/worker.js` and `cloudflare/schema.sql` provide an optional authenticated API and D1 identity/session/attempt model.
- The Worker uses hashed bearer tokens, expiry, student password verification/rate limiting and GitHub OAuth allow-listing for the existing Platform Admin flow.
- Regression tests already cover account contracts, sessions, local storage, Parent experience and Cloudflare account assumptions.

### Gaps before institution onboarding
- GitHub Pages static account JSON is public convenience authentication only. Hashes and browser role checks are inspectable/bypassable; they are not production identity or tenant security.
- Current D1 `users.role` is a single global `admin|student` field, and Worker routes rely on it. It cannot represent multi-institution roles or a teacher who is also a parent.
- Parent/student links are in a published JSON file and have no institution/branch ownership.
- Student profiles contain free-text `school` and a class catalogue ID; neither is a trusted institution/branch relationship.
- `js/page-access.js` and navigation perform client-side gating, not server authorization.
- Local storage scopes learner records by student ID, but local keys/outbox are not tenant security boundaries.
- Existing D1 `classes` is a global grade catalogue, not an institution class/section. Keep it as a catalogue; introduce institution-specific class groups.
- Existing Worker routes are Admin/Student oriented. Do not widen Admin routes by merely accepting another role string.

## Target logical model

### Identity and roles
- `users`: canonical login/person identity.
- `platform_roles`: global grants such as `platform_admin`.
- `institutions`: tenant/customer organisation.
- `institution_memberships`: user + institution + role (`school_admin`, `teacher`, `parent`, `student`, later `institution_viewer`).
- `membership_branch_scopes`: explicit branch grants; all-branch access is explicit.
- `branches`: campus belonging to exactly one institution.

A user can hold multiple memberships and roles. Active institution/branch in the UI is context only; the API independently authorizes every operation.

### Academic structure
- `institution_classes`: grade + section + academic year within one branch.
- `teacher_assignments`: teacher membership + institution class + subject.
- `student_enrollments`: student membership + class + academic year + status.
- `parent_student_links`: parent membership + student membership + relationship, scoped to institution.
- Keep existing global `classes` as the grade catalogue; do not repurpose it.

### Content and assessment ownership
- Shared banks are platform-owned and read/assign-only for institutions.
- Institution banks are owned by exactly one institution and managed by School Admins or delegated Teachers.
- Copy-on-customize creates a new institution bank with source bank/version provenance; it never mutates the platform bank.
- Tests, assignments, submissions, reports and exports carry institution and applicable branch scope. Attempts retain immutable source/version references.

### Audit
Record actor, action, target, tenant/branch scope, timestamp, request ID and minimal metadata for sensitive operations. Never log passwords, bearer tokens, OAuth codes or unnecessary personal data.

## Permission evaluation contract
```text
authorize(actor, permission, resourceContext)
  -> authenticated?
  -> platform grant OR active institution membership?
  -> role grants requested permission?
  -> institution matches resource owner?
  -> branch in membership scope?
  -> class/subject assignment or parent/student relationship matches?
  -> resource state permits action?
  -> allow / deny (default deny)
```
Initial permissions include `institution.read/update/manage`, `branch.create/update/manage`, `membership.invite/update/disable`, `class.manage`, `teacher.assign`, `student.enrol`, `parent.link`, `question_bank.platform.read`, `question_bank.institution.manage`, `question_bank.copy_from_platform`, `assessment.create/assign/review`, and scoped report read/export permissions. Role names alone never bypass resource scope.

## Repository/application boundary
New/refactored domain modules depend on interfaces:
- `IdentityRepository`: users, memberships, platform roles, invitations, authenticated identity.
- `InstitutionRepository`: institutions, branches, class groups, branch scopes.
- `AcademicRepository`: teacher assignments, student enrolments, parent links.
- `QuestionBankRepository`: list/read/copy/publish with ownership.
- `AssessmentRepository`: tests, assignments, attempts and reports.
- `AuditRepository`: append/query audit events.
- `AuthorizationService`: permission + resource-context evaluation.

Adapters: current static JSON/localStorage adapter (development/backward compatibility only); future Cloudflare D1/API adapter (one provider implementation); any alternative SQL/backend adapter. UI calls domain services; domain services call repositories. Only adapters know localStorage, sessionStorage, fetch, D1 SQL or provider SDKs. No component constructs SQL or reads another tenant's records.

Offline learner records remain supported. Sync uses stable record IDs, schema version, optimistic version/updatedAt and idempotency key. Server derives the authenticated owner and never trusts client-supplied owner IDs.

## Migration sequence
### Phase A — contracts and additive schema (this branch)
Add versioned institution/branch/membership contracts and additive D1 tables. Keep legacy user.role, profiles, classes, login routes and API semantics unchanged. No new role login or tenant writes yet.
### Phase B — repository and authorization services
Introduce provider-neutral repository interfaces and deterministic in-memory test adapter. Static adapter is explicitly prototype-only. Add server authorization in Worker; client permission summaries are display hints only. Keep legacy routes until replacement routes pass equivalent tests.
### Phase C — identity and tenant provisioning
Create institutions/branches through authenticated endpoints. School Admins are invited/approved; no self-selection of privileged roles. Add memberships/branch scopes. Map legacy accounts only through reviewed mappings; preserve stable IDs. Never publish new account hashes in static JSON.
### Phase D — academic operations/content
Add classes, assignments, enrolments and parent links; shared/institution bank ownership; scoped tests/results/exports; audit events and tenant-isolation tests.
### Phase E — migration/cutover
1. Freeze versioned exports and back up local records/D1.
2. Import identities, institutions, branches and memberships; reconcile IDs/counts.
3. Import enrolments, parent links, bank ownership, attempts and answers.
4. Run dual-read comparisons; dual-write only after idempotency/rollback are proven.
5. Run cross-tenant negative tests.
6. Pilot one institution, then expand.
7. Keep read-only compatibility path during rollback window.
8. Remove legacy paths only after reconciliation, restore and rollback drills pass.

## Production gates
- Protected API routes authenticate server-side and default-deny.
- Tenant and branch scope is enforced in queries, exports, analytics, search, jobs and file URLs.
- ID/query/body/context tampering cannot cross tenants.
- School Admin only manages assigned institutions; Teachers only assigned classes/subjects/students; Parents only linked children; Students only own records.
- Institution users cannot mutate platform banks; institution edits never mutate shared source.
- Audit role changes, lifecycle, enrolment/transfer, assignments, results/marks changes, bank publication and exports.
- Backup/restore, deletion/retention, consent/privacy and recovery procedures are defined.
- No production student/institution records in public static JSON or protected only by browser code.

## Compatibility rules
- Existing question-bank JSON and profile/attempt/answer envelope v1 remain readable.
- Tenant context is optional/versioned metadata or related records; never reinterpret old `school` text as institution ID.
- Existing Parent/Student local flows remain available during transition.
- New API contracts use versioned routes (e.g. `/api/v2`) rather than silently changing legacy routes.
- Every legacy contract change requires fixtures and a documented migration.

## M0 exit criteria
Current boundaries documented; additive schemas/migration exist; legacy login/API schema unchanged; tests cover new contracts and compatibility; no production role or route behaviour changes in this architecture-only phase.
