# M6 — Security foundation and portable product architecture

Status: In progress  
Working branch: `productisation/m6-security-foundation`  
Baseline: `main` at `09c26d2fe4a296949b73980f7b7d75a8a068a2f6`

## Founder-effort and cost constraints

- No Cloudflare dependency.
- No paid infrastructure, paid security scanner or new account setup for M6 repository work.
- Keep GitHub as the source, review, CI and release control centre.
- Automate checks through GitHub Actions.
- Do not require the founder to run local build commands or edit production JSON.
- Any future hosting/database cost requires a separate decision and approval.
- Keep the current Pages experience running until a replacement has passed regression and release checks.

## M6 work packages

### M6.0 — Baseline audit and security automation
- Record repository visibility, Pages deployment, account/data exposure, API configuration and existing provider-specific code.
- Add CodeQL static analysis for JavaScript/TypeScript.
- Add repository secret scanning.
- Add Dependabot updates for GitHub Actions.
- Add a security policy and threat-model register.

**Exit:** security checks are attached to pull requests and main; findings are triaged.

### M6.1 — Source and release protection
- Decide a safe source/build separation that does not break the current free Pages deployment.
- Keep development source and release artifacts distinct where practical.
- Ensure production build output does not include source maps or development-only tooling.
- Define a release manifest, version identifier and rollback evidence.
- Verify no tokens or repository write credentials are present in browser assets.

**Constraint:** minification/obfuscation is deterrence only; it is not a confidentiality boundary.

### M6.2 — Content protection design
- Inventory all public banks, answer keys, exam blueprints, CLAT material, curriculum and visual assets.
- Classify content as public practice content, institution-restricted content or master authoring source.
- Define an API delivery contract for protected content.
- Keep master authoring sources out of public build output before claiming content protection.

**Constraint:** no new paid backend is provisioned in this work package.

### M6.3 — Provider-neutral security contracts
- Define transport-independent authentication, session, authorization and audit interfaces.
- Reuse existing domain/repository contracts where they fit; do not introduce duplicate abstractions.
- Specify tenant, branch, department, class, assignment and relationship checks.
- Add contract tests for deny-by-default behavior and cross-tenant isolation.
- Keep provider-specific adapters isolated from domain/application code.

### M6.4 — Local prototype safety
- Label local account management and role preview as prototype-only.
- Ensure demo/test accounts are clearly separated from real user records.
- Do not expose real account credentials in JSON or source control.
- Preserve current local-first workflows and backup formats.

### M6.5 — Security regression and release gates
- Run secret scanning and CodeQL.
- Test unauthorized direct API access, role escalation, tenant boundary violations, expired/revoked sessions and protected content requests when server endpoints exist.
- Run existing LMS/content/Pages regression suites.
- Block production deployment on critical security findings or failed regression tests.

## Target architecture

- **Domain:** provider-neutral TypeScript modules and contracts.
- **Application:** use cases for identity, institutions, memberships, content access, demo lifecycle and audit.
- **Transport:** versioned REST API with OpenAPI contract.
- **Persistence:** repository interfaces; PostgreSQL-compatible schema/migrations designed independently of a vendor.
- **Adapters:** local/in-memory adapters for tests and development; a future hosted database adapter selected only after cost approval.
- **Operations:** GitHub Actions for checks and one-click release orchestration.

The current Cloudflare Worker implementation is treated as an optional legacy prototype, not the target architecture. M6 must not require Cloudflare bindings, D1, Wrangler, Cloudflare secrets or manual Cloudflare dashboard steps.

## Out of scope for M6

- Full Cloud DB migration or live student data migration.
- Public self-registration.
- External secure demo access before server-side expiry is available.
- Subscription billing or payment integration.
- Production hosting procurement.
- Automatic change of repository visibility or Pages hosting plan.
- Rewriting the current LMS frontend or content banks.

## Delivery sequence

1. Complete M6.0 audit and automated repository security checks.
2. Review and triage scanner results.
3. Establish the provider-neutral backend/API contracts and security tests.
4. Design the public/private source and content delivery split without breaking Pages.
5. Implement release hardening and regression gates.
6. Publish an M6 readiness report; do not declare SaaS security complete until trusted server-side controls are deployed and verified.
