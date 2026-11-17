"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const sql=fs.readFileSync("cloudflare/migrations/0005_academic_organisation.sql","utf8");
const departmentSchema=JSON.parse(fs.readFileSync("data/contracts/v1/department.schema.json","utf8"));
const departmentMembershipSchema=JSON.parse(fs.readFileSync("data/contracts/v1/department-membership.schema.json","utf8"));
const headSchema=JSON.parse(fs.readFileSync("data/contracts/v1/department-head-appointment.schema.json","utf8"));
const policy=require("../js/domain/academic-organisation.js");
for(const t of ["departments","department_subjects","department_class_scopes","department_memberships","department_head_appointments","department_head_class_scopes"])assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS "+t),"missing "+t);
for(const s of ["idx_one_active_hod_per_department","trg_department_membership_role","trg_hod_appointment_membership","trg_hod_class_scope_valid","trg_teacher_assignment_department_insert","trg_teacher_assignment_department_update"])assert.ok(sql.includes(s),"missing integrity control "+s);
for(const s of ["department.member.manage","department.head.appoint","department.head.read","department.assignment.manage","department.report.read","scopeAllDepartmentClasses","departmentClasses","isDepartmentHead"])assert.ok(fs.readFileSync("js/domain/academic-organisation.js","utf8").includes(s),"missing policy contract "+s);
assert.equal(Object.hasOwn(policy.ROLE_PERMISSIONS,"hod"),false,"HOD must not be a global membership role");
assert.equal(departmentSchema.properties.kind.const,"department");
assert.deepEqual(departmentMembershipSchema.properties.departmentRole.enum,["member","coordinator"]);
assert.equal(headSchema.properties.kind.const,"department-head-appointment");
assert.ok(headSchema.allOf.length===2,"HOD contract must require class scope when not all department classes are covered");
const appointments=[
 {appointmentId:"science-hod",departmentId:"science",status:"active",effectiveFrom:"2026-04-01",scopeAllDepartmentClasses:false,classIds:["class-6a","class-7a"]},
 {appointmentId:"math-hod",departmentId:"maths",status:"active",effectiveFrom:"2026-04-01",scopeAllDepartmentClasses:true,classIds:[]}
];
assert.equal(policy.isDepartmentHead(appointments,"science","class-6a","2026-11-18T00:00:00.000Z"),true);
assert.equal(policy.isDepartmentHead(appointments,"science","class-8a","2026-11-18T00:00:00.000Z"),false);
assert.equal(policy.isDepartmentHead(appointments,"maths","class-99","2026-11-18T00:00:00.000Z"),true);
assert.equal(policy.isDepartmentHead([{departmentId:"science",status:"active",effectiveFrom:"2027-01-01",scopeAllDepartmentClasses:true}],"science","class-6a","2026-11-18T00:00:00.000Z"),false);
assert.equal(policy.isDepartmentHead([{departmentId:"science",status:"ended",scopeAllDepartmentClasses:true}],"science","class-6a"),false);
const repos={
 identity:{
  getUserById:async()=>({userId:"teacher-1",status:"active"}),
  listPlatformRoles:async()=>[],
  listMemberships:async()=>[{membershipId:"inst-mem-1",institutionId:"inst-1",role:"teacher",status:"active",allBranches:true}]
 },
 institution:{
  getInstitution:async()=>({institutionId:"inst-1",status:"active"}),
  getBranch:async()=>({branchId:"branch-1",institutionId:"inst-1",status:"active"}),
  listMembershipBranchScopes:async()=>[]
 },
 academic:{
  listTeacherAssignments:async()=>[
   {status:"active",institutionId:"inst-1",departmentId:"science",institutionClassId:"class-8a",subjectId:"science"},
   {status:"active",institutionId:"inst-1",departmentId:"maths",institutionClassId:"class-9a",subjectId:"mathematics"}
  ]
 },
 academicOrganisation:{
  getDepartment:async(id)=>({departmentId:id,institutionId:"inst-1",status:"active"}),
  listDepartmentMemberships:async()=>[
   {departmentMembershipId:"dm-science",departmentId:"science",status:"active"},
   {departmentMembershipId:"dm-maths",departmentId:"maths",status:"active"}
  ],
  listActiveHeadAppointments:async(dm)=>dm==="dm-science"?appointments.slice(0,1):[],
  listDepartmentClassScopes:async(id)=>id==="science"?[{institutionClassId:"class-6a"},{institutionClassId:"class-7a"},{institutionClassId:"class-8a"}]:[{institutionClassId:"class-9a"}]
 }
};
(async()=>{
 const head=await policy.authorize(repos,{userId:"teacher-1"},"department.report.read",{institutionId:"inst-1",departmentId:"science",institutionClassId:"class-6a"});
 assert.equal(head.allowed,true);assert.equal(head.reason,"department-head-scoped");\n const headInfo=await policy.authorize(repos,{userId:"teacher-1"},"department.head.read",{institutionId:"inst-1",departmentId:"science"});\n assert.equal(headInfo.allowed,true);assert.equal(headInfo.reason,"department-head-appointment");
 const outOfScope=await policy.authorize(repos,{userId:"teacher-1"},"department.report.read",{institutionId:"inst-1",departmentId:"science",institutionClassId:"class-8a"});
 assert.equal(outOfScope.allowed,true);assert.equal(outOfScope.reason,"teacher-assignment");
 const unassigned=await policy.authorize(repos,{userId:"teacher-1"},"department.report.read",{institutionId:"inst-1",departmentId:"science",institutionClassId:"class-7a"});
 assert.equal(unassigned.allowed,false);assert.equal(unassigned.reason,"teacher-assignment-required");\n const noAssignmentList=await policy.authorize(repos,{userId:"teacher-1"},"department.assignment.read",{institutionId:"inst-1",departmentId:"science"});\n assert.equal(noAssignmentList.allowed,false);assert.equal(noAssignmentList.reason,"teacher-class-scope-required");
 const maths=await policy.authorize(repos,{userId:"teacher-1"},"department.report.read",{institutionId:"inst-1",departmentId:"maths",institutionClassId:"class-9a"});
 assert.equal(maths.allowed,true);assert.equal(maths.reason,"teacher-assignment");
 const wrongTenant=await policy.authorize(repos,{userId:"teacher-1"},"department.report.read",{institutionId:"inst-2",departmentId:"science",institutionClassId:"class-6a"});
 assert.equal(wrongTenant.allowed,false);
 const unauth=await policy.authorize(repos,null,"department.report.read",{institutionId:"inst-1",departmentId:"science"});
 assert.equal(unauth.allowed,false);
 console.log("M3 academic organisation tests passed: scoped and effective HOD authority, multi-department memberships, tenant isolation and default-deny policy.");
})().catch(error=>{console.error(error);process.exitCode=1;});
