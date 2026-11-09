# CLAT UG 2027 — Batch 02 Rebuild Contract

**Date:** 9 November 2026  
**Scope:** Replace Papers 006–010 (600 questions)  
**Blueprint:** CLAT-UG27-v1  
**Status:** Rebuild authorised; original files preserved as rejected audit history. Replacement papers remain unpublished until all acceptance gates pass.

## Why a rebuild is required

The first Batch 02 drafts passed structural CI but failed editorial review. The review found templated passage construction, repeated generic reasoning language, repeated explanations, weak/uneven distractors, suspiciously short options, padded quantitative datasets and formatting defects. Passing schema validation is not evidence of CLAT readiness.

## Preservation and file policy

- Do not overwrite or silently repair `data/clat/drafts/clat-ug27-full-006.json` through `010.json`.
- Preserve those files as rejected historical drafts for auditability.
- Author replacements under `data/clat/rebuilds/` using the same paper IDs and question IDs only if the engine requires them; otherwise suffix revision identifiers and update the manifest.
- Do not add replacement papers to `data/clat/model-papers.json` during authoring.
- Keep every replacement marked `draft-unpublished`.

## Mandatory authoring rules

1. Write each passage from a distinct, concrete subject matter and a clear argument or factual narrative. No generic five-paragraph template.
2. Do not reuse stock transitions, stock caveats, generic policy conclusions or the same paragraph architecture across passages.
3. Every passage must contain enough specific information to support its questions; avoid padding and unsupported generalities.
4. Questions must vary in cognitive task and sentence construction. Do not ask the same generic question in different words.
5. Each distractor must be plausible for a reason, but demonstrably wrong from the passage or stated principle. Avoid short throwaway options.
6. Explanations must identify the decisive evidence or reasoning step. No repeated fallback explanations.
7. Current-affairs passages must be fact-checked against primary/high-authority sources; record the exact source metadata and an as-of date. No invented or unverified developments.
8. Legal passages must state a self-contained rule and any relevant limits; questions must apply only that rule unless a real legal proposition is explicitly sourced.
9. Quantitative passages must use meaningful, internally consistent datasets. Recalculate every answer independently; explanations must show the arithmetic, not generic prose.
10. Use clean editorial punctuation, casing and typography. Reject malformed openings, double punctuation, duplicated sentences and unnatural phrase joins.

## Acceptance gates (all required)

- Exact CLAT section split: English 24; Current Affairs & GK 30; Legal Reasoning 30; Logical Reasoning 24; Quantitative Techniques 12.
- 120 questions, 120 minutes, 23 passage/data sets, 4 distinct options and one defensible key per question.
- Each passage/data set meets the existing `AUTHORING_STANDARD.md` word bands and section counts.
- 30 keys per option position; no answer run longer than four; difficulty mix 24 easy / 72 moderate / 24 challenging.
- Current-affairs claims and source metadata independently checked; links resolve and support the claims.
- All 12 QT questions recalculated independently; all calculations and units checked.
- Exact and semantic duplicate review against Papers 001–005 and every replacement in this batch.
- Editorial blind solve: solve without viewing keys, record disputed items, then reconcile each key.
- Distractor audit: all four options must be credible, mutually distinct and answer the same question.
- Explanation audit: each explanation must be specific to its item and show the relevant inference/calculation.
- Automated text-quality checks for repeated n-grams, repeated sentence fingerprints, punctuation anomalies, malformed capitalisation, suspiciously short options and repeated explanations.
- A human editorial sign-off is required; CI success alone cannot approve a paper.

## Topic rotation retained, with fresh treatment

| Paper | Focus |
|---|---|
| 006 | High-seas biodiversity, climate obligations, demographic/statistical methods; procedural fairness and digital evidence |
| 007 | Pandemic governance, public health access, care economy, labour protection and medical allocation |
| 008 | International trade, supply chains, critical resources and economic resilience |
| 009 | Cultural heritage, language, archives, cultural rights and community participation |
| 010 | Technology governance, AI accountability, digital public infrastructure, privacy and scientific research |

## Current-affairs source starting points

These are research starting points, not pre-approved passage text. Re-check the exact claim and date during authoring:
- UN BBNJ Agreement: https://www.un.org/bbnjagreement/en
- ICJ climate advisory opinion: https://www.icj-cij.org/case/187
- Census of India 2027: https://www.censusindia.gov.in/census.website/en
- UN International Law Commission: https://legal.un.org/ilc/
- UN / India economic outlook reporting: https://india.un.org/

## Release decision

The replacements are drafts until all five papers pass the gates above. Student-facing publication remains governed by the series-wide release discipline in `AUTHORING_STANDARD.md`; no paper is to be labelled an official CLAT mock.
