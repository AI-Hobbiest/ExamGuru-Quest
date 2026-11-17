"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const sql=fs.readFileSync("cloudflare/migrations/0005_academic_organisation.sql","utf8");
const auth=fs.readFileSync("js/domain/academic-organisation.js","utf8");
for(const t of ["departments","department_subjects","department_class_scopes","department_memberships","department_head_appointments","department_head_class_scopes"])assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS "+t),"missing "+t);
for(const s of ["idx_one_active_hod_per_department","trg_department_membership_role","trg_hod_appointment_membership","trg_hod_class_scope_valid","trg_teacher_assignment_department_insert","trg_teacher_assignment_department_update"])assert.ok(sql.includes(s),"missing integrity control "+s);
for(const s of ["department.member.manage","department.head.appoint","department.head.read","department.assignment.manage","department.report.read","scopeAllDepartmentClasses","departmentClassIds","isDepartmentHead"])assert.ok(auth.includes(s),"missing academic organisation policy "+s);
assert.ok(!/ROLE_PERMISSIONS\s*\[[^\]]*hod/i.test(auth),"HOD must not be a global membership role");
console.log("M3 academic organisation contract checks passed: departments, cross-department membership, HOD appointments and scoped authorisation.");
