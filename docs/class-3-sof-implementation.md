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
