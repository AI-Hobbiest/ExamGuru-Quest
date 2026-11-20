"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const api=require("../js/m5-integration-services.js");

const report=api.buildLearningReport({
 studentId:"student-1",
 attempts:[
  {attemptId:"a1",subjectId:"science",status:"submitted",questionCount:3,score:2,maxScore:3,source:{sourceId:"class-6-science"}},
  {attemptId:"a2",subjectId:"mathematics-sof",status:"timed-out",questionCount:2,answeredCount:1,correctCount:1,skippedCount:1,source:{sourceId:"class-6-math-sof"}},
  {attemptId:"a3",subjectId:"english",status:"in-progress",questionCount:1,answeredCount:1,correctCount:0,skippedCount:0}
 ],
 answerRecords:[
  {attemptId:"a1",subjectId:"science",status:"answered",isCorrect:true,questionBankId:"class-6-science"},
  {attemptId:"a1",subjectId:"science",status:"answered",isCorrect:false},
  {attemptId:"a1",subjectId:"science",status:"skipped"},
  {attemptId:"a2",subjectId:"mathematics-sof",status:"answered",isCorrect:true}
 ],
 mistakes:[{subjectId:"science",questionKey:"s-q1"},{subjectId:"english",questionKey:"e-q1"}],
 bookmarks:[{subjectId:"mathematics-sof",questionKey:"m-q1"}],
 mastery:[{subjectId:"science",topicId:"plants"}],
 progress:[{subjectId:"social-science",bankId:"class-6-social-science"}]
});
assert.equal(report.kind,"examguru-learning-report");
assert.equal(report.studentId,"student-1");
assert.deepEqual(report.bySubject.map(x=>x.subjectId),["english","mathematics-sof","science","social-science"]);
const science=report.bySubject.find(x=>x.subjectId==="science");
assert.equal(science.attemptCount,1);
assert.equal(science.answeredCount,2,"answer ledger is the source of truth when available");
assert.equal(science.correctCount,1);
assert.equal(science.skippedCount,1);
assert.equal(science.mistakeCount,1);
assert.equal(science.masteryCount,1);
assert.equal(report.totals.attemptCount,3);
assert.equal(report.totals.answeredCount,4);
assert.ok(report.bankIds.includes("class-6-math-sof"),"SOF bank provenance is retained");
assert.ok(report.bankIds.includes("class-6-social-science"),"progress-only supported banks are not omitted");
assert.match(api.toCsv(report),/mathematics-sof/);
assert.throws(()=>api.toCsv({}),/learning report/);

