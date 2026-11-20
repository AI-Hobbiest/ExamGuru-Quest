# M11 — Scoped Student Performance Workspaces

Status: Approved feature scope; implementation branch created
Dependency: HOD department-scoped appointments in PR #82
Persistence baseline: M5.4 learning read model; browser-local records remain the only active persistence path

## Goal

Give Heads of Department and Teachers a useful, student-level view of learning outcomes without widening either role's data scope. HODs need a department performance view; Teachers need a subject-and-class assignment view. This is a read-only analytics capability and must not change student, parent, assessment, or existing institution-admin journeys.

## Role views

### Head of Department

An active HOD appointment grants a department performance workspace for the department(s) on which that teacher membership is currently appointed.

The HOD can:
- View the roster of students enrolled in the department's explicitly configured class scope.
- View department-level and class-level performance summaries.
- Open an individual student profile with subject-wise performance across the subjects taught within the HOD's department scope.
- Compare assigned department subjects and classes, including progress and assessment trends.
- See which department teacher/subject assignment owns a result where that attribution is available.

The HOD cannot:
- See students outside the department's configured class scope.
- See another department's students or results merely because the HOD teaches a cross-department class.
- Manage institution users, branches, enrolments, content or academic setup through this workspace.

HOD analytics scope is derived from the active HOD appointment, department membership and the department's class scope—not from the teacher's broader teaching assignments.

### Teacher

An active Teacher membership can view:
- Only students enrolled in a class for which that teacher has an active assignment.
- Only the subject(s) explicitly assigned to that teacher in that class.
- Subject-specific student performance, attempt history and topic-level strengths/learning gaps where source records support them.
- Class/subject summaries and filtered student lists for those exact assignments.

A teacher's cross-department teaching assignment does not grant HOD access to that department. If a student is enrolled in multiple classes, the teacher sees only the student records attributable to the teacher's own assigned class/subject scope.

### Other roles

- Institution Admin retains institution-wide administration and reporting as currently defined.
- Institution Viewer remains a distinct read-only institution role; M11 does not silently grant or remove its existing overview scope.
- Parent and Student experiences remain unchanged.

## Performance measures

Use the existing M5.4 report/read-model fields and source ledgers; do not invent or infer results. Where supported, show:
- Attempts, submitted and timed-out counts.
- Questions attempted/answered, correct and skipped counts.
- Score and maximum score, with accuracy/rate calculations only when denominators are valid.
- Subject and question-bank coverage, including supported SOF and competitive-exam banks.
- Mistakes, bookmarks and topic mastery/progress when those records exist.
- Recent attempt timeline and change over time when timestamps are present.

Always label missing or unavailable data. Do not interpret no local record as zero performance or as proof that the student has not attempted work.

## Data and identity rules

- Reuse `ExamGuruM5Integration.buildLearningReport` and the existing local learning-record reader where compatible.
- Preserve legacy student IDs, profile IDs, bank IDs, attempt IDs, answer records, timestamps and historical subject context.
- Reconcile report ownership to the active institution student membership and its learner/profile identity before rendering.
- Keep reports read-only. Do not rewrite attempts, progress, mistakes, bookmarks, mastery or backups.
- Avoid duplicate totals when a student has multiple memberships/classes or a report is viewed through multiple assignments.
- Never mix independent-learner tenant records with an institution tenant.

## Local-first limitation and disclosure

M11 does not activate cloud storage or sync. Existing learning records are stored in the learner's browser. A teacher or HOD cannot automatically see attempts held only on a student's separate device/browser.

Therefore:
- Render only records that can be positively matched and are actually available in the current local data source.
- Display a clear data-availability notice and last-updated timestamp.
- Distinguish “No records available in this workspace” from “No attempts recorded”.
- Do not present partial local data as a complete school report.
- Define and test the provider-neutral read contract so a future authenticated backend can supply institution-wide records without changing the UI contract.
- Cross-device/institution-wide aggregation remains dependent on a separately approved backend and consented migration/sync stage.

## Authorization and security boundary

- Derive HOD scope from the active appointment and its department class scope.
- Derive Teacher scope from active teacher membership plus exact active `(classId, subjectId)` assignments and active student enrolments.
- Deny by default for missing, inactive, ambiguous or mismatched memberships, assignments, enrolments or student identity mappings.
- Never accept a client-supplied institution, department, class, subject or student ID as authority.
- Browser-local role checks are prototype UX controls only, not confidentiality or production authorization. Before institutional performance data is shared across users/devices, a server-authoritative API must enforce the same policy.
- No new production API, cloud database, Cloudflare Worker/D1 deployment, secrets, or automatic sync in M11.

## Acceptance tests

1. HOD sees only students enrolled in its department's configured class scope.
2. HOD sees relevant department subjects across all department teacher assignments, but not an HOD's unrelated cross-department teaching classes unless separately in the HOD department's scope.
3. Primary and Backup HOD have equivalent read scope; ending/revoking an appointment removes HOD scope.
4. Teacher sees only exact assigned class/subject students and results.
5. Teacher assigned to two subjects/classes sees both exact assignments, with no other-subject leakage.
6. Teacher cannot access an unassigned subject in the same class or a student outside assigned class enrolment.
7. Multiple classes/assignments do not double-count the same attempt in an aggregate.
8. Legacy attempts without answer-ledger rows retain their recorded counters; answer-ledger totals take precedence where present.
9. Missing local data is shown as unavailable, not zero.
10. SOF, CBSE and CLAT bank records are not silently dropped from the read model.
11. Existing student, parent, HOD, Teacher, Institution Viewer, backup/import/export and assessment regression suites pass unchanged.
12. No existing learner route, login flow, storage key or learning record is changed.

## Delivery sequence

- M11.1: inspect identity-to-profile mapping and source-ledger availability; document known gaps.
- M11.2: implement a pure, testable scope resolver for HOD and Teacher student/subject visibility.
- M11.3: connect the existing M5.4 read model through a local availability-aware adapter.
- M11.4: add HOD Department Performance and Teacher Subject Performance UI, with student drill-down and filters.
- M11.5: add scoped CSV/PDF report exports only after totals reconcile; no new export may broaden scope.
- M11.6: run full LMS regression, role-scope negative tests and browser smoke tests.

## Release gates

M11 is not complete until every acceptance test passes, existing learner experiences remain unchanged, the partial-data warning is visible, and the implementation is reviewed. Keep the PR unmerged and do not deploy until explicitly approved.
