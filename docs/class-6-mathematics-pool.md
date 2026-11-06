# Class 6 Mathematics core examination pool

## Source and scope

The source textbook is the user-provided NCERT *Ganita Prakash*, Grade 6, reprint 2026–27. The blueprint covers all ten textbook chapters:

1. Patterns in Mathematics (`patterns-in-mathematics`)
2. Lines and Angles (`lines-and-angles`)
3. Number Play (`number-play`)
4. Data Handling and Presentation (`data-handling-and-presentation`)
5. Prime Time (`prime-time`)
6. Perimeter and Area (`perimeter-and-area`)
7. Fractions (`fractions`)
8. Playing with Constructions (`playing-with-constructions`)
9. Symmetry (`symmetry`)
10. The Other Side of Zero (`the-other-side-of-zero`)

## Baseline inventory audit

The existing practice bank initially contained 1,000 MCQs, 100 per chapter. A mathematical-stem audit found 674 distinct stems and 80 repeated-stem groups. The lowest variety was concentrated in Fractions (45 distinct stems), Playing with Constructions (13), and Symmetry (13). The first expansion adds 43 new, distinct MCQs: 12 to Playing with Constructions, 12 to Symmetry, and 19 to Fractions. The practice bank now contains 1,043 MCQs and 717 distinct mathematical stems. Its 321 `Challenge` questions retain that label in practice but map to `hard` for examination difficulty balancing. Thirty-eight legacy items on mean, median, mode and decimal conversion are tagged `practice-only`: they remain available in learning practice but are excluded from the NCERT textbook-aligned summative exam pool. That leaves 684 unique eligible MCQs plus 340 written-response review candidates for the mixed-format generator. Current unique-stem counts by chapter are: Patterns 99; Lines and Angles 58; Number Play 85; Data Handling 91; Prime Time 79; Perimeter and Area 92; Fractions 64; Constructions 25; Symmetry 25; and The Other Side of Zero 100. The draft mixed-format exam bank now has 340 original written-response candidates: 100 very-short-answer, 100 short-answer, 80 extended-response and 60 case-based items. They remain in `review` status; the 75-paper generation test temporarily simulates approval to validate the generator, but this does not approve the content or enable the student profile. The integrated generation simulation has passed: 75 distinct 38-question papers were generated with the exact 80-mark blueprint, 20+ eligible candidates in every slot, and no question reuse across the preceding five papers. The simulation temporarily treated the 340 review candidates as approved; this validates generator capacity only, not content approval. The existing bank remains the practice source; it is not automatically treated as an approved examination pool.

A previous option audit reported five apparent collisions because its normaliser removed minus signs and superscript/unit distinctions. Those were false positives (for example, −8 versus 8, and cm versus cm²). Future checks must preserve mathematical signs, exponents, and units.

## Draft examination blueprint

- 38 questions, 80 marks, 150 minutes.
- Section A: 20 objective MCQs (20 marks).
- Section B: 5 very-short-answer questions (10 marks).
- Section C: 6 short-answer questions (18 marks).
- Section D: 4 extended-response questions (20 marks).
- Section E: 3 case-based application questions (12 marks).
- All ten chapters are represented in the objective section and distributed across written-response sections.

**Important:** This is an ExamGuru proposed school-practice structure aligned to the supplied NCERT textbook. It is not represented as an official CBSE-prescribed Class 6 paper pattern. It remains a draft until its question pools are reviewed and the user/teacher approves the final school assessment design.

## Release gates

1. Audit the existing 1,000 MCQs for repeated stems, mathematical correctness, answer-key correctness, distractor quality, syllabus fit, and difficulty.
2. Expand thin chapters with original, varied questions, especially Fractions, Playing with Constructions, and Symmetry.
3. Author and review written-response, numerical, diagram-based, and case-based candidates; retain answer keys and mark-wise marking schemes.
4. Require at least 20 approved candidates per blueprint slot.
5. <badge label="Passed in simulation" color="success" /> Generate 75 distinct complete papers; verify all blueprint totals, chapter/unit/competency/difficulty targets, no internal duplicates, and five-paper cross-paper repeat protection. Re-run after independent content approval.
6. Keep the profile disabled until every gate passes. Store one question pool and lightweight local paper fingerprints only; generate papers on demand.

## Storage policy

No pre-generated paper PDFs, duplicate banks, or unnecessary image assets. The current practice MCQ file is about 354 KB and the mixed-format review bank about 431 KB; the blueprint is about 16 KB. The complete Class 6 Maths data footprint is approximately 0.8 MB. Question records are stored once in JSON. Paper history stores IDs and fingerprints only and is profile-specific in the browser. Without the future cloud DB, this history is local to each browser/device and does not coordinate across devices or students.
