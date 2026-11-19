# M5.0 — Baseline inventory and compatibility audit

Baseline branch: `main`  
Baseline commit: `517127cc4e1839de087500463f10ebe571badfa2`  
Audit date: 2026-11-20  
M5 branch: `m5/backward-compatible-integration`

## 1. Release and deployment boundaries

- Production is the GitHub Pages static portal.
- Pages deployment is triggered by pushes to `main`; this M5 branch does not trigger production Pages deployment.
- The M5 pull request is draft PR #75. Its quiz-quality workflow is a pull-request check, not a Pages deployment.
- Cloudflare D1 provisioning, migrations 0003–0006, Worker deployment, OAuth secrets and production API activation remain deferred.
- `js/api-config.js` currently keeps the API base unconfigured. Do not change this during M5 local-first integration.

## 2. Existing learner and administrator entry points

| Entry point | Existing responsibility | Compatibility guard |
|---|---|---|
| `index.html` | Shared sign-in landing | Preserve existing student/parent/admin sign-in flow |
| `dashboard.html` | Learner dashboard and subject launch | Preserve class-specific subject visibility and analytics |
| `practice.html` | Shared CBSE/SOF practice engine | Preserve subject query parameters, question IDs, timer/session behavior |
| `science.html` | Legacy Science URL | Preserve compatibility redirect |
| `profile.html` | Profile, history, JSON backup/restore | Preserve versioned backup and legacy records |
| `parent.html` | Parent/Family Dashboard | Preserve linked-child scope and local-data availability behavior |
| `assigned-test.html`, `assigned-paper.html` | Learner assigned assessment entry | Preserve assigned paper IDs and attempt lifecycle |
| `learning.html`, `study.html` | Learning Hub and Study Library | Preserve mistake/bookmark/mastery and library progress data |
| `admin.html` | Admin Workspace and authoring/report tools | Preserve Question Bank Editor, Family Access and Exam Paper Studio |
| `exam-practice.html`, `pyq-library.html` | Exam practice and previous-year paper library | Preserve paper routes, downloads and history |
| `clat.html`, `clat-login.html`, `clat-dashboard.html` | CLAT learning/exam experience | Preserve CLAT-specific authentication, banks, papers and reports |
| `teacher-workspace.html` | Teacher workspace | Preserve current local preview and page behavior; do not imply server RBAC is live |
| `institution-*.html`, `user-management.html`, `platform-entitlements.html`, `rbac-role-matrix.html` | Institution and RBAC administration surfaces | Treat local preview/demo state as non-production and non-authoritative |

## 3. Current data and content contracts

Versioned contracts in `data/contracts/v1/`:

- `student-profile.schema.json`
- `test-attempt.schema.json`
- `answer-record.schema.json`
- `backup.schema.json`
- `local-store-envelope.schema.json`
- `question-bank.schema.json`, `question-bank-import.schema.json`
- `institution.schema.json`, `branch.schema.json`, `institution-membership.schema.json`
- `department.schema.json`, `department-membership.schema.json`, `department-head-appointment.schema.json`
- `institution-content-import.schema.json`, `institution-entitlements.schema.json`

The content catalogue and practice banks retain class/subject-specific IDs and source files. README inventory at baseline reports:

| Track | Inventory recorded in README |
|---|---:|
| Class 10 Science | 1,400 MCQs |
| Class 10 Mathematics | 1,400 MCQs |
| Class 10 English | 3,700 MCQs |
| Class 10 Social Science | 2,200 MCQs |
| Class 10 Hindi | 254 starter MCQs |
| Class 6 Science / Mathematics / English / Social Science | 1,200 / 1,000 / 1,600 / 1,400 |
| Class 6 SOF NSO / IMO / IEO | 600 / 550 / 600 |

These are documentation-reported inventories, not a fresh recalculation performed by this audit. Existing CI bank-inventory tests remain the authoritative automated check. Do not regenerate, rewrite or renumber any bank as part of M5 integration.

## 4. Persistence and sync boundary

Current learner persistence is browser-local through `js/storage.js`:

- Envelope schema version: `1`.
- Root key prefix: `c10playground:store:v1:`.
- Sync outbox key: `c10playground:sync-outbox:v1`.
- Stores are namespaced by kind and, when available, student ID.
- Legacy unversioned values can be read through an explicit one-way migration path.
- Save operations write locally and enqueue the latest snapshot in the local outbox.
- `configureSyncAdapter` is opt-in; `syncPending` reports local-only status and does not make a network request when no adapter is configured.
- JSON import/export uses the existing versioned envelope and accepts controlled legacy/raw imports.

