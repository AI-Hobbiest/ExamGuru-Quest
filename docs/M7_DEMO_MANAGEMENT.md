# M7 — Demo Management

Status: **Local-first demo data and role-preview workflow implemented; shared demo credentials and server-enforced isolation remain deferred**
Current implementation: `feat/platform-demo-environment-wizard`
Architecture: GitHub Pages + browser-local preview; no Cloudflare or database activation required for this demo workflow.


## Institution demo wizard and sample-data factory

The Platform Admin first-login wizard now offers a complete sample institution when no real institution has been configured in the current browser. It creates:

- Institution Admin, HOD/Teacher, Teacher, Institution Viewer, Parent and two Student sample accounts.
- Two classes (Class 6 and Class 10), five subjects, a campus, two departments, teacher assignments, student enrolments and guardian links for both demo learners.
- Published sample institution content and completed student practice activity across both classes.
- Role-specific previews exposed through the existing workspace switcher, including Parent and Student views.

Platform Admin can create this workspace without a separate demo-account confirmation. The Platform Admin Demo Management module can also opt into the complete sample-data pack; this path requires confirmation that the generated profiles follow the normal username, institution, branch and student class-assignment rules. The factory uses the existing account and institution services rather than bypassing their validation.

All generated records are isolated under a newly created demo institution and generated student scopes. Platform Admin sign-out removes only those demo-owned records and sample activity. Exiting an individual role preview returns to Platform Admin without deleting the shared demo workspace. Reset rebuilds the sample workspace; revoke and expiry remove its generated institution data.

**Important:** these are browser-local role previews, not independently authenticated or shareable accounts. They are suitable for a guided presentation from the Platform Admin session, not for issuing external credentials or claiming server-enforced tenant security. Existing institution data, question banks and learner progress are not part of the cleanup scope.

## Goal

Provide repeatable, time-limited demonstrations without exposing real institutions, real learner records, production credentials or privileged administrative powers.

## Creation paths

- Six pre-created personas: Institution Admin, Institution Viewer, Teacher, HOD + Teacher, Parent and Student.
- On-demand role combinations using an approved synthetic sample profile.
- Default duration: 7 days. Allowed durations: 1, 3, 7 and 14 days.
- Every demo has a unique isolated `DEMO-TENANT-...` namespace.
- HOD is an overlay on Teacher; HOD without Teacher is rejected.
- Platform Admin cannot be assigned to a demo. Institution Viewer remains a separate read-only role.

## Implemented capabilities

### Platform Admin management
- Dedicated management workspace linked from LMS Administration.
- Create persona or on-demand demo.
- List demos and inspect lifecycle audit.
- Extend, reset synthetic data, or revoke a demo.
- One-time credentials are returned only to the authenticated Platform Admin on creation and displayed in the management page for copying. The password is not persisted in plaintext or included in audit events.

### Demo account security
- Separate `demo_accounts` and `demo_sessions` tables; demo users are not inserted into production `users` or `auth_sessions`.
- Random demo username and high-entropy temporary password.
- Password stored as salted PBKDF2-HMAC-SHA256 hash (210,000 iterations).
- Demo bearer tokens are random and only their SHA-256 hashes are stored.
- Demo sign-in is limited by per-username failed-attempt lockout.
- Demo session lifetime is at most eight hours and never exceeds the demo environment expiry.
- Every request carrying a recognised demo session is intercepted before normal application authentication. Only `/api/demo/me`, `/api/demo/data` and `/api/demo/logout` are allowed; other application/API paths are denied.
- Session is invalidated by expiry, revoke, reset or version mismatch. Logout revokes the session.
- Demo preview is read-only and reads only the current generation of synthetic records for that demo ID.

### Synthetic data and audit
- Synthetic baseline includes institution, branch, classes, subjects, teacher, learners, parent link and sample assessment.
- Data records are namespaced by demo ID and reset generation.
- Demo lifecycle events (create, extend, reset, revoke) are append-only.
- Credentials, password hashes and session tokens are not written to audit details.

### Server-side management
- All management endpoints require an active Platform Admin grant checked by the Worker.
- D1 schema includes demo metadata, synthetic records, account hashes, demo sessions, login lockout and append-only audit.
- Expiry and session-version checks are performed server-side, not with browser timers.

### Second Platform Manager interface

The agreed second interface is a **private ChatGPT Platform Manager plugin**, alongside the in-product Platform Admin workspace. It must call the same secured demo-management API and enforce the same Platform Admin permissions. The REST endpoints are now available in the Worker source, but the plugin has not been created or connected: the Worker is not deployed and there is no verified, reachable MCP transport/authentication endpoint yet. Do not package a plugin against a guessed URL or an unverified authentication scheme. This remains an explicit M7 completion item.

## Production release gates

The implementation is in the draft PR, but it is **not yet live**. Before production activation:
1. Review and merge the M6 security foundation and reconcile the M7 base/head.
2. Apply the additive M7 D1 migration to the intended Cloudflare environment.
3. Set the Worker API URL in the public frontend configuration; keep OAuth secrets and all other secrets in Cloudflare Worker secrets, never in GitHub Pages or repository files.
4. Deploy the Worker and verify Platform Admin grant bootstrap, CORS allowlist and D1 bindings.
5. Run live integration tests for account creation/login, expiry, reset, extension, revoke, cross-demo isolation, normal API denial, lockout and audit.
6. Build and connect the private ChatGPT Platform Manager plugin to the verified secured API transport; test that it uses the same Platform Admin grant and permissions.
7. Verify no demo session can access production student, parent, institution, export, report, billing or platform-admin APIs.
8. Only then enable external distribution of time-limited demo credentials.

No Cloud learner-data migration or sync is part of M7. No existing production student/parent login, Independent Learner context, school data, attempt records or storage keys are intentionally changed.

## Existing public-repository credential exposure — release blocker

The current public repository still contains the legacy student and family account JSON files used by the local-first login flow. They expose account identifiers/usernames and salted password hashes to anyone who can read the repository. The hashes are not plaintext passwords, but they permit offline password guessing; the browser-side verification can also be bypassed. Secret scanning does not classify these application credential records as conventional leaked API secrets.

Therefore, **the overall LMS authentication/source-data posture is not production-secure yet**, even though the new M7 demo credentials use server-side hashes and the latest secret scan passed. Before a production security claim: migrate legacy student/parent authentication to the server-side account service, remove the public JSON account files from the served application, rotate affected passwords, and assess repository history for purge/credential-reset requirements. This remediation must preserve current learner progress and account continuity; do not simply delete the files before the server-side replacement is deployed.

## Security boundary

The GitHub repository and GitHub Pages frontend are public. Source code is therefore visible and must not contain secrets. M7 protects server-side data and actions through Worker authorization, hashed credentials/tokens, isolated demo sessions and a strict read-only endpoint allowlist. Repository visibility is not a security boundary. Production secrets must remain in Cloudflare secret bindings; public source must be assumed inspectable.
