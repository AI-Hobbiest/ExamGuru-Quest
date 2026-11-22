# M9 — Provider-neutral data and SaaS readiness

Status: implementation in progress on `m9/provider-neutral-saas-readiness`  
Baseline: `main` at `b975618e547d322405ab2c8cf17e479e75a924be`  
Cloud DB activation: explicitly deferred until after M11.

## Goal

Prepare ExamGuru Quest for institution onboarding and SaaS operation while preserving the existing GitHub Pages/local-first product. M9 defines portable domain contracts and deterministic tests. It does not provision a database, deploy a Worker, activate network sync, collect payments or claim production authentication.

## Existing foundations to reuse

- `institutionId` is the existing tenant boundary. An institution owns branches, classes, memberships, departments and scoped academic records.
- Platform identity and institution membership are separate. HOD remains a department appointment over a Teacher membership, not a global login role.
- `js/domain/repository-contracts.js` and the LMS application service boundary are the provider-neutral seams.
- `js/storage.js` remains the active local learner store and its backup/outbox formats remain compatible.
- Existing institution curriculum and competitive-exam entitlements remain a legacy compatibility source during transition.
- Local IAM, demo records and role previews are not production authentication or authorization.

## M9 work packages

### M9.1 — Tenant and onboarding lifecycle

- Keep `institutionId` as the canonical tenant key; do not introduce a duplicate tenant identity/table.
- Treat a tenant as one institution with its existing branch hierarchy.
- Define a versioned onboarding request and controlled lifecycle: `requested → under_review → approved → provisioned → active`; terminal/recovery states include `rejected`, `suspended` and `cancelled`.
- Tenant IDs and final slugs are assigned by the trusted provisioning boundary, never trusted from an unverified browser request.
- Repeated onboarding commands must be idempotent; retries must not create duplicate institutions or invitations.

### M9.2 — Plan catalogue and subscription lifecycle

- Define provider-neutral plan IDs, versions, status, feature entitlements, quota limits and optional commercial terms.
- Define tenant subscription records with status, plan/version, trial and billing periods, cancellation intent and optimistic record version.
- Keep billing provider identifiers optional references only. Never store payment credentials, API keys or secrets in the browser or these records.
- Do not choose a payment provider, price list, tax model or currency policy in this contract-only slice.
- Model payment collection/webhooks as a future adapter. A local or memory repository must not imply that a paid subscription is live.

### M9.3 — Entitlement resolution

- Calculate effective access from the active plan snapshot plus explicit tenant grants/overrides.
- Expired, revoked or not-yet-effective grants do not apply.
- An explicit deny overrides a plan allow; limits use the most restrictive applicable value.
- Preserve existing `institution-entitlements` data as a legacy input during migration. The explicit mapper emits tenant-scoped `source=migration` grants for each enabled class/exam; it does not infer paid access or rewrite the legacy record.
- Server authorization must re-evaluate entitlements after authenticating the actor and resolving tenant scope. Client-side gating is UX only.

### M9.4 — Repository and service boundaries

- Add optional provider-neutral repositories for plans, subscriptions, entitlement grants and onboarding requests.
- Add deterministic in-memory adapters for tests only.
- Add idempotent initial subscription provisioning against a published plan version; plan changes remain pinned to explicit plan versions.
- Add domain lifecycle/resolution services with no browser, network, payment-provider or database dependency.
- Require idempotency keys for mutating lifecycle commands and expected versions for updates.
- Keep the current local storage adapter and all student attempt/profile/backup contracts unchanged.

## Explicit exclusions

- No Cloudflare D1 provisioning or migrations.
- No Worker/API deployment or changes to `C10_API_BASE`.
- No cloud sync activation or migration of student records.
- No payment gateway, invoices, tax calculations or real payment collection.
- No public tenant self-signup or claim of secure external onboarding.
- No deletion or renaming of existing institution, IAM, demo or entitlement data.

## Acceptance criteria

1. Existing M0–M8 routes, contracts, local learner data and legacy entitlement behaviour remain compatible.
2. JSON schemas validate plan, subscription, onboarding and entitlement-grant records with explicit lifecycle/version fields.
3. Repository contracts remain backward-compatible: existing required Identity, Institution and Academic methods are unchanged; SaaS repositories are optional.
4. Domain tests cover valid/invalid lifecycle transitions, idempotent command replay, optimistic concurrency, trial/period boundaries, expired/revoked grants, deny precedence and restrictive quota resolution.
5. Cross-tenant lookups and writes are rejected by repository/service contract tests; tenant scope comes from trusted context, not a caller-supplied arbitrary ID.
6. The in-memory adapter is clearly labelled test-only; no production/local runtime is switched to it.
7. Full LMS regression and Pages deployment pass before merge. Cloud DB remains deferred until M11 is complete and separately approved.

## Delivery sequence

- M9.1: contract and lifecycle design plus tests.
- M9.2: provider-neutral repositories and deterministic in-memory adapter.
- M9.3: entitlement resolver and compatibility fixtures.
- M9.4: integration/documentation audit and regression gate.
- Review and merge only after the full test suite passes. Do not deploy runtime changes merely because contract tests pass.
