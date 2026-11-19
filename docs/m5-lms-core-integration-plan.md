# M5 — LMS Core Integration & Production Readiness

Status: Approved scope / implementation plan  
Baseline: `main` at `517127cc4e1839de087500463f10ebe571badfa2` (2026-11-19)  
Working branch: `m5/backward-compatible-integration`

## Goal

Integrate the existing ExamGuru experiences behind consistent LMS application boundaries without replacing working student, parent, teacher, admin, curriculum, assessment, reporting or competitive-exam journeys. M5 is an integration and hardening milestone, not a visual redesign or a new feature-generation sprint.

## Non-negotiable safety rules

1. **No regressions by default:** existing routes, query parameters, bank IDs, question IDs, attempt formats, report formats, backup formats and storage keys remain compatible unless a separately reviewed migration explicitly proves compatibility.
2. **Local-first remains active:** browser-local storage is the production data path for this phase. No cloud sync adapter is configured or activated.
3. **No cloud cutover:** do not provision D1, apply Cloudflare migrations, deploy the Worker, configure secrets, migrate live records or change the production API base as part of M5.
4. **No client-side security claims:** local role preview and navigation are UX/test aids only. Production authorization must remain server-authoritative; never treat localStorage/sessionStorage or a client-selected tenant as proof of access.
5. **Preserve historical context:** do not rewrite completed attempts, question-bank versions, student ownership or past academic context during integration.
6. **No destructive cleanup:** do not delete legacy paths, adapters, keys, fields, data files or compatibility redirects merely because a new abstraction exists.
7. **Small reversible slices:** work on this feature branch, one bounded change at a time. Keep commits focused. Do not merge or deploy until the complete regression gates pass and the change is reviewed.
8. **Stop on unexplained failures:** record the baseline result first. A newly failing existing test, changed bank count, missing route, schema mismatch or unverified data transformation blocks the slice.

## Existing baseline to preserve

- Class 3, Class 6 and Class 10 curriculum and practice routes.
- Class 6 SOF NSO/IMO/IEO banks and full-mock blueprints.
- CLAT practice, model papers, actual-paper library and reporting.
- Study Library, Learning Hub, Mistake Book, bookmarks, mastery and adaptive practice.
- Parent/Family Dashboard, assigned tests, answer sheets and feedback.
- Teacher workspace, institution operations, academic structure, departments/HOD and assignments.
- Admin Workspace, Question Bank Editor, Exam Paper Studio, content and reporting tools.
- Existing local profile, attempt ledger, answer records, XP/learning state, import/export and backup compatibility.
- Existing static GitHub Pages portal and all current public routes.

## Baseline evidence

The M5.0 route, contract, persistence, RBAC-truth and CI inventory is recorded in [M5 baseline compatibility audit](./m5-baseline-compatibility-audit.md). The audit explicitly records which repository contracts exist today and which architecture responsibilities are still not implemented as executable interfaces. Runtime integration must follow the call-site mapping described there.

## Work packages

### M5.0 — Baseline inventory and compatibility map

- Record current main SHA, routes, page/script loading order, storage keys, data contracts, bank inventories and workflow gates.
- Map each role's current page/action journeys to the existing implementation; distinguish live local workflows from local RBAC previews and future server-authorized capabilities.
- Identify existing domain/repository contracts and adapters before introducing anything new.
- Capture the current CI status as the comparison baseline. Do not interpret an old failure as an M5 regression.

**Exit:** baseline evidence and a route/data compatibility matrix are documented.

### M5.1 — Shared LMS application boundary

- Reuse and complete existing provider-neutral domain/repository contracts; do not create parallel abstractions.
- Add or consolidate application services only where current pages duplicate business rules or directly depend on persistence details.
- Keep legacy page APIs and data shapes working through thin compatibility adapters.
- Make service dependencies explicit and testable with deterministic in-memory/local adapters.

**Exit:** new or refactored services can be tested without browser storage or Cloudflare, while existing pages continue to use compatible interfaces.

### M5.2 — Unified academic and content access

- Normalize access to the curriculum catalogue, class/section/subject context and shared/institution-owned content using existing IDs and ownership rules.
- Preserve platform-owned source banks; institution customization must copy with provenance, never mutate the shared source.
- Do not infer tenant ownership from free-text school names or local profile fields.
- Keep all current class-specific and competitive-exam bank loading paths operational.

