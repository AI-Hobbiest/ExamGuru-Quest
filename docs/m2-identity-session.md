# M2 identity and session foundation

Status: implemented on the M2 feature branch; requires review/merge and a separately approved D1 migration before live use.

## Implemented
- `GET /api/v2/auth/me`: returns the authenticated account, active institution memberships, platform grants, institution names and branch scopes.
- `POST /api/v2/auth/context`: selects a membership belonging to the authenticated user and validates the institution and optional branch. The selection is stored on the current server session as a navigation hint.
- `POST /api/v2/invitations`: allow-listed Platform Admin provisions an existing enabled account into an institution with an approved role and optional branch scopes. School Admin invitations may explicitly request `allBranches: true` instead of listing branches.
- `POST /api/v2/invitations/accept`: authenticated, pre-provisioned target account accepts its invitation. Tokens are random, stored only as SHA-256 hashes, expire after seven days, and are consumed once.
- Migration `0004_identity_session_context.sql` adds nullable context fields to `auth_sessions` and a membership invitation table. A DB trigger rejects branch IDs from another institution.
- Existing `/api/auth/*`, Student and Admin routes and the legacy `users.role` check are unchanged.

## Security boundaries
Active context is not an authorization grant. Every future protected tenant operation must independently resolve the authenticated user, active membership, institution, branch, resource ownership and assignment/relationship scope. Never trust a submitted institution ID or session context alone.

M2 invitation creation is deliberately restricted to the existing GitHub-allow-listed Platform Admin. It targets an existing enabled account; it does not create public registrations, verify email addresses, or allow self-selection of privileged roles. Delegated School Admin invitation authority requires a later resource-scoped authorization implementation.

Supported roles are `school_admin`, `teacher`, `parent`, `student`, and `institution_viewer`. HOD is not a global login role; scoped department/HOD appointments belong to M3.

The migration is not applied to production D1 by this code change. Back up D1 and obtain explicit approval before applying it. Static JSON/browser authentication remains prototype-only.

## API contracts
- `GET /api/v2/auth/me`: bearer session required; returns `identity.user`, `identity.platformRoles`, `identity.memberships[]` with branch scopes, and `identity.context`.
- `POST /api/v2/auth/context`: body `{ "institutionId": "...", "membershipId": "...", "branchId": "..." }`; branch may be omitted/null. Membership must belong to the actor and be active in an active institution. Branch must be active and explicitly scoped unless `all_branches=1`.
- `POST /api/v2/invitations`: Platform Admin only; body `{ "institutionId": "...", "targetUserId": "...", "role": "teacher", "branchIds": ["..."] }`. Returns a one-time `acceptanceToken`; M2 has no email delivery channel.
- `POST /api/v2/invitations/accept`: authenticated target account only; body `{ "token": "..." }`. Unknown, expired, consumed, or differently targeted tokens are rejected.

## Verification
The M2 test suite checks the SQLite migration against the existing schema and M0 migration, multi-membership identity, session context columns, invitation constraints, cross-institution branch rejection, API route wiring, hashed tokens, expiry/single-use checks and legacy route preservation. These are not a substitute for live Cloudflare D1/Worker integration tests.

## Next
M3 adds academic departments, department membership, scoped HOD appointments and cross-department teacher assignments. Membership, department membership, teaching assignments and HOD responsibility remain separate concepts.
