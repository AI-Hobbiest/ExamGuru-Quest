# CLAT UG 2027 — Batch 02 Worklog

**Updated:** 9 November 2026  
**Batch:** Papers 006–015  
**Completed in this work session:** Papers 006–010  
**Blueprint:** CLAT-UG27-v1

## Output committed

Five full-length draft JSONs are present:

- `data/clat/drafts/clat-ug27-full-006.json`
- `data/clat/drafts/clat-ug27-full-007.json`
- `data/clat/drafts/clat-ug27-full-008.json`
- `data/clat/drafts/clat-ug27-full-009.json`
- `data/clat/drafts/clat-ug27-full-010.json`

Each contains 120 questions and 23 passages/data sets. Each is marked `draft-unpublished`; none has been added to the student-facing model paper library.

## Coverage rotation

| Paper | Main content emphasis |
|---|---|
| 006 | High-seas biodiversity, climate obligations, GDP/census measurement, digital records and procedural fairness |
| 007 | Pandemic governance, health access, care economy, labour protection and medical allocation |
| 008 | Trade outlooks, FTAs, supply-chain resilience, industrial policy and trade infrastructure |
| 009 | Intangible and tangible heritage, cultural rights, language, archives and consultation |
| 010 | AI governance, automated decisions, privacy, digital public infrastructure, quantum science and satellite navigation |

## Automated acceptance evidence

- Strict blueprint in each paper: 24 English / 30 CA-GK / 30 Legal / 24 Logical / 12 QT.
- 120 questions, 120 minutes and 23 passage/data sets per paper.
- 30 correct keys at each of o1/o2/o3/o4 per paper; no answer-key run exceeds four.
- Difficulty mix per paper: 24 easy / 72 moderate / 24 challenging.
- Passage/data-set word limits satisfied.
- Each CA passage has an as-of date, domain and source metadata fields with HTTPS URL.
- Exact question-stem and passage-text uniqueness passed against Papers 001–005 and within Papers 006–010.
- 60 QT items in this batch independently recalculated from their data sets; keyed answers match their rationales.
- Dedicated test: `tests/clat-full-length-draft-006-010.test.js`.
- CI: [CLAT validation run 42617857546](https://github.com/AI-Hobbiest/ExamGuru-Quest/actions/runs/42617857546) — success.

The five paper files were committed in an atomic batch commit. Subsequent source-metadata corrections were committed individually and the final CI run passed on the latest content SHA.

## Source corrections made

- Paper 007: corrected the adoption date for UN General Assembly resolution A/RES/78/279 (International Year of the Woman Farmer) to 2 May 2024.
- Paper 008: replaced the outdated India–EU FTA summary PDF link with a direct PIB release; updated India–New Zealand FTA metadata to an official New Zealand MFAT page confirming entry into force on 20 October 2026; updated the India–Oman CEPA passage to reflect entry into force on 1 June 2026 and a direct PIB source.
- Paper 009: replaced the Indigenous participation resolution link with the United Nations Mandate Registry record for A/RES/80/303.
- Paper 010: corrected the adoption date and source for the International Year of Quantum Science and Technology resolution A/RES/78/287 to 7 June 2024.

## Open editorial gates

The current automated checks are structural and exact-duplicate checks. They do not establish that every question is a good CLAT question. Before student release or official-mock claims, complete:

1. Blind solving of all English, Current Affairs, Legal and Logical questions.
2. Review that each question actually tests the stated passage, not merely a repeated generic interpretation pattern.
3. Independent distractor plausibility and one-best-answer review.
4. Legal rule accuracy, exception accuracy and jurisdiction-neutral framing.
5. Current-affairs claim/source/date verification beyond metadata shape and selected source corrections.
6. Semantic near-duplicate review against Papers 001–005 and within this batch.
7. Re-run all CI and QT checks after editorial changes.

## Series progress after Batch 02 draft creation

- Full-length drafts: 10 / 50.
- Unique questions drafted: 1,200 / 6,000.
- Student-facing practice pilots: still 5 (Papers 001–005).
- Official/editorially approved mocks: 0.
- Next authoring target: Papers 011–015.