**M5 invariant:** local storage remains the active and only configured learner persistence adapter. Do not change key names, record IDs, ownership scoping, envelope shape, backup semantics or outbox behavior without explicit compatibility fixtures and a reviewed migration.

## 5. Current domain/repository architecture

Existing code:

- `js/domain/repository-contracts.js` currently defines required asynchronous contracts for Identity, Institution and Academic repositories.
- `js/adapters/memory-repositories.js` implements those three contracts for deterministic test/development use and labels itself `test-only`.
- `js/adapters/static-prototype-repositories.js` implements those three contracts over an injected, read-only snapshot and labels itself `prototype-only-read-only`.
- `js/domain/authorization.js` contains default-deny role/resource policy checks.
- `js/domain/academic-organisation.js` contains department and effective-dated HOD rules.
- `js/storage.js` is the active browser-local learner store and has an optional sync outbox seam.

**Important integration gap:** the architecture document describes QuestionBank, Assessment and Audit repository responsibilities, but the current executable repository-contract module and its two adapters expose only Identity, Institution and Academic. The architecture document also states that the current application does not yet call the M1 repository/authorization modules. Therefore M5 must not assume the full application is already service-oriented. The next implementation slice must map real call sites and add a compatibility seam incrementally; it must not wrap or replace all page scripts in one rewrite.

## 6. RBAC and role experience truth

- The role experience matrix and local role switcher cover Platform Admin, Institution Admin, Teacher, Parent, Student and Institution Viewer. HOD is an effective-dated department appointment, not a global login role.
- Local Platform Admin test mode and local institution demo records are browser-side test conveniences.
- Existing static account JSON and browser role checks are not secure production authentication.
- Institutional RBAC is not live on GitHub Pages while `C10_API_BASE` is blank and the Worker/D1 are not activated.
- Any protected institutional data operation must be denied or remain a local demo preview until authenticated server routes enforce server-derived tenant, branch, class, assignment and parent-child scope.

## 7. CI baseline

Pull request: [#75 — M5 compatibility-first integration](https://github.com/AI-Hobbiest/ExamGuru-Quest/pull/75)  
Baseline workflow run: [quiz-quality run 44608342406](https://github.com/AI-Hobbiest/ExamGuru-Quest/actions/runs/44608342406)

At the time of this audit snapshot:

- Steps 1–27 of the quiz-quality job completed successfully, including assessment syntax, Science paper generation/rendering, learning, PYQ catalogue/extraction, Study Library, backup compatibility, Olympiad blueprints, Class 3/6 bank inventory, session model, RBAC M1–M4, Stage A integration, quiz engine and responsive shell.
- Playwright browser installation and the final three browser checks (five-paper repeat protection, Mathematics Standard/Basic smoke test, Class 10 English smoke test) were still in progress/pending.
- This is a live run snapshot, not a final green baseline. Recheck the run before beginning runtime refactors and record any baseline failure separately from M5 regressions.

## 8. M5 integration sequence derived from the audit

1. Complete and freeze the baseline CI result.
2. Map actual storage and domain-service call sites for profile, practice attempts, banks, assessments, parent/teacher reports and institutional content.
3. Complete provider-neutral repository contracts only where the real data operations and compatibility mappings are understood.
4. Integrate one vertical slice at a time, starting with a read-only path and fixture parity; then consider writes.
5. Preserve all existing UI entry points and legacy formats through adapters until equivalence tests pass.
6. Keep Cloudflare adapter work contract-only until a separate, approved activation milestone.

No application runtime files or student data were changed to produce this inventory.

## M5 runtime integration update — assessment persistence

- `js/assessment-manager.js` now uses `C10Storage.createLocalStore` with the global `assessment-assignments/all` record. An explicit empty student scope keeps assignments shared between Parent/Teacher and Student views.
- The legacy `eg_assessment_assignments_v1` key remains the migration source and the public `C10AssessmentManager.key` compatibility value. The one-way migration removes the old key only after the versioned record is successfully persisted.
- Assignment records, frozen question/paper snapshots, attempts, IDs and the manager's public methods remain unchanged.
- `exam-practice.html` now loads `storage.js` before `assessment-manager.js`. The assigned-test, assigned-paper and dashboard pages already load the storage boundary before the manager.
- `tests/assessment-manager.test.js` now seeds a legacy assignment and verifies migration, record preservation, global cross-session visibility and reload persistence.
- GitHub Actions run 44609277109 passed the syntax and assessment/Paper Studio test step, including the expanded migration test. At the time of this update, final Playwright browser checks were still in progress.
- This is an integration slice only. Local storage remains the active persistence adapter; no Cloudflare adapter, production authorization or deployment has been activated.
