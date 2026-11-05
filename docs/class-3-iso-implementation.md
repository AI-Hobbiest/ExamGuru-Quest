# Class 3 SOF International Science Olympiad (ISO) — implementation tracker

## Scope

Build Class 3 SOF ISO Level 1 as a separate exam experience. SOF renamed the National Science Olympiad (NSO) to International Science Olympiad (ISO) for the 2026–27 session. In student-facing labels, use **Science · SOF (ISO / formerly NSO)** so families can recognise both names.

## Official Level 1 paper pattern (2026–27)

SOF publishes a 35-question, 60-minute paper for Classes 1–4:

| Section | Questions | Marks each | Total |
|---|---:|---:|---:|
| Logical Reasoning | 5 | 1 | 5 |
| Science | 25 | 1 | 25 |
| Achievers Section | 5 | 2 | 10 |
| **Total** | **35** | | **40** |

The blueprint applies SOF's Level 1 current/previous-class rule to the 30 non-Achievers questions: 18 current-class and 12 previous-class. The per-section split (3/2 Logical Reasoning; 15/10 Science) is an ExamGuru allocation for deterministic paper assembly, not a separately published SOF quota. All five Achievers questions are current-class only.

## Official syllabus

- **Logical Reasoning:** Patterns; Analogy and Classification; Alphabet Test; Coding-Decoding; Ranking Test; Grouping of Figures and Figure Matrix; Mirror Images; Geometrical Shapes; Embedded Figures; Possible Combinations; Clock and Calendar.
- **Science:** Plants and Animals; Birds; Food; Housing, Clothing and Occupation; Transport, Communication and Safety Rules; Human Body; Earth and Universe; Matter and Materials; Light, Sound and Force; Our Environment.
- **Achievers:** Higher-order thinking based on the Section 2 science syllabus.

## Content alignment and provenance

- Current-class content should be checked against the NCERT Class 3 *Our Wondrous World — The World Around Us* textbook (12 chapters) and the official SOF syllabus.
- SOF's syllabus includes additional named science areas (for example, birds, human body, Earth and Universe, light, sound and force). These must be explicitly mapped to age-appropriate learning outcomes; do not assume every named SOF topic appears as a standalone NCERT chapter.
- Previous-class questions must be authored and tagged as Class 2-level knowledge. Do not relabel Class 3 items as previous-class content. NCERT's foundational-stage learning outcomes and Grade 2 learning material are the reference for age and prior-learning boundaries; the current Class 3 textbook is not evidence of Class 2 provenance.
- Write original ExamGuru practice questions. Do not copy questions, diagrams, or wording from SOF sample papers or NCERT textbooks. Reuse is allowed only when an existing ExamGuru-owned bank item is traceable and genuinely fits the section and grade.
- Every question must record `section`, `syllabusClass`, `syllabusOrigin`, `syllabusTopic`, `syllabusSource`, a unique ID, four distinct options, one verified answer, explanation and supported difficulty.

## Paper generation target

- 35 questions / 40 marks / 60 minutes.
- 5 Logical Reasoning, 25 Science and 5 Achievers.
- 18 current-class + 12 previous-class questions across non-Achievers; five current-class Achievers.
- Target a bank large enough to produce at least 50 distinct papers with no question repeated in the preceding five papers wherever eligible pools permit.
- Check answer-position and difficulty balance, unique IDs and normalized stems, topic coverage and arithmetic/science correctness.

## Release gates

1. Audit the Class 3 NCERT and Class 2 learning-outcome mapping against every SOF syllabus topic.
2. Complete the bank and provenance/answer-quality checks.
3. Validate 50 generated papers, section quotas, marks and rolling five-paper exclusion.
4. Integrate student exam mode, Admin Question Bank, dashboard, parent history, profile backups and reporting.
5. Pass CI, merge to main, deploy GitHub Pages and verify the published bank and student route.

## Official references

- SOF Class 3 ISO syllabus and pattern: https://sofworld.org/nso/class-3/nso-syllabus/nso-syllabus-class-3
- SOF Class 3 ISO sample paper 2026–27: https://sofworld.org/download/file/fid/73691
- NCERT Class 3 *Our Wondrous World* textbook: https://ncert.nic.in/textbook.php?ceev1=0-12
- NCERT foundational-stage learning outcomes: https://www.ncert.nic.in/pdf/publication/otherpublications/Learning_Outcome_for_the_Foundational_Stage.pdf
