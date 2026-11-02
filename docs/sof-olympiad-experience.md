# Stage B — SOF Class 6 Olympiad Examination Experience

## Scope

Stage B provides blueprint-driven Level 1 full mocks for the three Class 6 SOF tracks already in ExamGuru Quest:

- Science — SOF International Science Olympiad (ISO), commonly called NSO.
- Mathematics — SOF International Mathematics Olympiad (IMO).
- English — SOF International English Olympiad (IEO).

The mock mode uses the shared quiz engine and saved-attempt ledger. It does not replace Learn, Test, Retry, Mixed Practice or Timed Exam.

## Official Level 1 paper blueprints

All three Class 6 papers contain 50 questions, run for 60 minutes and total 60 marks. The Achievers Section has five questions worth three marks each.

### ISO / NSO

| Section | Bank tag | Questions | Marks each | Section total |
|---|---|---:|---:|---:|
| Logical Reasoning | `Logical Reasoning` | 10 | 1 | 10 |
| Science | `Science` | 35 | 1 | 35 |
| Achievers Section | `Achievers Section` | 5 | 3 | 15 |
| **Total** | | **50** | | **60** |

Blueprint ID: `sof-iso-class-6-level-1`.

### IMO

| Section | Bank tag | Questions | Marks each | Section total |
|---|---|---:|---:|---:|
| Logical Reasoning | `Logical Reasoning` | 15 | 1 | 15 |
| Mathematical Reasoning | `Mathematical Reasoning` | 20 | 1 | 20 |
| Everyday Mathematics | `Everyday Mathematics` | 10 | 1 | 10 |
| Achievers Section | `Achievers Section` | 5 | 3 | 15 |
| **Total** | | **50** | | **60** |

Blueprint ID: `sof-imo-class-6-level-1`.

The 550-question bank has 50 Logical Reasoning, 300 Mathematical Reasoning, 120 Everyday Mathematics and 80 Achievers questions. Each section pool can therefore supply its paper quota without repeating a question inside a paper.

### IEO

| Section | Bank tag | Questions | Marks each | Section total |
|---|---|---:|---:|---:|
| Word and Structure Knowledge | `Word and Structure Knowledge` | 30 | 1 | 30 |
| Reading | `Reading` | 10 | 1 | 10 |
| Spoken and Written Expression | `Spoken and Written Expression` | 5 | 1 | 5 |
| Achievers Section | `Achievers Section` | 5 | 3 | 15 |
| **Total** | | **50** | | **60** |

Blueprint ID: `sof-ieo-class-6-level-1`.

The IEO bank contains 600 questions across 12 topic sets:

| Section pool | Questions |
|---|---:|
| Word and Structure Knowledge | 446 |
| Reading | 50 |
| Spoken and Written Expression | 54 |
| Achievers Section | 50 |
| **Total** | **600** |

All 500 original IEO questions and their IDs are retained. Existing questions now carry explicit exam-section tags. Four appropriate situation/function questions from the original mixed-practice topic are tagged as Spoken and Written Expression. Two new 50-question topics provide dedicated pools for Spoken and Written Expression and Achievers. These new questions use original scenarios, not copied sample-paper passages.

## Shared student experience

- The full-mock option is visible only when a Class 6 student opens the matching SOF Science, Mathematics or English track.
- The chapter picker and question-count selector are hidden because each paper is fixed by its blueprint.
- The overall timer is fixed at 60 minutes; the question-level timer is disabled.
- Correct answers and explanations remain hidden during the exam.
- Students can navigate to any question, change an answer, skip a question and mark questions for review.
- The question palette shows question status and section-level progress, with direct jump-to-section controls.
- The student can submit early after confirmation. Unanswered questions remain unanswered.
- A paper is assembled randomly within each section, without duplicate question IDs. The builder prefers questions not used in the previous three completed mocks when each section has enough unseen questions.

## Results and reports

The completed attempt retains legacy question-count score fields for dashboard compatibility and adds:

- exam type, title and blueprint ID;
- a snapshot of the section blueprint;
- weighted marks earned and maximum marks;
- mark-based percentage;
- section-wise correct, answered, skipped and unanswered counts;
- marks earned and maximum marks for each section.

The result view and PDF/Excel reports show the overall weighted score and section-wise performance. Correct Achievers answers earn three marks; correct answers in other sections earn one mark. Incorrect, skipped and unanswered questions earn zero marks.

## Official-pattern alignment and syllabus limitations

The blueprint section counts, duration and marking scheme are based on SOF's published Class 6 Level 1 IMO and IEO syllabus pages and official sample-paper/pattern material.

SOF specifies that Level 1 IMO papers for Classes 5–10 contain 60% current-class and 40% previous-class syllabus questions, with Achievers questions from the current class. The current IMO source records do not carry separately verified current-class/previous-class tags. The IMO mock therefore enforces the published section quotas, duration and marks but **does not certify or automatically enforce the 60/40 curriculum split**.

The NSO bank has the same known limitation: question records do not carry an audited current-class/previous-class origin tag. Its mock matches the section, count, duration and mark structure, but it is not certified as syllabus-ratio balanced.

The IEO bank is explicitly tagged by the four published Level 1 exam sections. This implementation does not claim a separate grade-origin compliance audit.

Official references:

- [SOF IMO Class 6 syllabus and Level 1 pattern](https://sofworld.org/imo/class-6/imo-syllabus/imo-syllabus-class-6)
- [SOF IMO Class 6 sample paper 2026–27](https://sofworld.org/download/file/fid/73716)
- [SOF IEO Class 6 syllabus and Level 1 pattern](https://sofworld.org/ieo/class-6/ieo-syllabus/ieo-syllabus-class-6)
- [SOF IEO Class 6 sample-paper page](https://sofworld.org/ieo/class-6/sample-model-test-papers/ieo-sample-papers-class-6)
- [SOF pattern and marking scheme](https://sofworld.org/pattern-questions-and-marking-scheme)

## Persistence and compatibility

Each Olympiad mock uses the existing subject-specific `test-attempt-ledger`. Active attempts remain recoverable in the same browser, and completed attempts continue through the established report/history path. New weighted result fields are additive; the existing `score`, `maxScore` and `correctCount` fields remain question-count based so existing dashboard calculations are not silently reinterpreted.

As with other browser-first student experiences, local attempt history does not automatically synchronize between devices unless the configured student API is active. The recent-mock avoidance window is based on the attempts visible in that student's current ledger.

## Regression coverage

- `tests/olympiad-blueprints.test.js`: all three bank inventories, section quotas, marks, unique questions, recent-paper avoidance, section scoring and insufficient-pool guards.
- `tests/session-model.test.js`: additive weighted result fields without changing legacy score semantics.
- `tests/quiz-engine.test.js`: NSO, IMO and IEO launch flows, fixed timers, 50-question papers, mobile section navigation, weighted Achievers scoring, result rendering and report controls.
- `.github/workflows/pages.yml`: checks deployed bank inventories and the expanded 600-question IEO bank.
- `.github/workflows/quiz-quality.yml`: runs blueprint, session-model and quiz-engine regression tests.
