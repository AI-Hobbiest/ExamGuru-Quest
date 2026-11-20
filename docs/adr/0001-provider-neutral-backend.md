# ADR 0001 — Provider-neutral backend and founder-operated delivery

- Status: Accepted for productisation architecture
- Date: 2026-11-20
- Scope: ExamGuru productisation and future SaaS

## Context

ExamGuru currently runs as a GitHub Pages static application. The repository contains an optional Cloudflare Worker/D1 implementation, but the frontend API base is empty and the production portal remains local-first. The product owner wants GitHub to remain the operational centre, no Cloudflare dependency, no paid setup during development, and a simple one-click release experience.

## Decision

1. GitHub is the system of record for source, pull requests, issues, CI, security checks, release metadata and deployment orchestration.
2. Domain and application logic must be provider-neutral.
3. The future backend transport is versioned REST with an OpenAPI contract.
4. The future backend runtime target is Node.js with TypeScript, but this is a target decision, not permission to migrate the existing browser application wholesale.
5. The persistence contract is relational and PostgreSQL-compatible. A concrete provider is selected only after a cost and operational review.
6. Local and in-memory adapters remain available for offline development and deterministic tests.
7. Provider-specific code is confined to infrastructure adapters. No domain module imports a hosting-provider SDK.
8. Docker-compatible packaging and GitHub Actions are the intended portability and deployment automation mechanisms.
9. No paid hosting, database, SaaS integration or Cloudflare resource is provisioned as part of M6.
10. The current GitHub Pages portal remains active until an alternative deployment passes compatibility, security and rollback checks.

## Consequences

- The existing Cloudflare Worker is treated as a legacy optional prototype, not the target runtime.
- Existing provider-neutral contracts and M5 service boundaries should be reused rather than replaced.
- GitHub Pages remains a static frontend and cannot enforce server-side identity, tenant authorization, revocation or demo expiry.
- A real external SaaS pilot will require a trusted backend and persistent store; GitHub alone is not a substitute for a running API.
- Deployment must be scripted so a future host migration is a configuration/adapter change rather than a rewrite.
- No founder-facing manual SQL, JSON editing or shell-based deployment is an accepted normal operating procedure.

## Rejected alternatives

### Continue with Cloudflare-specific application logic
Rejected because it increases provider lock-in and creates an operational setup the owner does not want to maintain.

### Move the whole existing frontend to TypeScript immediately
Rejected because the current application is large, browser-first and has extensive regression coverage. A wholesale migration would create unnecessary risk and founder effort.

### Treat GitHub Pages as a secure backend
Rejected because Pages serves static assets only. It cannot keep server secrets or authoritatively validate a user's identity and permissions.

### Make the existing repository private immediately
Deferred. The repository is currently public and Pages is live. A visibility change could interrupt the current site or require a different GitHub plan. A reviewed source/build separation strategy is required first.

## Operational principle

The owner should operate the SaaS through ExamGuru's Platform Manager and GitHub's one-click release controls. Infrastructure setup, database migrations, backups, deployment and rollback should be automated and documented.
