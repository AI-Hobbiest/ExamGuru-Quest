# CLAT UG 2027 Question Bank — Production Status

**As of:** 10 November 2026  
**Target:** 50 original full-length papers × 120 questions = 6,000 questions.

## Verified examination contract

- 120 questions, 120 minutes, 120 marks.
- +1 correct, −0.25 incorrect, 0 unanswered.
- Current selected blueprint: English 24; Current Affairs & GK 30; Legal Reasoning 30; Logical Reasoning 24; Quantitative Techniques 12. These counts sit within the Consortium's published section ranges.
- Main reading passages are approximately 450 words; Current Affairs passages are up to 450 words; Quantitative Techniques uses concise data contexts.

## Production dashboard

| Metric | Current result |
|---|---:|
| Full-length papers drafted | 15 |
| Questions drafted | 1,800 |
| Strict automated validation | 15 / 15 |
| Cross-paper unique question stems | 1,800 / 1,800 |
| Unique passages | 344 / 344 |
| Quantitative items independently recalculated | 180 / 180 |
| Practice pilots available to students | 15 |
| Editorially approved official mock papers | 0 |
| Target full-length papers | 50 |
| Target unique questions | 6,000 |

## Batch 01 — Papers 001–005

- Five full-length papers, 120 questions each, 120 minutes each.
- Section split 24 / 30 / 30 / 24 / 12 in every paper.
- Answer-key positions balanced 30 per option per paper.
- Passage counts: 22, 23, 23, 23, 23.
- Paper 005 difficulty recalibrated to 27 easy / 72 moderate / 21 challenging.
- Corrected one duplicated option in Paper 005 Q112, three repeated generic logical-reasoning stems across Papers 002/003/005, and one incorrect Paper 002 CA source URL.
- All 60 QT questions independently recalculated.
- Strict CI and cross-paper integrity passed: [GitHub Actions run 42584191882](https://github.com/AI-Hobbiest/ExamGuru-Quest/actions/runs/42584191882).

**Release status:** Papers 001–005 have been added to the student CLAT practice library as clearly labelled *practice pilots*. They are not represented as formally editorial-approved or certified mock exams.

## Remaining editorial work

A complete independent blind solve of all 1,620 English, Current Affairs, Legal and Logical questions, deeper legal/current-affairs fact adjudication, ambiguity review, distractor-quality review and semantic near-duplicate analysis still need to be completed. Current Affairs coverage in Batch 01 is weighted toward Indian government/PIB releases and factual recall. The next batch must broaden international affairs, global institutions, arts and culture, science and historically significant events and increase passage-based inference/application.

## Batch 02 authoring controls

- Preserve the same full-length CLAT 120-question blueprint.
- Use a wider, balanced current-affairs mix; avoid a PIB-only news diet.
- Reduce direct fact-recall dependence by testing implications, institutions, context and competing arguments.
- Enforce unique stems, unique option texts, answer-key balance and the calibrated difficulty band at generation time.
- Keep QT data sets and calculations independently checkable.


## Batch 02 — Papers 006–010

- Five additional full-length drafts, 120 questions each; 600 new questions.
- Exact section split in each paper: English 24; Current Affairs & GK 30; Legal Reasoning 30; Logical Reasoning 24; Quantitative Techniques 12.
- 23 passages/data sets per paper; CA passages span multiple domains and include dated source metadata.
- Answer-key positions balanced at 30 per option per paper; difficulty mix is 24 easy / 72 moderate / 24 challenging.
- All 60 QT answers were recalculated from the supplied datasets and checked against the answer key and rationale.
- Exact question-stem and passage uniqueness passed against Papers 001–005 and within Papers 006–010.
- Primary-source metadata corrections include the Woman Farmer and Quantum Year resolution dates, India–New Zealand FTA in-force status, India–EU FTA announcement, India–Oman CEPA in-force status and Indigenous participation resolution link.
- Dedicated regression test: `tests/clat-full-length-draft-006-010.test.js`.
- Strict CLAT CI passed on [GitHub Actions run 42617857546](https://github.com/AI-Hobbiest/ExamGuru-Quest/actions/runs/42617857546).

**Release status (10 November 2026):** Papers 006–010 are now available in the student-facing CLAT library as clearly labelled `practice-pilot` papers. Papers 007–010 are loaded from `data/clat/model-papers-batch-02.json`; the source rebuild files remain preserved under `data/clat/rebuilds/`. All five papers remain explicitly unapproved as official mocks. Blind solving, semantic near-duplicate review, distractor-quality review, and full source/fact adjudication remain open. Automated structural success is not editorial approval.

## Next production target

Proceed with Papers 011–015. The 50-paper series is now at **15 / 50 papers (1,800 / 6,000 questions)**, with all fifteen available as practice pilots.


## Batch 03 — Papers 011–015

- Five additional full-length papers, 120 questions each; 600 new questions.
- Section split per paper: English 24; Current Affairs & GK 30; Legal Reasoning 30; Logical Reasoning 24; Quantitative Techniques 12.
- Each paper contains 23 passages/data sets, including six dated Current Affairs passages spanning multiple domains.
- Topic coverage: water and climate adaptation; fiscal federalism and accountability; space governance and research; sports integrity and mega-event legacy; global growth, youth work, digital trade, environment and public health.
- Answer positions: 30 per displayed option per paper; difficulty distribution: 24 easy / 72 moderate / 24 challenging.
- All 60 Quantitative Techniques answers in this batch independently recalculated against the data sets and rationales.
- Cross-paper exact integrity target: 1,800 unique question stems across Papers 001–015 and 344 unique passages; automated regression test added for final verification.

**Release status (10 November 2026):** Papers 011–015 are loaded from `data/clat/model-papers-batch-03.json` as clearly labelled `practice-pilot` papers. They are not approved as official mocks. Blind solving, semantic near-duplicate review, distractor-quality review and comprehensive source/fact adjudication remain pending. Automated validation is not editorial approval.
