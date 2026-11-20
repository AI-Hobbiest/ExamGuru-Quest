# M6 — Security and productisation baseline audit

Audit date: 2026-11-20  
Audited baseline: `main` at `09c26d2fe4a296949b73980f7b7d75a8a068a2f6`  
Working branch: `productisation/m6-security-foundation`

## Executive assessment

ExamGuru has useful foundations for a future SaaS product: versioned data contracts, provider-neutral repository interfaces, local and in-memory adapters, a sync outbox seam, and documented multi-tenant authorization invariants. However, the current production site is a static GitHub Pages application and the repository is public. The current deployment must therefore be treated as a prototype/local-first learning portal, not a secure multi-tenant SaaS service.

No production identity, server-authoritative tenant authorization, protected question-bank delivery, or centrally enforced demo expiry is active in the current GitHub Pages deployment.

## Confirmed current-state findings

| Area | Evidence | Assessment |
|---|---|---|
| Repository visibility | GitHub repository metadata reports `private: false`; default branch is `main`. | Source, history and committed content are publicly readable. |
| Hosting | Repository has GitHub Pages enabled; README identifies the Pages portal as the live site. | Browser-delivered code and assets are inspectable by design. |
| Account files | `data/student-accounts.json` and `data/family-access.json` are in the published repository tree. | Account metadata and salted password hashes are public. Hashes are not plaintext passwords, but client-side verification is not a production authentication boundary. |
| Static authentication | `js/student-auth.js` fetches published JSON, derives PBKDF2 hashes in the browser and stores a browser session. | Suitable only for a controlled prototype; browser code and session state can be inspected or altered. |
| Local IAM | `js/iam-local-store.js` stores users, roles, institutions and entitlements in browser localStorage. | Useful for local workflows and tests, not trusted identity or authorization. |
| API configuration | `js/api-config.js` sets `window.C10_API_BASE = ""`. | Optional remote API is not configured in the current frontend. |
| Optional backend | `cloudflare/worker.js`, SQL schema and migrations exist. | Provider-specific implementation exists in the repository, but the current frontend is not configured to use it. M6 must not require Cloudflare or activate this implementation. |
| RBAC | `js/page-access.js`, navigation and local role state are client-side. | UI gating is not server-side authorization. |
| Tenant model | `docs/rbac-architecture-v1.md` defines membership, tenant ownership, scope and provider-neutrality. | Good target invariants; they are not proof of production enforcement in the static app. |
| Content | Curriculum, MCQ banks, CLAT papers, blueprints and visual assets are committed under `data/` and `assets/`. | Published static files can be downloaded. Obfuscation cannot protect content delivered to a browser. |
| Build and CI | GitHub Actions already deploy Pages and run multiple content/regression workflows. | Existing automation can host additional security checks without introducing another service. |
| Dependency manifest | No root `package.json` was found in the audited main tree. | Avoid introducing a package/toolchain migration merely to start M6. |

## Risk register

### Critical — public source and content exposure
The public repository exposes source, history, content JSON and static assets. Do not assume minification or obfuscation changes this security boundary.

**M6 action:** add automated secret scanning and code analysis; document a future source/build separation decision. Do not change repository visibility or Pages configuration in this change because doing so may interrupt the live site or require a paid GitHub plan.

### Critical — client-side identity and authorization
Static account verification and local role state can be inspected and modified by a user controlling their browser.

**M6 action:** explicitly label local authentication/RBAC as prototype-only. Define server-side API contracts and negative authorization tests before any external institution pilot. Do not market local roles as secure SaaS permissions.

### High — public question-bank delivery
Question banks and exam assets committed to the Pages tree are publicly retrievable.

**M6 action:** inventory public content and classify platform-owned master banks, released practice content, answer keys and sensitive assessment blueprints. Future protected delivery must be API-backed and must not expose master sources in the public Pages artifact.

### High — demo expiry and account revocation
A browser-only expiry value can be changed or bypassed.

**M6 action:** demo sessions must be checked by a trusted server at each protected request. Until that exists, generated demos are internal/test-only and must not be described as secure external demos.

### High — tenant isolation
A client-selected institution, branch or department is untrusted.

**M6 action:** preserve the RBAC architecture rule that every protected read, write and export resolves the authenticated actor and validates resource ownership and assignment scope on the server.

### Medium — release and supply-chain assurance
Existing CI focuses heavily on content and functional regression; automated security analysis should be consistently attached to pull requests and main.

**M6 action:** add CodeQL, secret scanning and automated GitHub Actions dependency update proposals.

## Architecture decisions for M6

1. GitHub remains the source-control, review, CI and release-automation centre.
2. No Cloudflare account, Worker, D1 database, paid hosting, paid scanner or paid build service is required for M6's repository-side work.
3. The application domain remains provider-neutral. Business logic depends on interfaces, not a hosting vendor, database SDK, GitHub Pages path or localStorage.
4. GitHub Pages remains the current public prototype until a separately reviewed deployment strategy exists.
5. Never place credentials, signing keys, API tokens or privileged repository write tokens in frontend code or published JSON.
6. Do not commit production user records, real demo credentials, secrets or private institution data.
7. Existing local-first student, parent, teacher and institution journeys must remain backward compatible while the secure backend is designed.
8. A future SaaS pilot requires a trusted backend and persistent server-side identity/authorization. GitHub Pages alone cannot provide that boundary.

## Immediate limitations and owner decisions

- The repository is currently public. Making it private is not performed automatically because the current Pages deployment and plan eligibility must be considered first.
- A public Pages build can never conceal its delivered JavaScript, data or assets. Strong content protection requires withholding sensitive source content from the public artifact and serving it only after server authorization.
- A production backend will eventually need a hosting provider and may incur cost. No provider is selected or provisioned in M6.
- Security workflow findings must be triaged. Historical secrets, if any are found, must be revoked/rotated; deleting a file from the latest commit does not invalidate a leaked credential.

## Exit criteria

- [ ] CodeQL and secret scanning run on pull requests and the default branch.
- [ ] GitHub Actions dependencies have an automated update policy.
- [ ] Security policy and threat model are version controlled.
- [ ] Public/static authentication and local RBAC are explicitly documented as prototype-only.
- [ ] Sensitive content inventory and future delivery boundary are documented.
- [ ] No Cloudflare-specific setup is required for M6.
- [ ] Existing Pages and LMS regression workflows remain unchanged and passing.
- [ ] No production deployment or destructive repository visibility change is made without a separate release decision.
