"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const worker=fs.readFileSync("cloudflare/worker.js","utf8");
for(const route of [
  'path==="/api/v2/departments"&&(method==="GET"||method==="POST")',
  'departmentPath&&method==="PATCH"',
  '/subjects|classes|members|heads',
  'headPath&&method==="PATCH"'
])assert.ok(worker.includes(route),"missing M3 runtime route: "+route);
for(const helper of ["v2DepartmentContext","v2DepartmentAdmin","v2Departments","v2DepartmentSubresources","v2EndDepartmentHead"])assert.ok(worker.includes("async function "+helper),"missing handler "+helper);
assert.match(worker,/SELECT m\.membership_id,m\.institution_id,m\.role,m\.status,m\.all_branches AS all_branches,i\.status AS institution_status/);
assert.match(worker,/m\.user_id=\?"/,"membership must be bound to authenticated user");
assert.match(worker,/ctx\.membership\.role!=="school_admin"/,"department mutations must require School Admin");
assert.match(worker,/role='teacher'/,"department members must be teacher institution memberships");
assert.match(worker,/scope_all_department_classes/,"HOD scope must be explicit");
assert.match(worker,/writeAudit\(env,who\.user_id,"department-head-appointed"/,"HOD appointment must be audited");
assert.match(worker,/writeAudit\(env,who\.user_id,"department-created"/,"department creation must be audited");
assert.match(worker,/department-head-\$\{status\}/,"HOD termination must be audited");
assert.doesNotMatch(worker,/role\s*=\s*["']hod["']/i,"HOD must not become a global role");
console.log("M3 Worker API contract checks passed: authenticated institution context, School Admin mutation gate, teacher-only membership, scoped HOD appointments and audit events.");
