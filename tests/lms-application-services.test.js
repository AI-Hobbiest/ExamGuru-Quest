"use strict";
const assert = require("node:assert/strict");
require("../js/domain/repository-contracts.js");
const memory = require("../js/adapters/memory-repositories.js");
const services = require("../js/lms-application-services.js");

(async () => {
  const sourceBank = { bankId:"shared-science-v3", bankVersion:"3.2", ownership:"platform", classId:"6", subjectId:"science", questions:[{questionId:"q1",prompt:"A"}] };
  const repositories = memory.createMemoryRepositories({
    users:[{userId:"u1",status:"active"}],
    memberships:[{membershipId:"m1",userId:"u1",institutionId:"i1",role:"student",status:"active"}],
    studentEnrollments:[{studentMembershipId:"m1",institutionId:"i1",classId:"6"}],
    curriculumItems:[{curriculumId:"cbse-6",classId:"6"}],
    sharedBanks:[sourceBank]
  });
  const manager = {
    listForStudent:id=>[{studentId:id}], listForParent:id=>[{parentId:id}], get:id=>({assignmentId:id}),
    createMcqAssignment:a=>({kind:"mcq",...a}), createPaperAssignment:a=>({kind:"paper",...a}),
    start:(id,student)=>({id,student}), submit:(id,student,answers)=>({id,student,answers}),
    startPaper:(id,student)=>({id,student}), submitPaper:(id,student,answers)=>({id,student,answers}),
    recordPaperEvaluation:(id,parent,score,feedback)=>({id,parent,score,feedback}),
    analyticsAttemptsForStudent:id=>[{studentId:id}]
  };
  const app = services.createLmsServices({repositories,assessmentManager:manager});
  const learner = await app.academic.getLearnerContext("u1","m1");
  assert.equal(learner.memberships[0].enrollments[0].classId,"6");
  assert.equal((await app.curriculum.get("cbse-6")).classId,"6");
  const copy = await app.content.createInstitutionCopy({institutionId:"i1",sourceBankId:"shared-science-v3"});
  assert.equal(copy.ownership,"institution");
  assert.equal(copy.provenance.sourceBankId,"shared-science-v3");
  assert.equal(copy.provenance.sourceVersion,"3.2");
  assert.equal(copy.status,"draft");
  copy.questions[0].prompt="Changed only in institution copy";
  assert.equal((await app.content.getSharedBank("shared-science-v3")).questions[0].prompt,"A","copy edits must not mutate platform source bank");
  assert.equal((await app.content.listInstitutionContent("i1")).length,1);
  assert.deepEqual(app.assessments.start("a1","u1"),{id:"a1",student:"u1"});
  assert.deepEqual(app.assessments.submit("a1","u1",{q1:"b"}),{id:"a1",student:"u1",answers:{q1:"b"}});
  await assert.rejects(()=>app.content.createInstitutionCopy({institutionId:"",sourceBankId:"shared-science-v3"}),/institution ID/);
  await assert.rejects(()=>app.content.createInstitutionCopy({institutionId:"i1",sourceBankId:"missing"}),/not found/);
  console.log("M5.1–M5.3 application-service tests passed: academic context, curriculum lookup, shared-to-institution copy provenance and immutability, and assessment lifecycle delegation.");
})().catch(error=>{console.error(error);process.exitCode=1;});