# RBAC Phase 1–3 implementation status

Last reviewed: 2026-11-18

## Operating decision

Cloudflare D1 provisioning, Worker deployment and live migrations are deferred until a suitable desktop/laptop session. Development continues against provider-neutral domain contracts, deterministic in-memory repositories, SQLite migration tests and Worker API contract tests. No production institution data is created in GitHub Pages or browser storage.

## Initial Platform Admin bootstrap

- The initial global Platform Admin is the GitHub identity `AI-Hobbiest`, corresponding to the existing owner/admin account used for the ExamGuru repository.
- The legacy static Admin username `Jayaprakashganathe@gmail.com` remains a prototype-only login and is not itself a trusted RBAC identity. On central GitHub OAuth sign-in, the Worker creates or refreshes the `platform_admin` grant only for GitHub logins explicitly listed in `PLATFORM_ADMIN_GITHUB_USERS`.
- Platform Admin API authorization checks require both the configured allowlist and an active `platform_roles` database grant. Merely having the legacy `users.role=admin` value is insufficient.
- This bootstrap becomes effective only after migration 0003 is applied to D1 and the updated Worker is deployed. It does not activate the role on GitHub Pages while `C10_API_BASE` is blank.

## Phase 1 — RBAC foundation

Existing baseline retained:
- Canonical identity is separate from platform roles and institution memberships.
- Institution roles are school_admin, teacher, parent, student and institution_viewer.
- Branch, class, subject, teacher assignment, enrolment and parent-child relationships are explicit scopes.
- HOD remains an effective-dated department appointment, never a global role.
- Provider-neutral repository contracts and deterministic memory/static prototype adapters remain in place.

Hardening in this change:
- Multi-role users must select an explicit institution membership when more than one membership can satisfy a permission. Authorization no longer depends on the order memberships happen to be returned.
- Class context checks reject inactive class groups as well as tenant/branch mismatches.
- Regression coverage verifies multi-role ambiguity and explicit membership selection.

## Phase 2 — institutional operations

M4 Worker authorization is separated into two decisions:
- Visibility: active membership branch scopes, all-branch grant, or delegated branch-admin appointment.
- Management: School Admin within their explicit scope, or a delegated branch administrator within the appointed branch.

Teachers can read only their own active assignments and the class groups/enrolments for classes they teach. Teachers are not granted School Admin mutation rights by having a branch scope. Delegated branch administrators retain their explicitly appointed branch management rights.

When a School Admin with explicit branch scopes creates a new branch, that branch is added to the creator's scope. This prevents the newly created branch from becoming inaccessible to its creator.

## Phase 3 — LMS integration boundary

The existing student/parent/static-admin LMS journeys remain compatible. M1/M2/M3/M4 domain and Worker APIs are available in source and covered by automated tests, but the new institution identity is not yet connected to the live GitHub Pages login. The current static account JSON and browser role checks are prototype conveniences only; they are not a secure institutional authorization boundary.

Before institutional roles can be used with real students, the following activation work remains:
1. Provision D1 and apply migrations 0003–0006 in order after a verified backup.
2. Configure the Worker and GitHub OAuth secrets securely.
3. Connect the frontend to the Worker and reconcile legacy accounts into reviewed institution memberships.
4. Complete role-specific authenticated API routes for LMS assessments, content, reports and exports; each query/export must derive tenant and class scope from the authenticated server context.
5. Run cross-tenant negative tests against the deployed service before onboarding real records.

## Explicit non-goals while cloud activation is deferred

- Do not use localStorage, published JSON, or client-only permission checks as a production substitute for server-side RBAC.
- Do not claim institutional RBAC is live merely because GitHub Pages or CI deploys successfully.
- Do not apply D1 migrations or deploy the Worker without a backup and explicit rollout approval.

## Validation

The CI workflow is the acceptance gate for the RBAC contract, SQLite migration, M1 policy, M2 identity/session, M3 department/HOD, M4 institutional operations and existing LMS regression suites. The PR check result must be reviewed before merging.

## Local Platform Admin test mapping (Cloudflare deferred)

The legacy Admin login `Jayaprakashganathe@gmail.com` is mapped to a **local-only Platform Admin test identity** after its existing password check succeeds. The session carries `platformRoles: ["platform_admin"]` and `rbacTestMode: "local-platform-admin"`.

When the central API is not configured, Institution Operations recognizes this explicit test marker and opens a demo workspace. Branches, classes, assignments, enrolments, guardian links and delegated branch admins can be exercised as temporary in-memory records. Refreshing the page clears those demo records. This path does not call the Worker, create D1 rows, or grant production privileges.

This is deliberately a UI/workflow test harness, not secure authorization: browser session storage and client code can be modified by the user. Production Platform Admin remains the GitHub OAuth + D1-backed role grant described above. Remove or disable the local test mapping when central authentication is activated and verified.

## Multi-role account model and institution delegation

- A canonical user account may hold multiple platform roles and multiple institution memberships. The same user may have distinct memberships such as teacher and parent within one institution, or different roles across institutions. The database uniqueness key is per user + institution + role, not per user alone.
- Platform roles remain separate from institution memberships. Institution Admin cannot grant or revoke platform roles.
- Institution Admin may invite existing enabled accounts into permitted institution roles within the active institution and only within the admin's branch scope. Institution Admin cannot appoint another Institution Admin or grant all-branch scope; those escalations remain Platform Admin actions.
- Platform Admin may appoint Institution Admin and grant all-branch scope. Each role remains a separate membership and must be selected explicitly as the active context when a request depends on that role.
- Local RBAC test mode exposes a role switcher for Platform Admin, Institution Admin, Teacher, Parent, Student and Institution Viewer. The current demo identity is seeded with all institution roles so each UI persona can be exercised. Role assignments and demo records are in-memory only and are not real authorization.


## Next step — role-based experience matrix (local preview)

- Added a central Role Experience Matrix covering Platform Admin, Institution Admin, Teacher, Parent, Student and Institution Viewer.
- Each persona has a defined workspace navigation preview, scope statement and capability matrix. Scoped access is explicitly distinguished from unrestricted access.
- The matrix is a product/acceptance contract only. It does not hide or secure routes, and persona selection does not change authentication or authorization on other pages.
- The next production-boundary work is to apply the matrix to authenticated route entry, navigation and action controls, then enforce every data operation in the Worker using server-derived institution, branch, assignment and linked-child scopes.
- Added automated contract checks for all six roles, key navigation destinations and privilege boundaries.


## Role-aware navigation and local action preview

- The shared app shell now derives the local RBAC test persona from the legacy admin session marker plus a session-scoped active-role selector. Platform Admin retains the admin workspace; Institution Admin, Teacher and Institution Viewer receive role-specific institutional navigation. Parent and Student personas receive their corresponding learning/family navigation.
- The local Institution Operations preview now persists the selected persona across page navigation and adjusts available sections and controls. Institution Admin can manage institution operations and assign permitted institution roles, but cannot appoint another Institution Admin. Teacher sees a limited read-only teaching view; Institution Viewer is read-only; Parent and Student do not receive institutional operations navigation.
- This is client-side UX/testing only. It is not an authorization boundary: static pages and browser storage can be manipulated. Production enforcement remains in the authenticated Worker/API and must validate every request against server-resolved membership, branch, class, teacher-assignment and parent-child scope.
