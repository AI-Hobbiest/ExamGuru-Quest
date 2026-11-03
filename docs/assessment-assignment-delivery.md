# Assessment assignment and delivery workflows

## User roles

- **Parent/Teacher:** selects a child, creates a custom MCQ test or (where an approved blueprint is published) a full examination paper, configures its delivery and due date, assigns it, and reviews the result.
- **Student:** uses independent practice separately from the **Assigned Tests** area. Assigned MCQ tests open in the timed MCQ runner. Assigned full papers open in a paper view with the allowed print and/or online pathways.

## Assessment creation

Custom MCQ assignments are built from the already-published class question banks. The selector can scope by chapter/topic and difficulty, and can preselect the latest study session's topics when the attempt ledger contains chapter attribution. The assignment stores a frozen question snapshot, including competency metadata and answer keys. Later edits to the source bank do not change an existing assignment.

The full-paper builder currently exposes the approved **CBSE Class 10 Science (086), academic year 2026–27** blueprint. It uses the same C10ExamPaperGenerator and integrated paper question bank as Admin Paper Studio, preserving the paper blueprint, section/marks distribution, question selection and repeat-history protection. Other class/subject blueprints can be exposed when they are approved and published.

## Delivery modes

| Mode | Student experience | Evaluation |
|---|---|---|
| Printable | Print / Save as PDF the question paper and a separate handwritten answer booklet | Parent/Teacher records marks and feedback after collecting the written work |
| Online | Student takes the frozen paper in the existing online exam experience | MCQs score automatically; descriptive responses are marked manually |
| Hybrid | Student can print and write or take the paper online | Same evaluation rules as the selected completion path |

The browser print dialog is used to choose a physical printer or **Save as PDF**. The app creates print-ready documents; it does not use a server-side PDF rendering service.

The evaluator copy remains separate from the student question paper and answer booklet. It contains the answer/marking information and should only be accessed by the Parent/Teacher.

## Storage and security boundary

This is a **local-first MVP**. Assignment records, frozen snapshots, attempts and marks are stored in localStorage under the key eg_assessment_assignments_v1. The Parent and Student must use the same browser profile and device to see the same assignments and results.

This is not secure, cross-device enforcement. Browser-local records can be cleared or modified by the device user and do not provide server-side authorisation. Do not use this implementation for high-stakes or institutionally enforced examinations. Cross-device assignment, identity enforcement, audit history and backups require the planned cloud database and server-side policies.

## Deliberately not included yet

- Scanned answer-sheet upload.
- Automatic handwriting recognition or AI marking.
- Cross-device/cloud assignment and result sync.
- Full blueprint-driven paper builders for classes/subjects that do not yet have an approved blueprint.