(async()=>{
 let reads=0;
 const service=api.createLearningRecordsService({
  authorize:async(actor,permission,scope)=>({allowed:actor.userId==="parent-1"&&permission==="report.student.read"&&scope.studentId==="child-1",reason:"scope-denied"}),
  loadRecords:async scope=>{reads++;assert.equal(scope.studentId,"child-1");return {attempts:[{attemptId:"a",subjectId:"science",status:"submitted",questionCount:1}],answerRecords:[]};}
 });
 const childReport=await service.readStudentReport({userId:"parent-1"},{studentId:"child-1"});
 assert.equal(childReport.totals.attemptCount,1);
 assert.match(await service.exportStudentCsv({userId:"parent-1"},{studentId:"child-1"}),/science/);
 await assert.rejects(()=>service.readStudentReport({userId:"parent-1"},{studentId:"other-child"}),/not available/);
 assert.equal(reads,2,"denied scopes never reach the local data reader");

 const experience={roles:{teacher:{nav:[["Practice","./practice.html"]]},parent:{nav:[["Parent","./parent.html"]]}}};
 const academic={isDepartmentHead:(appointments,departmentId,classId,at)=>{
  const row=appointments[0];return row.status==="active"&&row.departmentId===departmentId&&(!row.effectiveFrom||row.effectiveFrom<=at)&&(!row.effectiveTo||row.effectiveTo>at)&&(row.scopeAllDepartmentClasses===true||row.classIds.includes(classId));
 }};
 const policy=api.createRoleExperiencePolicy({experience,academicOrganisation:academic});
 const memberships=[{membershipId:"tm1",institutionId:"i1",role:"teacher",status:"active"},{membershipId:"pm1",institutionId:"i1",role:"parent",status:"active"},{membershipId:"inactive",role:"student",status:"disabled"}];
 const roles=policy.describeMemberships(memberships,[
  {appointmentId:"hod1",departmentMembershipId:"tm1",departmentId:"d1",classIds:["c1","c2"],status:"active",effectiveFrom:"2026-01-01T00:00:00.000Z",effectiveTo:"2027-01-01T00:00:00.000Z"},
  {appointmentId:"expired",departmentMembershipId:"tm1",departmentId:"d2",classIds:["c1"],status:"active",effectiveTo:"2026-01-01T00:00:00.000Z"}
 ],"2026-11-20T00:00:00.000Z",[{role:"platform_admin",revokedAt:null}]);
 assert.deepEqual(roles.map(x=>x.role),["platform_admin","teacher","hod","parent"]);
 assert.equal(roles[1].scope,"effective-dated-appointment");
 assert.deepEqual(policy.navigation("hod"),[["Practice","./practice.html"]]);
 assert.equal((await policy.authorizeAction({userId:"u"},"assessment.assign",{institutionId:"i1"})).allowed,false,
  "local role preview cannot grant protected operations");
 const serverPolicy=api.createRoleExperiencePolicy({experience,serverAuthorize:async()=>({allowed:true,reason:"server-scope-ok"})});
 assert.equal((await serverPolicy.authorizeAction({userId:"u"},"report.student.read",{studentId:"s"})).mode,"server-authorized");

 const memory=new Map();
 const storageContext={window:{},localStorage:{
  getItem:key=>memory.has(key)?memory.get(key):null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key)
 },Math,Date,JSON,Object,Array,String,Number,Set,Map,TypeError,Error,Uint8Array};
 storageContext.globalThis=storageContext;vm.createContext(storageContext);
 vm.runInContext(fs.readFileSync("js/storage.js","utf8"),storageContext);
 const local=api.createLocalRecordAdapter(storageContext.window.C10Storage);
 const localStorageApi=storageContext.window.C10Storage;
 localStorageApi.createLocalStore({kind:"test-attempt-ledger",recordId:"class-6-science",defaults:()=>({attempts:[],activeAttempt:null,answerRecords:[]}),validate:value=>Array.isArray(value.attempts)}).save({
  attempts:[{attemptId:"local-a1",profileId:"profile-1",subjectId:"science",status:"submitted",questionCount:2,score:1,maxScore:2,source:{sourceId:"class-6-science"}}],
  activeAttempt:null,answerRecords:[{attemptId:"local-a1",questionId:"q1",status:"answered",isCorrect:true}]
 });
 localStorageApi.createLocalStore({kind:"subject-progress",recordId:"class-6-science",defaults:()=>({missed:[],answered:0,correct:0,attempts:[]}),validate:value=>Array.isArray(value.missed)}).save({missed:["q2"],answered:2,correct:1,attempts:[]});
 localStorageApi.createLocalStore({kind:"learning-library",recordId:"class-6",defaults:()=>({schemaVersion:1,kind:"learning-library",mistakes:[],bookmarks:[],responses:[]}),validate:value=>value.kind==="learning-library"}).save({
  schemaVersion:1,kind:"learning-library",mistakes:[{questionKey:"q2",question:"Question 2",subjectId:"science",status:"open"}],
  bookmarks:[{questionKey:"q3",question:"Question 3",subjectId:"science"}],responses:[]
 });
 const readLocal=api.createLocalLearningRecordsReader({storage:localStorageApi,classId:"6",profileId:"profile-1",
  banks:[{id:"class-6-science",subjectId:"science",title:"Science"},{id:"class-6-mathematics-sof",subjectId:"mathematics-sof",title:"Mathematics SOF"}]});
 const localRecords=await readLocal({studentId:"student-1",classId:"6",profileId:"profile-1"});
 assert.equal(localRecords.attempts.length,1,"reader includes the profile's existing attempt ledger");
 assert.equal(localRecords.answerRecords.length,1);
 assert.equal(localRecords.mistakes.length,1);
 assert.equal(localRecords.bookmarks.length,1);
 assert.equal(localRecords.progress.length,2,"reader walks every active-class bank including SOF banks");
 assert.equal(localRecords.progress[1].bankId,"class-6-mathematics-sof");

 const first=await local.upsertRecord({kind:"attempt",recordId:"a1",idempotencyKey:"request-1",expectedVersion:0,data:{score:9}});
 assert.equal(first.record.version,1);
 const replay=await local.upsertRecord({kind:"attempt",recordId:"a1",idempotencyKey:"request-1",expectedVersion:0,data:{score:1}});
 assert.equal(replay.replayed,true);
 assert.equal(replay.record.data.score,9,"idempotent retries do not overwrite the original result");
 const conflict=await local.upsertRecord({kind:"attempt",recordId:"a1",idempotencyKey:"request-2",expectedVersion:0,data:{score:10}});
 assert.equal(conflict.conflict,true);
 assert.equal((await local.getRecord({kind:"attempt",recordId:"a1"})).version,1);
 assert.equal((await local.listRecords({kind:"attempt",recordIds:["a1","missing"]})).length,1);
 assert.deepEqual(api.assertRecordAdapter(local,"local-browser-only").methods,["getRecord","listRecords","upsertRecord"]);
 const cloud=api.assertFutureCloudAdapter({getRecord:async()=>null,listRecords:async()=>[],upsertRecord:async()=>({ok:true})});
 assert.equal(cloud.valid,true);
 assert.equal(cloud.active,false,"cloud contract must remain inactive in M5");
 assert.equal(cloud.requiresServerDerivedTenant,true);
 assert.throws(()=>api.assertFutureCloudAdapter({getRecord:async()=>null}),/must implement/);
 console.log("M5.4–M5.6 tests passed: reconciled learning read models/CSV, parent scope denial, HOD effective dates, preview deny-by-default, local adapter idempotency/conflicts and inactive cloud contract.");
})().catch(error=>{console.error(error);process.exitCode=1;});
