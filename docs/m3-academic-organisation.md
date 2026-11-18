# M3 academic organisation

Status: implemented in the M3 feature branch; migration and domain policy require review/merge and a separately approved D1 migration before live use.

## Design principles

- Institution membership remains the login/tenant role. Department membership is a separate association.
- A person may be a member of multiple departments within an institution, and may have memberships in several institutions.
- Teaching assignments are linked to a department, class group and subject. The same teacher can therefore teach different subjects in different departments.
- HOD is a time-bounded appointment attached to a department membership, not a global user role or a new value in `users.role` / `institution_memberships.role`.
- An HOD appointment can cover every class assigned to its department or an explicit subset of those classes.
- A teacher who is HOD of Science but an ordinary member of Mathematics keeps separate permissions in each department.
- A department can exist across branches. Its class scope explicitly enumerates institution class groups and therefore branch ownership remains checkable.

## Data model (migration 0005)

- `departments`: institution-owned departments with unique institution code and optional parent department.
- `department_subjects`: subjects owned by each department.
- `department_class_scopes`: institution class groups covered by each department.
- `department_memberships`: links an existing active teacher institution membership to a department; supports multiple departments per person.
- `department_head_appointments`: effective-dated HOD appointment for one department membership; one active HOD appointment per department at a time.
- `department_head_class_scopes`: optional class subset for an HOD appointment.
- `teacher_assignments.department_id`: nullable compatibility extension. Existing legacy assignments remain valid; department-aware assignments must match department membership, subject and class scope.

## Example

Teacher T has one institution membership and two department memberships:
- Science: department member and HOD for Classes 6A and 7A.
- Mathematics: ordinary department member, teaching Mathematics in Class 8A.

The Science appointment does not grant Mathematics HOD authority. The teacher's class/subject teaching access still comes from the explicit teacher assignment. A department head can see only department class groups in the appointment's scope; the HOD title alone never grants institution-wide access.

## Integrity and authorisation

Database triggers reject:
- Department memberships for inactive or non-teacher institution memberships.
- Department class scopes that reference another institution or inactive class group.
- HOD appointments without active department membership.
- HOD class scopes outside the department's own class scope.
- Department-aware teacher assignments without matching active department membership, subject and class scope.

A partial unique index prevents two simultaneously active HOD appointments for one department. Historical appointments remain stored as ended/revoked records.

The provider-neutral `js/domain/academic-organisation.js` policy is default-deny. It separates School Admin management rights, teacher department membership, teaching assignments and active HOD class scope. The M3 Worker runtime slice now exposes authenticated, institution-context-bound department APIs. Every request resolves the bearer session and active institution membership server-side; department mutations require a School Admin membership (or the existing allow-listed platform administrator). Teacher department memberships are accepted only for active teacher institution memberships. Mutations write audit events. HOD appointment and end/revoke operations remain scoped to a department membership and class set.

## Worker API surface (runtime integration)\n\nAll routes are under `/api/v2` and require a valid bearer session plus an explicitly selected active institution membership/context. The Worker does not accept an institution ID supplied in the request body as an authority boundary.\n\n- `GET /departments`: list departments for School Admin/institution viewer; teachers see only departments they actively belong to.\n- `POST /departments`: create a department (School Admin).\n- `PATCH /departments/:departmentId`: update name or status (School Admin).\n- `POST /departments/:departmentId/subjects`: replace department subject set (School Admin).\n- `POST /departments/:departmentId/classes`: replace department class-group scope (School Admin).\n- `POST /departments/:departmentId/members`: add an active teacher institution membership (School Admin).\n- `POST /departments/:departmentId/heads`: appoint a department member as HOD with effective dates and all-class or explicit class scope (School Admin).\n- `PATCH /department-heads/:appointmentId`: end or revoke an active/scheduled appointment (School Admin).\n\nThe endpoints are code-complete but depend on migration 0005 being applied to the target D1 database. They are not live until the migration is approved/applied and the Worker is deployed. The current slice does not yet include portal administration screens, teacher assignment workflows or student enrolment workflows.\n\n## Compatibility and deployment

- No new global HOD role is added.
- Legacy `teacher_assignments` with `department_id=NULL` remain readable and valid during migration.
- No live D1 migration is run by this change. Back up D1 and explicitly approve applying migration 0005 after 0003 and 0004.
- M3 does not enable new portal menus or role logins. Existing static JSON/browser identity remains prototype-only.
- M4 will build institution operations, class/teacher assignments and enrolment workflows on top of this structure.

## Tests

`tests/m3-academic-organisation.test.py` applies schema + migrations 0003/0004/0005 to SQLite and checks multi-department teachers, HOD scope, tenant and subject integrity, active-HOD uniqueness and legacy assignment compatibility. `tests/m3-academic-organisation.test.js` checks schema/policy contracts.
