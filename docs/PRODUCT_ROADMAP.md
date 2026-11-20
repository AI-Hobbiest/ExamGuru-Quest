# ExamGuru Quest — Product Roadmap

Last updated: 2026-11-21

## Milestone sequence

| Milestone | Focus | Status / boundary |
|---|---|---|
| M5 | LMS core integration and learning records | Foundation in place; browser-local persistence remains until cloud data migration is approved |
| M6 | Security foundation and provider-neutral API | Draft PR #83; review and dependency reconciliation required |
| M7 | Demo Management | In progress on PR #86; server-side lifecycle and synthetic seed foundation added; production access remains gated on trusted session enforcement and deployment |
| M8–M10 | Reserved productisation milestones | Scope to be confirmed after M7/M11 sequencing |
| M11 | Scoped Student Performance Workspaces | Specification draft PR #84; HOD and Teacher scoped learner visibility, dependent on M3/M6 foundations |
| M12 | Intelligent LMS | Planned; not started |

## M12 — Intelligent LMS

The Intelligent LMS milestone consolidates learning intelligence into a coherent learner experience:

1. **Consolidated Mistake Book** — collect incorrect, skipped and low-confidence responses from eligible completed attempts; deduplicate by question and topic; allow retry and mark-as-mastered.
2. **Personal bookmarks** — bookmark questions, learning cards and study resources; organise and revisit them from one place.
3. **Difficulty-based practice** — practice by Easy, Medium, Hard and Challenge, with Challenge intentionally above Hard.
4. **Topic mastery tracking** — topic-level progress based on attempt evidence, recency and repeated performance; show confidence and evidence rather than a misleading single score.
5. **Adaptive question selection** — choose the next question using mastery gaps, difficulty balance, freshness and anti-repeat history; never starve learners of foundational coverage.
6. **Personalised revision recommendations** — actionable next steps generated from Mistake Book, bookmarks, topic mastery and upcoming assessments.

### M12 design principles

- Reuse the existing M5.4 learning read model and assessment records; do not create a parallel learning-history system.
- Preserve question provenance, subject/class/chapter/topic IDs and difficulty/competency metadata.
- Keep student data local until the separately approved cloud DB/data-sync milestone; make the limitation visible across devices.
- Parent/Teacher/HOD access must follow their authorised student and class/subject scope; Institution Viewer remains read-only and separately scoped.
- Recommendations must be explainable (“why this is recommended”), bounded by syllabus and age/class, and never fabricate curriculum coverage.
- Preserve unique-question selection and recent-session repeat protection.
- Add unit, integration and browser regression tests before enabling adaptive selection by default.

### M12 exit criteria

- All six capabilities operate from one consistent learner model.
- Mistake Book and bookmarks survive normal reloads and supported local backup/restore.
- Mastery calculations are evidence-based, topic-aware and testable.
- Adaptive selection respects difficulty targets, syllabus scope and repeat protection.
- Revision recommendations are traceable to learner evidence.
- Existing practice, exam, report, Parent, Teacher and HOD flows remain regression-clean.
- No cloud DB activation or data migration without explicit approval.

## Governance notes

- M7 remains separate from M11. M11's HOD/Teacher learner visibility must preserve department/class/subject scoping and the maximum-two-HOD appointment rule.
- Cloud DB and student progress synchronisation remain a separate approved stage; M7's D1 metadata migration is limited to isolated demo lifecycle records and synthetic sample records.
- No public demo URL or credentials until demo-user authentication and per-request server-side expiry/revocation checks are implemented and deployed.
