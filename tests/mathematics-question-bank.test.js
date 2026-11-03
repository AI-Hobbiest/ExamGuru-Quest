"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const engine=ctx.window.ExamPaperGenerator;
const bank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-mathematics-2026-27-v1.json","utf8"));
const profiles=[
 {level:"standard",code:"041",path:"data/exam-papers/blueprints/class-10-mathematics-standard-2026-27.json"},
 {level:"basic",code:"241",path:"data/exam-papers/blueprints/class-10-mathematics-basic-2026-27.json"}
];
assert.equal(bank.classId,"10");
assert.equal(bank.subjectId,"mathematics");
assert.equal(bank.academicYear,"2026-27");
assert.equal(bank.questions.length,140);
const bankAudit=engine.validateQuestionBank(bank,{classId:"10",subjectId:"mathematics",academicYear:"2026-27"}); assert.equal(bankAudit.valid,true,bankAudit.errors.join(" | "));
assert.equal(new Set(bank.questions.map(q=>q.questionId)).size,bank.questions.length);
const typeCounts=bank.questions.reduce((a,q)=>(a[q.type]=(a[q.type]||0)+1,a),{});
assert.deepEqual(typeCounts,{"mcq":59,"assertion-reason":6,"very-short-answer":15,"short-answer":24,"long-answer":18,"case-based":18});
assert.equal(bank.questions.filter(q=>q.source&&q.source.type==="practice-bank").length,54);
assert.equal(new Set(bank.questions.filter(q=>q.type==="mcq").map(q=>q.chapterId)).size,14);
assert.ok(bank.questions.filter(q=>q.approvalStatus==="approved").length===140);
for(const q of bank.questions){
 assert.equal(engine.validateQuestion(q).length,0,q.questionId+": "+engine.validateQuestion(q).join(" "));
 if(q.assessmentLevels)assert.ok(q.assessmentLevels.every(x=>["standard","basic"].includes(x)));
 if(q.type==="case-based"){
  assert.deepEqual(q.parts.map(p=>p.marks),[1,1,2],q.questionId);
  const part=q.parts.find(p=>p.marks===2);
  assert.equal(part.alternatives.length,1,q.questionId);
  assert.equal(part.alternatives[0].markingScheme.reduce((n,x)=>n+x.marks,0),2,q.questionId);
 }
}
for(const profile of profiles){
 const bp=JSON.parse(fs.readFileSync(profile.path,"utf8"));
 assert.equal(bp.status,"draft","Keep the release gate closed until content has been separately approved.");
 assert.equal(bp.assessmentLevel,profile.level);
 assert.equal(bp.subjectCode,profile.code);
 const ready={...bp,status:"ready"};
 const coverage=engine.auditSlotCoverage(ready,bank,3);
 assert.equal(coverage.valid,true,profile.level+" coverage: "+coverage.errors.join(" "));
 assert.equal(coverage.slotCount,38);
 assert.ok(coverage.coverage.every(s=>s.eligibleCount>=3),profile.level+" every slot needs at least three eligible candidates");
 const fingerprints=[];
 for(let i=1;i<=50;i++){
  const paper=engine.generateUniquePaper(ready,bank,{
   seed:"class10-math-"+profile.level+"-50-paper-audit-"+i,
   recentPaperFingerprints:fingerprints
  });
  const check=engine.validatePaper(paper,ready);
  assert.equal(check.valid,true,profile.level+" paper "+i+": "+check.errors.join(" "));
  assert.equal(paper.totalQuestions,38);
  assert.equal(paper.totalMarks,80);
  assert.equal(new Set(paper.questions.map(q=>q.questionId)).size,38);
  assert.ok(paper.paperFingerprint);
  fingerprints.push(paper.paperFingerprint);
 }
 assert.equal(new Set(fingerprints).size,50,profile.level+" must generate 50 distinct complete papers");
}
const bySection=bank.questions.reduce((a,q)=>(a[q.sectionId]=(a[q.sectionId]||0)+1,a),{});
assert.deepEqual(bySection,{A:65,B:15,C:24,D:18,E:18});
console.log("Mathematics bank tests passed: 137 approved candidates, all question types, all 14 chapters, Standard and Basic coverage (3+ per slot), and 50 distinct validated 80-mark papers per level.");