**Exit:** shared content services pass ownership/scope tests and all existing bank inventory/routing checks remain unchanged.

### M5.3 — Unified assessment lifecycle

- Reuse the existing assessment manager, Exam Paper Studio, assigned-test and competitive-exam engines.
- Unify application-level lifecycle operations only where necessary: create, validate, assign, attempt, review, report/export.
- Preserve each engine's blueprint, scoring, timing, randomization, repeat-protection and paper-history rules.
- Keep historical attempts immutable and preserve source bank/version references.

**Exit:** existing assessment and exam-engine tests pass; assignment and learner flows remain compatible.

### M5.4 — Learning records and reporting

- Establish common read models over existing profile, attempt, answer, mistake, bookmark, mastery and progress records.
- Keep student, parent and teacher views scoped to their current local data and relationship/assignment rules.
- Ensure report totals reconcile with the underlying attempt ledger; exports must not silently omit supported banks.
- Preserve backup import/export compatibility and never upload local records automatically.

**Exit:** cross-subject analytics and exports reconcile to source records, and old/new backup fixtures both pass.

### M5.5 — Role-aware experience and policy alignment

- Align the six role experiences (Platform Admin, Institution Admin, HOD/department appointment, Teacher, Parent, Student; Institution Viewer remains read-only) with the approved experience matrix.
- Distinguish global roles, institution memberships, effective-dated appointments and relationship/assignment scopes.
- Keep local preview clearly labelled as a test harness. No preview role grants server privileges.
- Protected production data operations remain unavailable until authenticated Worker routes enforce server-derived scope.

**Exit:** role matrix, navigation and action-policy tests pass, including deny-by-default and cross-tenant negative cases. No claim of live institutional RBAC is made while the API is unconfigured.

### M5.6 — Adapter and migration readiness (cloud deferred)

- Verify the local adapter implements the agreed repository/application contracts.
- Define and test the future Cloudflare adapter contract without activating it.
- Specify stable IDs, idempotency, version/conflict handling, retry/outbox behavior, backup, restore, consent and recovery expectations.
- No live data migration, D1 schema application or production Worker rollout.

**Exit:** local implementation remains the only active adapter; cloud activation can be planned separately with explicit rollout approval.

## Mandatory regression and release gates

Run the repository's existing GitHub Actions checks, including (as applicable):

- Full Pages deployment workflow validation/build checks, without deploying from the feature branch.
- Quiz-quality workflow: Class 3/6/10, SOF, CLAT, assessment, Exam Paper Studio, Stage A integration, Stage C learning, Study Library, backup/restore, Parent experience, RBAC M1–M4, institutional operations and browser smoke tests.
- Node syntax checks for every changed JavaScript file.
- Data contract and bank inventory checks: counts, unique IDs, chapter/topic coverage, blueprint totals, section quotas and question uniqueness.
- Compatibility tests for existing storage keys, legacy records, import/export and historical attempts.
- Positive and negative authorization tests for role, institution, branch, class, subject, teacher assignment and parent-child scopes.

A CI pass is necessary but not sufficient: compare bank inventories and key routes against the M5.0 baseline. Any unexplained count delta, broken route, missing export field or changed student workflow blocks merge.

## Release protocol

1. Implement and test on `m5/backward-compatible-integration`.
2. Keep each work package in focused commits and update this document with evidence.
3. Open a draft PR to `main` for the full GitHub Actions regression suite.
4. Resolve every regression; do not suppress, skip or weaken tests to obtain a green result.
5. Review the diff for accidental data, storage, route, auth or deployment changes.
6. Only after checks pass and the user approves the release, merge to `main`.
7. Confirm Pages deployment and post-deployment smoke checks separately. CI success, merge, deployment and live browser verification are four distinct statuses.

## Explicitly out of scope

- Cloudflare D1 provisioning or migration execution.
- Worker production deployment, OAuth secret configuration or changing `C10_API_BASE`.
- Live student-data migration or automatic local-to-cloud synchronization.
- Replacing the current portal UI wholesale.
- Deleting legacy data, routes, banks, compatibility code or backup formats.
- Claiming production-grade authentication or tenant isolation from client-only previews.

## Completion definition

M5 is complete only when the existing LMS journeys remain operational, the shared application boundaries are in place without parallel/duplicate systems, the local adapter is the sole active persistence path, all mandatory regression and negative authorization tests pass, the compatibility comparison shows no unexplained changes, and cloud activation remains safely deferred.
