# M7 — Demo Management

Status: **Implementation in progress; production access gated**
Working branch: `productisation/m7-demo-management-clean`
Draft PR: #86
Dependency: M6 security foundation and provider-neutral API contract
Cloud DB policy: no learner-data migration or sync; the M7 D1 migration is limited to demo metadata, synthetic sample records and append-only demo audit.

## Goal

Allow Platform Admins to demonstrate ExamGuru to prospective institutions and stakeholders without exposing real institutions, real learner records, credentials, restricted content or administrative powers.

Both creation paths are supported:
1. **Pre-created personas:** Institution Admin, Institution Viewer, Teacher, HOD/Teacher, Parent and Student.
2. **On-demand demos:** Platform Admin selects a permitted role combination and a synthetic data profile.

## Approved policy

- Default duration 7 days; allowed choices 1, 3, 7 and 14 days.
- Every demo receives a unique reserved `DEMO-...` tenant identifier.
- Synthetic sample records are provisioned into a demo-specific namespace; no production learner or institution records are copied.
- Platform Admin is never a demo role.
- HOD is an overlay on Teacher; HOD without Teacher is rejected.
- Institution Viewer remains a separate read-only persona.
- Existing HOD appointment policy is preserved: primary/backup model, max two active HODs per department, and cross-department teaching remains valid.
- All management operations require a trusted server-side Platform Admin grant.
- Expiry, reset, extension and revoke rotate the session version. Expired and revoked demos are not treated as active.
- Audit events are append-only and exclude credentials, passwords and session tokens.
- No demo login credentials or public links are issued by the current slice.

## Implemented in PR #86

### M7.0 — Policy and persona catalogue
- Versioned six-persona catalogue with role composition and synthetic sample-data profiles.
- Role validation rejects Platform Admin and requires Teacher whenever HOD is selected.
- Institution Viewer remains its own persona.

### M7.1 — Lifecycle domain service
- Provider-neutral create/list/extend/reset/revoke service.
- Default 7-day duration and strict 1/3/7/14-day choices.
- Server-side expiry status and session-version invalidation contract.
- Authorization callback fails closed; lifecycle events are audited.

### M7.2 — Server-side management API foundation
- Cloudflare Worker routes for create/list/extend/reset/revoke/audit.
- Platform Admin grant is checked server-side for every management request.
- D1 migration creates demo environment metadata, demo sample records and append-only audit tables.
- Expiry is evaluated by the Worker; extend/reset/revoke rotate session versions.
- The API is not yet issuing demo user sessions or integrating demo sessions into the learner application.

### M7.3 — Synthetic sample data
- Initial synthetic baseline records cover institution, branch, classes, subjects, teacher, students, parent and a sample assessment.
- Each generation is isolated by demo ID and reset generation.
- No production data is queried or copied.
- This is a seed baseline, not yet a complete production-shaped dataset for every LMS module.

### M7.4 — Platform Admin interfaces
- Dedicated Platform Admin workspace linked from LMS Administration.
- Supports persona and on-demand creation, duration selection, listing, extend/reset/revoke and audit review.
- Workspace calls the authenticated Worker API; it does not store admin secrets in browser code.
- No user credentials or external demo URL are displayed.

## Remaining hard release gates

1. Implement demo-account provisioning and secure demo login/session issuance.
2. Enforce demo session expiry, revocation and session-version checks on every protected application request.
3. Resolve demo tenant and role exclusively from server-side session state; never trust client-supplied tenant or role.
4. Add an explicit demo route/resource allowlist and deny exports, backups, billing, global security changes, real institution creation/invitations and privileged actions.
5. Expand synthetic data to the approved module coverage and prove zero production identifiers/references.
6. Add cross-tenant, IDOR, privilege-escalation, expiry, revoke, reset, extension and export-denial integration tests.
7. Reconcile against M6 after review, apply migration in a controlled environment, run full LMS regression and complete security review.
8. Only after explicit approval, deploy Worker/API and issue time-limited demo access.

## Acceptance and release boundary

The current branch is an implementation increment, **not a production-ready demo service**. The admin management API and UI are present, but demo-user authentication and per-request application-session enforcement remain incomplete. Do not publish a demo link, create demo credentials, merge or deploy this feature yet.

No current student/parent login, Independent Learner context, school records, learning records, attempt IDs, storage keys or production Pages routes are intentionally changed. Cloud learner-data migration, sync, paid infrastructure activation and production deployment remain deferred pending explicit approval.
