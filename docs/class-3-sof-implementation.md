# Class 3 SOF Olympiad — implementation tracker

## Scope and sequence

Class 3 SOF work is being introduced as a separate Olympiad experience. Existing Class 3 CBSE question banks remain unchanged until each candidate question passes syllabus, answer, explanation and provenance checks.

Implementation sequence:
1. IMO — Mathematics
2. NSO / ISO — Science
3. IEO — English

## First track: IMO Level 1 (2026–27)

The official Class 3 SOF IMO pattern is 35 questions, 40 marks and 60 minutes:

| Section | Questions | Marks each | Total |
|---|---:|---:|---:|
| Logical Reasoning | 10 | 1 | 10 |
| Mathematical Reasoning | 10 | 1 | 10 |
| Everyday Mathematics | 10 | 1 | 10 |
| Achievers Section | 5 | 2 | 10 |
| **Total** | **35** | | **40** |

Official Class 3 topics include patterns, analogy/classification, alphabet test, coding-decoding, ranking, figure grouping/matrices, mirror images, geometrical shapes, embedded figures, possible combinations, clock/calendar, four-digit number sense, operations, fractions, measurement, temperature, time, money, geometry and data handling.

SOF's published Level 1 note says 60% of questions are from the current class and 40% from the previous class, while Achievers questions are from the current class. The blueprint makes this operational as an explicit quota over the 30 non-Achievers questions: 18 current-class and 12 previous-class, plus five current-class Achievers questions. The per-section split is proportional (6 current + 4 previous in each 10-question non-Achievers section). This per-section split is an ExamGuru implementation choice, not a separately published SOF quota.

### Content policy

- Current class means Class 3 syllabus; previous class means Class 2 syllabus.
- Reuse from `data/class-3-mathematics.json` only after topic-level qualification. A question being CBSE-aligned does not automatically make it IMO-section eligible.
- Do not relabel an existing question's syllabus origin without checking its actual skill and expected grade.
- Write new, original questions for missing topics and for the Class 2 supplement. Do not copy SOF sample-paper questions.
- Tag every approved question with `section`, `syllabusClass`, `syllabusOrigin`, `syllabusTopic` and `syllabusSource`.

### Quality and release gates

- Unique IDs, unique stems and distinct options.
- Exactly one correct answer, independently checked; explanations must teach the reasoning.
- Difficulty distribution and answer-position balance.
- Section inventory sufficient for each official quota.
- Generate at least 50 full papers; no question should recur in the preceding five papers when the eligible unseen pool supports it.
- Test 35 questions / 40 marks / 60 minutes, weighted Achievers scoring, navigation, review, results, dashboard history, Admin Question Bank and reports.
- Merge and deploy only after CI and the live Pages smoke check pass.

## Preliminary audit of the existing Class 3 Mathematics bank

Repository inspection confirms that `data/class-3-mathematics.json` contains 1,400 existing CBSE-aligned questions across 14 Maths Mela chapters, with 100 questions per chapter. Its current regression test checks unique IDs and stems, four distinct options, valid answer indexes, explanations, a 40/40/20 difficulty split, balanced answer positions and selected chapter-concept coverage.

These are useful quality signals, but they are not a full SOF approval. The bank is a candidate source for Class 3 current-syllabus content only. It does not currently provide a dedicated Logical Reasoning pool, and it must be audited for SOF-specific topic fit before reuse.

| Existing chapter | Likely IMO use | Reuse decision |
|---|---|---|
| What's in a Name? | Data handling / reading simple charts | Candidate; inspect every item |
| Toy Joy | Geometry / 3-D shapes | Candidate; inspect every item |
| Double Century | Number sense / place value | Candidate; inspect every item |
| Vacation with My Nani Maa | Operations / everyday word problems | Candidate; inspect every item |
| Fun with Shapes | Geometry | Candidate; inspect every item |
| House of Hundreds - I | Number sense / place value | Candidate; inspect every item |
| Raksha Bandhan | Multiplication / equal groups | Candidate; inspect every item |
| Fair Share | Fractions | Candidate; inspect every item |
| House of Hundreds - II | Number sense / place value | Candidate; inspect every item |
| Fun at Class Party! | Length and measurement | Candidate; inspect every item |
| Filling and Lifting | Capacity | Candidate; inspect every item |
| Give and Take | Operations / money | Candidate; inspect every item |
| Time Goes On | Time and calendar | Candidate; inspect every item |
| The Surajkund Fair | Symmetry / maps / spatial reasoning | Candidate; inspect every item |

The repository currently has no dedicated Class 2 question-bank file. Therefore the previous-class IMO pool must be authored and audited separately; it must not be fabricated by relabelling Class 3 questions as Class 2.

**Audit conclusion:** 1,400 existing questions are available for a controlled current-class reuse audit. No question is yet certified as an SOF IMO question, and no Class 3 SOF bank is released by this foundation PR.

## Status

| Work item | Status |
|---|---|
| Official Class 3 IMO pattern and syllabus captured | Complete |
| Blueprint and current/previous-class quota documented | Complete |
| Existing Class 3 Maths bank suitability audit | Pending |
| Class 2 previous-class question pool | Pending |
| IMO bank generation and independent answer audit | Pending |
| 50-paper uniqueness / repeat-protection validation | Pending |
| Student exam mode and Admin/dashboard integration | Pending |
| CI, merge and deployment | Pending |

## Official references

- [SOF IMO Class 3 syllabus and Level 1 / Level 2 pattern](https://sofworld.org/imo/class-3/imo-syllabus/imo-syllabus-class-3)
- [SOF Class 3 IMO sample paper 2026–27](https://sofworld.org/download/file/fid/73713)
