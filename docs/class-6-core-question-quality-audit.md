# Class 6 Core Question-Bank Quality Audit

**Audit date:** 6 November 2026  
**Scope:** Class 6 core English, Mathematics, Science and Social Science MCQ banks  
**Branch:** `fix/class6-core-question-quality`  
**Status:** Open remediation — not approved for release

## Difficulty standard

Difficulty must describe the thinking required, not the wording or the current label:

- **Easy:** recall, recognition or one-step understanding.
- **Medium:** apply one concept, interpret a direct example or explain a straightforward relationship.
- **Hard:** combine ideas, infer from evidence, compare alternatives or solve a multi-step problem in a familiar context.
- **Challenge:** transfer learning to an unfamiliar context, connect multiple concepts, evaluate evidence or solve a genuinely novel multi-step problem.

The requested target is **50% Hard + Challenge**. To prevent chapter-level gaps, the working distribution is **25 Hard, 25 Challenge, 25 Medium and 25 Easy per chapter**. The Hard/Challenge questions must be distinct in cognitive demand; labels alone do not satisfy the gate.

## Baseline inventory

| Subject | Chapters | Total MCQs | Easy | Medium | Hard | Challenge | High-level label share |
|---|---:|---:|---:|---:|---:|---:|---:|
| English | 16 | 1,600 | 785 | 815 | 0 | 0 | 0% |
| Mathematics | 10 | 1,000 | 355 | 325 | 0 | 320 | 32% |
| Science | 12 | 1,200 | 468 | 384 | 0 | 348 | 29% |
| Social Science | 14 | 1,400 | 560 | 420 | 0 | 420 | 30% |
| **Total** | **52** | **5,200** | **2,168** | **1,944** | **0** | **1,088** | **20.9%** |

The percentages above are label counts, not quality-approved difficulty levels. Challenge questions have not yet been certified as genuinely advanced. The current label total therefore overstates the amount of usable high-difficulty practice.

## Confirmed defects

### English

- No Hard or Challenge items.
- 64 repeated cross-chapter prompt-template clusters cover 968 entries after chapter-name substitutions are normalised. This includes recurring generic analysis and grammar question structures.
- Chapter banks have 100 unique literal stems each, but uniqueness by exact text hides repeated templates.
- Several explanations are generic and do not explain why the selected answer is correct in the specific text.
- The next rebuild must create passage-specific comprehension, evidence-based inference, vocabulary-in-context, language application and unseen-passage items. Replacing only the chapter name is not a new question.

### Mathematics

- 80 exact-duplicate stem groups contain 326 surplus repeated copies beyond the first occurrence.
- Fractions has only 45 unique literal stems in 100 items.
- Playing with Constructions and Symmetry each have only 13 unique literal stems in 100 items.
- 106 questions contain suspect distractor tokens such as “Maybe”, “No” or “None of these”; each must be checked in context. These are not automatically all invalid, but they are a strong quality signal.
- Several questions labelled Challenge are simple recall or one-step calculations. For example, a direct 2 × 2 calculation is not Challenge.
- The repeated palindrome question in Number Play had an incorrect keyed answer (142) while its explanation referred to 121. Nine repeated entries have now been replaced with distinct prompts, corrected answer keys and explanations; two use multi-step digit reasoning and two use challenge-level structure/divisibility reasoning.
- Rebuild must use varied numerical contexts, diagrams described in text where helpful, multi-step reasoning and plausible misconception-based distractors.

### Science

- Seven malformed questions in the first chapter used literal placeholder options (“h” and “T”). These seven have been corrected on this remediation branch with observation-based prompts, meaningful choices and explanations.
- The baseline contains 348 Challenge labels but no Hard labels. The label count alone does not establish that the questions are challenging.
- Review must distinguish direct factual recall from interpreting results, planning fair tests, identifying variables, evaluating evidence and applying concepts to unfamiliar situations.

### Social Science

- The bank has 420 Challenge labels and no Hard labels, but the sample audit found Challenge-labelled questions that ask for straightforward fact recognition.
- Several options recycle complete statements from neighbouring questions. Plausible distractors should test misconceptions and should fit the question's category.
- Review must include source/map/data interpretation, chronology, cause and consequence, civic reasoning, comparison and evidence-based judgement.

## Release gates

A subject is not complete until every chapter meets all of these checks:

1. Exactly the agreed difficulty distribution (25 Easy, 25 Medium, 25 Hard, 25 Challenge for a 100-question chapter) or an explicitly approved chapter-specific variation.
2. No exact duplicate stems, no near-duplicate template inflation and no repeated question generated by changing only a number, name or chapter title.
3. Hard and Challenge each meet their separate cognitive definitions. Challenge must be demonstrably harder than Hard.
4. Four distinct, plausible options; one defensible answer; correct answer index; explanation specific to the question.
5. Syllabus and chapter alignment verified; no invented facts, malformed placeholders or misleading distractors.
6. Randomised sample-paper checks, answer-key checks and subject-level regression tests pass.
7. Practice difficulty filters and adaptive selection continue to distinguish all four levels correctly.

## Remediation already applied

- Corrected the seven malformed Science observation questions in `data/class-6-science.json` on this branch.
- No question bank has been relabelled merely to satisfy a percentage.
- No changes have been merged to the release branch. Keep this branch unmerged until all content gates pass.

## Explicit non-goal

This audit concerns Class 6 core practice banks. It does not alter Exam Mode blueprints for other classes. Exam Mode pattern work remains paused pending the school's actual paper patterns.
