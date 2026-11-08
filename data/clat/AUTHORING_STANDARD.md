# CLAT UG 2027 — Full-Length Paper Authoring Standard

Status: mandatory acceptance contract for the 50-paper series  
Blueprint: CLAT-UG27-v1  
Target: 50 unique full-length papers × 120 questions = 6,000 unique questions

## Official examination contract
- 120 questions, 120 minutes, 120 marks.
- Correct: +1; incorrect: −0.25; unanswered: 0.
- English Language: 24 questions.
- Current Affairs including General Knowledge: 30 questions.
- Legal Reasoning: 30 questions.
- Logical Reasoning: 24 questions.
- Quantitative Techniques: 12 questions.
- These fixed counts are the series' chosen blueprint and sit inside the Consortium's published section ranges.

## Passage and set construction
- English, Current Affairs/GK, Legal Reasoning and Logical Reasoning: original passages targeted at approximately 450 words (acceptance band 380–520 words).
- English: 4–6 passages, 4–6 questions per passage; focus on central idea, inference, tone, vocabulary in context, summary, comparison and argument structure.
- Current Affairs/GK: 5–7 sourced passages, 4–6 questions per passage; passages can draw on significant Indian and international events, institutions, policy, science, economy, environment, arts/culture and historical context. The Consortium does not prescribe a fixed current-affairs look-back window; do not impose an invented cutoff. Prioritise recent and continuing significance, with relevant historical context. Every passage must carry source metadata and an as-of date. Facts, names, dates, offices and figures must be checked against primary or high-authority sources. Do not invent current events.
- Legal Reasoning: 5–7 original passages, 4–6 questions per passage. State the governing principle clearly in the passage. Questions must test inference and application to changed facts, not recall of an unstated law. Any real-law proposition must be sourced and legally checked.
- Logical Reasoning: 4–6 original passages, 4–6 questions per passage. Test assumptions, conclusions, strengthen/weaken, inference, flaws, equivalence, contradiction and argument evaluation.
- Quantitative Techniques: 3–4 self-contained numerical data sets, 3–4 questions per set; 70–320 words per set. Use Class 10-level arithmetic, ratios, percentages, averages, tables/charts, algebra, mensuration and statistical estimation. Every key must be independently recalculated.

## Question-level contract
Every question must have:
- a unique stable questionId and one section/passage association;
- one unambiguous best answer among exactly four plausible options;
- a correctOptionId that maps to exactly one option;
- a clear explanation that teaches why the answer follows and, where useful, why tempting alternatives fail;
- calibrated difficulty (easy, moderate, challenging);
- a competency tag;
- no dependence on facts outside the supplied passage except where a sourced Current Affairs passage explicitly supplies the relevant context.

## Difficulty and paper balance
- Each paper should contain a realistic mix of easy, moderate and challenging items; no section may become a block of trivial recall or arbitrary trick questions.
- Questions should progress naturally within passages but must not disclose later answers.
- Avoid repetitive question templates, option patterns, answer-key patterns and recycled fact scenarios.
- The 50 papers must not reuse passages, question stems, numerical data sets or substantive fact scenarios. Near-duplicate semantic variants do not count as unique.

## Acceptance gates (all mandatory)
1. Exactly 120 questions and 120 minutes.
2. Exact section split 24/30/30/24/12.
3. Passage/set counts and word-count bands above.
4. Four distinct options, one valid key, explanation, difficulty and competency on every question.
5. All current-affairs sources and factual claims traceable; no fabricated or stale current affairs.
6. Independent answer-key review; all quantitative calculations independently recomputed.
7. Automated exact duplicate checks across all 6,000 questions and all passages, plus human semantic-duplication review.
8. Paper-level blind solve / editorial review for ambiguity, unsupported inference, answer leakage and difficulty.
9. Only papers passing every gate may be exposed to students. Drafts and rejected items remain unpublished.

## Release discipline
- Build and audit in batches, but publish the library only when all 50 papers are present and the full-bank uniqueness and integrity checks pass.
- Keep the two existing 25-question diagnostic papers labelled as diagnostics. They do not count towards the 50 full-length papers and do not meet the full-length passage specification.
- No Cloud DB or email changes are part of this work.
