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
