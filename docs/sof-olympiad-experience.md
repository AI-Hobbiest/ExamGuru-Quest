# Stage B — SOF Olympiad Examination Experience

## Scope

Stage B adds a full-paper examination mode for the Class 6 Science SOF bank. It is a blueprint-driven mode on top of the common quiz engine, not a separate exam application. Ordinary Learn, Test, Retry, Mixed Practice and Timed Exam modes remain available.

The current blueprint is `sof-iso-class-6-level-1` and identifies the competition as the SOF International Science Olympiad (ISO), formerly commonly called the National Science Olympiad (NSO).

## Paper blueprint

| Section | Bank field | Questions | Marks each | Section total |
|---|---|---:|---:|---:|
| Logical Reasoning | `Logical Reasoning` | 10 | 1 | 10 |
| Science | `Science` | 35 | 1 | 35 |
| Achievers Section | `Achievers Section` | 5 | 3 | 15 |
| **Total** | | **50** | | **60** |

The full mock has a fixed 60-minute overall timer. Question-level timers are switched off. The paper builder validates that each section pool can satisfy its quota, checks the resulting paper for duplicate question IDs, and attaches the section, section-question number and mark value to each selected question.

The current bank contains 600 questions: 50 Logical Reasoning, 500 Science and 50 Achievers questions. Each mock selects 10, 35 and 5 respectively. Selection is random within each section. The generator prefers questions not used in the previous three completed mocks; if a section does not have enough unseen questions, it fills the remaining quota from the older pool. A question can never appear twice in the same paper.

## Student experience

- The Olympiad mode is shown only for a Class 6 student opening the Science SOF track.
- The chapter picker and question-count selector are hidden because the paper is fixed by the blueprint.
- The fixed timer starts when the paper begins and submits the exam automatically at 60 minutes.
- Correct answers and explanations are hidden during the exam.
- The student can navigate to any question, change a saved answer, skip, and mark questions for review.
- The question palette differentiates answered, skipped, current and marked questions, and shows section labels and section completion counts.
- The student can submit early after confirmation. Unanswered questions are retained as unanswered.

## Result and reports

The completed attempt keeps the legacy question-count score fields for dashboard compatibility and adds:
- exam type, title and blueprint ID;
- a snapshot of the section blueprint;
- weighted marks earned and maximum marks;
- mark-based percentage;
- section-wise correct, answered, skipped and unanswered counts;
- marks earned and maximum marks for each section.

The result view and PDF/Excel reports show both the overall weighted score and section-wise results. Achievers answers earn three marks; correct answers in the other two sections earn one mark. Incorrect, skipped and unanswered questions earn zero marks in this mock.

## Official-pattern alignment and remaining content audit

The SOF Class 6 Level 1 pattern for Classes 5–10 is 50 questions in one hour: 10 Logical Reasoning questions at one mark each, 35 Science questions at one mark each and 5 Achievers questions at three marks each, for 60 marks. The Achievers section is based on higher-order-thinking questions from the Science syllabus.

SOF also specifies 60% current-class and 40% previous-class syllabus coverage for Level 1, and says Achievers questions are from the current-class syllabus. The existing 600 questions carry section tags but do not carry a separately audited current-class/previous-class syllabus tag. Consequently Stage B enforces the published time, section quotas and mark allocation, but **does not yet certify or automatically enforce the 60/40 curriculum split**. That needs a question-level grade-origin tagging and content audit before the paper pool can be described as fully syllabus-balanced.

Official reference pages:
- [SOF ISO Class 6 syllabus and pattern](https://sofworld.org/nso/class-6/nso-syllabus/nso-syllabus-class-6)
- [SOF pattern of questions and marking scheme](https://sofworld.org/pattern-questions-and-marking-scheme)
- [SOF ISO Class 6 sample papers](https://sofworld.org/nso/class-6/sample-model-test-papers/nso-sample-papers-class-6)

## Persistence and compatibility

The mock uses the existing Class 6 Science SOF `test-attempt-ledger`. Active attempts remain recoverable in the same browser, and completed attempts continue through the existing report/history path. New result metadata is additive; the existing `score`, `maxScore` and `correctCount` fields remain question-count based so older dashboard calculations are not silently reinterpreted.

Like the other browser-first student experiences, local attempt history does not automatically synchronize between devices unless the configured student API is active. The recent-mock avoidance window is therefore based on the attempts visible in that student's current ledger.

## Regression coverage

- `tests/olympiad-blueprints.test.js`: real-bank inventory, section quotas, marks, uniqueness, recent-paper avoidance and section scoring.
- `tests/session-model.test.js`: additive weighted result fields without changing legacy score semantics.
- `tests/quiz-engine.test.js`: launch flow, fixed timer, 50-question navigation, section summary chips, autosave ledger shape, weighted result rendering and report controls.
- `.github/workflows/pages.yml` and `.github/workflows/quiz-quality.yml`: run the Olympiad checks; Pages assembles and deploys the new blueprint runtime.
