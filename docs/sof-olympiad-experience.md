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

The 677-question ISO bank retains the 600-question Class 6 inventory and adds 52 Class 5 Science questions plus 25 Class 5 Logical Reasoning questions. Every question now carries `syllabusClass`, `syllabusOrigin` and `syllabusTopic` metadata. Each mock selects 6 current-class and 4 previous-class Logical Reasoning questions, 21 current-class and 14 previous-class Science questions, and five current-class Achievers questions.

### IMO

| Section | Bank tag | Questions | Marks each | Section total |
|---|---|---:|---:|---:|
| Logical Reasoning | `Logical Reasoning` | 15 | 1 | 15 |
| Mathematical Reasoning | `Mathematical Reasoning` | 20 | 1 | 20 |
| Everyday Mathematics | `Everyday Mathematics` | 10 | 1 | 10 |
| Achievers Section | `Achievers Section` | 5 | 3 | 15 |
| **Total** | | **50** | | **60** |

Blueprint ID: `sof-imo-class-6-level-1`.

The 625-question bank has 75 Logical Reasoning, 330 Mathematical Reasoning, 140 Everyday Mathematics and 80 Achievers questions. It retains the 550-question Class 6 inventory and adds 25 Class 5 Logical Reasoning, 30 Class 5 Mathematical Reasoning and 20 Class 5 Everyday Mathematics questions. Every question carries `syllabusClass`, `syllabusOrigin` and `syllabusTopic` metadata. Each mock selects 9 current-class and 6 previous-class Logical Reasoning questions, 12 current-class and 8 previous-class Mathematical Reasoning questions, 6 current-class and 4 previous-class Everyday Mathematics questions, and five current-class Achievers questions.

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

The blueprint section counts, duration and marking scheme are based on SOF's published Class 6 Level 1 ISO, IMO and IEO syllabus pages and official sample-paper/pattern material.

SOF specifies that Level 1 ISO and IMO papers use 60% current-class and 40% previous-class syllabus coverage, and that Achievers questions come from the current-class syllabus. ExamGuru implements this as a 60:40 split across the 45 non-Achievers questions in each paper (27 current-class and 18 previous-class), with the five Achievers questions separately reserved for current-class content. The logical-reasoning section is included in the non-Achievers split. This is an explicit implementation interpretation of SOF's syllabus note; the official page states the overall split and Achievers exception but does not publish per-section grade quotas.

The NSO/ISO bank has 677 questions: 600 current-class questions and 77 Class 5 previous-class supplements. The IMO bank has 625 questions: 550 current-class questions and 75 Class 5 previous-class supplements. Each question is explicitly tagged with its syllabus class, origin and topic. The generator enforces the quotas shown in the blueprint tables above and fails closed if a required origin pool is insufficient. It avoids question IDs from the preceding three completed mocks in each origin pool whenever enough unseen questions remain.

The IEO bank is explicitly tagged by the four published Level 1 exam sections. This implementation does not claim a separate grade-origin compliance audit.

Official references:

- [SOF ISO Class 6 syllabus and Level 1 pattern](https://sofworld.org/nso/class-6/nso-syllabus/nso-syllabus-class-6)
- [SOF ISO Class 5 syllabus](https://sofworld.org/nso/class-5/nso-syllabus/nso-syllabus-class-5)
- [SOF IMO Class 6 syllabus and Level 1 pattern](https://sofworld.org/imo/class-6/imo-syllabus/imo-syllabus-class-6)
- [SOF IMO Class 5 syllabus](https://sofworld.org/imo/class-5/imo-syllabus/imo-syllabus-class-5)
- [SOF ISO Class 6 sample paper 2026–27](https://sofworld.org/download/file/fid/73694)
- [SOF IMO Class 6 sample paper 2026–27](https://sofworld.org/download/file/fid/73716)
- [SOF IEO Class 6 syllabus and Level 1 pattern](https://sofworld.org/ieo/class-6/ieo-syllabus/ieo-syllabus-class-6)
- [SOF IEO Class 6 sample-paper page](https://sofworld.org/ieo/class-6/sample-model-test-papers/ieo-sample-papers-class-6)
- [SOF pattern and marking scheme](https://sofworld.org/pattern-questions-and-marking-scheme)

## Persistence and compatibility

Each Olympiad mock uses the existing subject-specific `test-attempt-ledger`. Active attempts remain recoverable in the same browser, and completed attempts continue through the established report/history path. New weighted result fields are additive; the existing `score`, `maxScore` and `correctCount` fields remain question-count based so existing dashboard calculations are not silently reinterpreted.

As with other browser-first student experiences, local attempt history does not automatically synchronize between devices unless the configured student API is active. The recent-mock avoidance window is based on the attempts visible in that student's current ledger.

## Regression coverage

- `tests/olympiad-blueprints.test.js`: all three bank inventories, syllabus-origin tags and quotas, Class 5/Class 6 split, current-class-only Achievers, four-mock repeat avoidance, section scoring and insufficient-pool guards.
- `tests/session-model.test.js`: additive weighted result fields without changing legacy score semantics.
- `tests/quiz-engine.test.js`: NSO, IMO and IEO launch flows, fixed timers, 50-question papers, mobile section navigation, weighted Achievers scoring, result rendering and report controls.
- `.github/workflows/pages.yml`: checks deployed bank inventories and the expanded 600-question IEO bank.
- `.github/workflows/quiz-quality.yml`: runs blueprint, session-model and quiz-engine regression tests.
