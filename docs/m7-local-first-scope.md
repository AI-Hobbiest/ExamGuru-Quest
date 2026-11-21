# M7 — Local-first demo management

## Accepted scope
M7 is complete as an internal, local-first demonstration workspace. It does not provide externally shareable demo accounts or production security.

## Included
- Six persona templates: Institution Admin, Institution Viewer (read-only), Teacher, HOD + Teacher, Parent and Student.
- On-demand role combinations. HOD is an additional Teacher responsibility; Platform Admin is never a demo role.
- Synthetic-only sample records and persona workspace previews.
- Create, extend, reset and revoke lifecycle controls.
- Local audit history for create, extend, reset, revoke and observed expiry.
- Browser-local persistence using localStorage. Preview runs in the same browser profile.
- Legacy external demo login/preview routes now explain that external access is deferred.

## Explicit limitations
- Browser-side session checks and localStorage are not security boundaries.
- Anyone with access to the browser profile or developer tools can inspect or modify local demo data.
- Data is not synced across devices or users; clearing site data removes it.
- Expiry is evaluated when the local management page is opened/refreshed. There is no server process to enforce expiry while the browser is closed.
- Reset/revoke are local workspace actions only; they cannot invalidate an external session.
- Do not use real learner, parent, teacher or institution data.
- Do not share local preview URLs as public demo links.

## Deferred until trusted backend
- External demo accounts and credential issuance.
- Server-enforced authentication, tenant isolation, expiry and revocation.
- Cross-device persistence, audit integrity and authoritative access logs.
- Verified integration tests for IDOR, cross-tenant isolation and privilege escalation.
- Private Platform Manager/plugin integration.

## Architecture
The provider-neutral lifecycle service and persona catalogue remain the domain contract. The browser-local workspace is a development/demo adapter. The optional Cloudflare Worker/D1 files are retained as an un-deployed prototype only; they are not required by the local-first UI and must not be described as deployed or production-ready.

## Acceptance
M7 local-first acceptance is met when the six personas can be created and previewed with synthetic records; on-demand role validation works; create/extend/reset/revoke and audit history work in the same browser; external demo routes clearly state they are unavailable; and lifecycle/domain tests plus repository CI pass. No merge or deployment is implied by this document.
