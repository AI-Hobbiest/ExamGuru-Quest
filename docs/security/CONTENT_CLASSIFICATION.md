# ExamGuru content classification and release boundary

Status: Initial M6 policy  
Date: 2026-11-20

## Purpose

ExamGuru has significant educational content and assessment IP. This policy distinguishes content intentionally published for learners from authoring sources and assessment material that must remain restricted. A file being present in the repository does not automatically mean it is safe to expose in a future public release artifact.

## Classification levels

| Level | Classification | Examples | Delivery rule |
|---|---|---|---|
| C0 | Public product information | Public landing page, product guide, openly licensed sample notes | May be published after content and licence review. |
| C1 | Released learner content | Approved practice questions, public revision cards, released sample papers | May be delivered to the intended audience; record source/licence and release version. |
| C2 | Institution-restricted content | Institution-created tests, private assignments, student reports, answer sheets | Authenticated and institution-scoped API only; never publish in the static site bundle. |
| C3 | Assessment-sensitive content | Unreleased answer keys, upcoming exam papers, teacher-only solutions, restricted blueprints | Strong server-side authorization, least-privilege access, audit and time-bound release. |
| C4 | Master authoring/IP source | Complete question-bank masters, drafts, generation prompts, source notes, unpublished CLAT/current-affairs research and internal review records | Private source storage only; never ship in public Pages artifacts or client bundles. |

## Initial repository inventory

The repository currently contains curriculum and MCQ JSON, Class 3/6/10 banks, SOF content, CLAT papers and drafts, exam-paper blueprints/question banks, revision material and supporting assets under `data/` and `assets/`.

This inventory is a classification starting point, not a completed per-file legal/licensing review. Each content family needs an owner, provenance/source record, licence status, intended audience, release status and sensitivity level before commercial launch.

## Mandatory release rules

1. Do not expose C2, C3 or C4 content in a public static Pages artifact.
2. Public browser content must be assumed downloadable, copyable and inspectable.
3. Minification, obfuscation, disabled right-click and hidden URLs do not protect content.
4. A protected content API returns only the released subset required for the user's current task.
5. Answer keys and marking rubrics are delivered separately and only to an authorized role after the relevant assessment lifecycle permits access.
6. Every institution-owned content record carries immutable tenant ownership and provenance.
7. Shared platform content is copied with provenance for institution customization; the shared source is never mutated by a tenant.
8. Export, print and download operations are separately authorized and auditable.
9. Student-specific exports must not contain another student's records.
10. Subscription entitlements may restrict content packages, but the server—not the browser—decides entitlement.

## M6 implementation sequence

- Build a file inventory and classification manifest.
- Identify which existing banks are deliberately released for public learner practice.
- Separate authoring/master sources from the deployable frontend artifact.
- Define the protected content API and entitlement checks.
- Add tests that assert restricted directories and files are not copied into a public build.
- Do not remove or relocate existing content until current practice, exam-paper and CLAT workflows are proven compatible.
