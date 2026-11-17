"use strict";
const assert=require("node:assert/strict");
const {createMemoryRepositories}=require("../js/adapters/memory-repositories.js");
const {createStaticPrototypeRepositories}=require("../js/adapters/static-prototype-repositories.js");
const {authorize}=require("../js/domain/authorization.js");
const contracts=require("../js/domain/repository-contracts.js");
const now="2026-11-17T00:00:00.000Z";
const seed={
 users:["admin","school","teacher","student","parent","other"].map(userId=>({userId,status:"active"})),
 institutions:[{institutionId:"i1",status:"active"},{institutionId:"i2",status:"active"}],
 branches:[{branchId:"b1",institutionId:"i1",status:"active"},{branchId:"b2",institutionId:"i1",status:"active"},{branchId:"b3",institutionId:"i2",status:"active"}],
 memberships:[
  {membershipId:"m-school",userId:"school",institutionId:"i1",role:"school_admin",status:"active",allBranches:false},
  {membershipId:"m-teacher",userId:"teacher",institutionId:"i1",role:"teacher",status:"active",allBranches:false},
  {membershipId:"m-student",userId:"student",institutionId:"i1",role:"student",status:"active",allBranches:false},
  {membershipId:"m-parent",userId:"parent",institutionId:"i1",role:"parent",status:"active",allBranches:false},
  {membershipId:"m-other",userId:"other",institutionId:"i2",role:"school_admin",status:"active",allBranches:true}
 ],
 platformRoles:[{userId:"admin",role:"platform_admin"}],
 branchScopes:[
  {membershipId:"m-school",branchId:"b1"},{membershipId:"m-school",branchId:"b2"},
  {membershipId:"m-teacher",branchId:"b1"},{membershipId:"m-student",branchId:"b1"},{membershipId:"m-parent",branchId:"b1"}
 ],
 teacherAssignments:[{teacherMembershipId:"m-teacher",institutionId:"i1",branchId:"b1",institutionClassId:"c6a",subjectId:"science",status:"active"}],
 studentEnrollments:[{studentMembershipId:"m-student",institutionId:"i1",institutionClassId:"c6a",status:"active"}],
 parentStudentLinks:[{parentMembershipId:"m-parent",institutionId:"i1",studentMembershipId:"m-student",status:"active"}]
};
(async()=>{
 const repos=createMemoryRepositories(seed);
 assert.equal(repos.assurance,"test-only");
 assert.doesNotThrow(()=>contracts.assertRepositories(repos));
 assert.equal((await authorize(repos,{userId:"school"},"class.manage",{institutionId:"i1",branchId:"b1"})).allowed,true);
 assert.equal((await authorize(repos,{userId:"school"},"class.manage",{institutionId:"i2",branchId:"b3"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"school"},"class.manage",{institutionId:"i1",branchId:"b3"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"teacher"},"assessment.create",{institutionId:"i1",branchId:"b1",institutionClassId:"c6a",subjectId:"science"})).allowed,true);
 assert.equal((await authorize(repos,{userId:"teacher"},"assessment.create",{institutionId:"i1",branchId:"b1",institutionClassId:"c6a",subjectId:"mathematics"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"teacher"},"assessment.create",{institutionId:"i1",branchId:"b2",institutionClassId:"c6a",subjectId:"science"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"parent"},"report.student.read",{institutionId:"i1",branchId:"b1",studentMembershipId:"m-student"})).allowed,true);
 assert.equal((await authorize(repos,{userId:"parent"},"report.student.read",{institutionId:"i1",branchId:"b1",studentMembershipId:"someone-else"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"student"},"report.student.read",{institutionId:"i1",branchId:"b1",studentMembershipId:"m-parent"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"student"},"report.student.read",{institutionId:"i1",branchId:"b1",studentMembershipId:"m-student",institutionClassId:"c6a"})).allowed,true);
 assert.equal((await authorize(repos,{userId:"other"},"class.manage",{institutionId:"i1",branchId:"b1"})).allowed,false);
 assert.equal((await authorize(repos,{userId:"school"},"report.export",{institutionId:"i1"})).reason,"branch-scope-denied");
 assert.equal((await authorize(repos,{userId:"school"},"unknown.permission",{institutionId:"i1",branchId:"b1"})).allowed,false);
 assert.equal((await authorize(repos,null,"institution.read",{institutionId:"i1",branchId:"b1"})).reason,"unauthenticated");
 assert.equal((await authorize(repos,{userId:"admin"},"institution.manage",{institutionId:"i2"})).allowed,true);
 const staticRepo=createStaticPrototypeRepositories(async()=>({schemaVersion:1,kind:"examguru-rbac-prototype-snapshot",...seed}));
 assert.equal(staticRepo.assurance,"prototype-only-read-only");
 assert.equal((await staticRepo.identity.getUserById("teacher")).userId,"teacher");
 assert.equal((await authorize(staticRepo,{userId:"teacher"},"assessment.create",{institutionId:"i1",branchId:"b1",institutionClassId:"c6a",subjectId:"science"})).allowed,true);
 await assert.rejects(()=>contracts.assertRepositories({identity:{},institution:{},academic:{}}));
 console.log("M1 repository/authorization tests passed: provider contracts, memory/static adapters, default-deny, tenant isolation, branch scopes, teacher assignments, parent-child links, student self-scope and platform admin.");
})().catch(error=>{console.error(error);process.exitCode=1;});
