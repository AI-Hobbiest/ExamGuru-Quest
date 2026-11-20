# Independent Learner tenant — compatibility and migration plan

Status: M6 compatibility requirement  
Date: 2026-11-20  
Canonical tenant ID: `INST-DIRECT-001`  
Tenant type: `direct`

## Decision

All existing self-serve learners and their parent/guardian accounts belong logically to one first-class **Independent Learner** tenant for the current local-first phase. This is the same stable tenant identity already reserved by the local IAM store as `INST-DIRECT-001`; it is not a new tenant created per student.

Independent Learner is a virtual/direct tenant, not a school. It has no school branches, school sections, HODs or institution-admin hierarchy. Its users retain the current learner and parent experiences.

## Non-negotiable compatibility rules

1. Existing student and parent login flows remain unchanged.
2. Do not force account re-registration, password resets, invitations or a new login screen.
3. Do not rewrite, delete or regenerate `data/student-accounts.json` or `data/family-access.json`.
4. Do not change stable student IDs, parent IDs, profile IDs, attempt IDs, answer IDs, local-storage keys, backup envelopes or outbox records.
5. Do not rewrite the free-text school field in learner profiles to "Independent Learner"; it is profile information, not a trusted tenant relationship.
6. Do not move or clear localStorage/sessionStorage. Existing attempts, answers, reports, XP, bookmarks and learning history must continue to load.
7. Parent-to-child links remain exactly as maintained in the existing family access source; links are projected only when both endpoints are active.
8. New school/institution flows must be additive and must not make an Independent Learner dependent on a school branch, class section, HOD or school admin.
9. Existing CLAT users remain supported alongside Class 3, 6 and 10 learners.
10. Tenant membership is a product context, not an instruction to change the user's current navigation or UX.

## Non-destructive bridge

`js/domain/legacy-independent-learner-adapter.js` provides a read-only projection from the current static account formats into the provider-neutral tenant model.

- Uses the existing canonical tenant ID `INST-DIRECT-001`.
- Maps each active legacy student to a Student membership.
- Maps each active legacy parent to a Parent membership.
- Projects only active parent-child relationships with both active endpoints.
- Preserves legacy student IDs, parent IDs, usernames and class/cohort identifiers as provenance.
- Emits no password, salt, password hash or authentication material.
- Does not write to localStorage, sessionStorage, static JSON files or the sync outbox.
- Produces deterministic identity/membership IDs so repeated projections are idempotent.

The bridge and additive session context are migration/read-model compatibility only. The existing static login continues unchanged. As an additive compatibility field, `C10StudentAuth.currentUser()` and the login/restore account view now expose the stable Independent Learner `institutionId`, `institutionType` and deterministic `membershipId` for current student and parent sessions. Existing session objects are enriched when read; no re-login or session rewrite is required. These browser fields are context hints only and are never trusted as server authorization. Current accounts remain authenticated through the existing local-first mechanism until a separate backend cutover is approved and tested.

## Learning context and tenant scope

- Direct learners have no school branch. Their membership uses an all-branches scope, while their class/cohort is retained separately as a learning context.
- The existing global class catalogue remains the source of grade/cohort identifiers for now.
- Class/subject entitlements are not used to remove or hide any existing content in the current deployment.
- Future protected APIs must resolve the learner's verified membership and learning context on the server; browser-provided institution IDs or class IDs are never proof of access.

## Future seamless migration sequence

1. Export/read the legacy student, family and local learning records without modifying their sources.
2. Generate the Independent Learner tenant, identity and membership records using stable deterministic IDs.
3. Reconcile every active student, parent and parent-child link; report duplicates, missing endpoints and conflicts without silently dropping them.
4. Preserve legacy student IDs as stable external references and preserve profile/attempt/answer record IDs.
5. Backfill local learning records into the new repository with idempotent upserts and version/conflict detection.
6. Verify per-user counts and checksums for profiles, attempts, answers, progress and backups.
7. Enable authenticated remote sync only after reconciliation, restore testing and user-facing sign-in continuity are proven.
8. Keep legacy readers and rollback snapshots until the new path is stable. Never delete local records as part of the first sync.
9. Switch users gradually behind a feature flag; rollback must return to the previous local reader without losing writes.

## Institution onboarding coexistence

School, college and coaching tenants are separate institutions. An individual may later be invited to a school and hold a second institution membership without losing their Independent Learner membership or historical work. A single identity can therefore have multiple memberships, but the current standalone learner experience remains the default context until the user explicitly enters an institution context.

## Release gate

No change that touches login, storage, account JSON, profile loading, attempts, answers, backups or student navigation may be released until the independent-learner compatibility tests and the existing parent/student/browser regression suite pass.
