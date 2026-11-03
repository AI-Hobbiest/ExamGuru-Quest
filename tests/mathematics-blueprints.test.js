"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const generator=ctx.window.ExamPaperGenerator;
const profiles=[
 {level:"standard",code:"041",file:"data/exam-papers/blueprints/class-10-mathematics-standard-2026-27.json",competencies:{"knowledge-understanding":43,"application":19,"analysis-evaluation-creation":18}},
 {level:"basic",code:"241",file:"data/exam-papers/blueprints/class-10-mathematics-basic-2026-27.json",competencies:{"knowledge-understanding":60,"application":12,"analysis-evaluation-creation":8}}
];
const units={"number-systems":6,"algebra":20,"coordinate-geometry":6,"geometry":15,"trigonometry":12,"mensuration":10,"statistics-and-probability":11};
const chapters=["real-numbers","polynomials","pair-of-linear-equations-in-two-variables","quadratic-equations","arithmetic-progressions","coordinate-geometry","triangles","introduction-to-trigonometry","some-applications-of-trigonometry","circles","areas-related-to-circles","surface-areas-and-volumes","statistics","probability"];
for(const profile of profiles){
 const blueprint=JSON.parse(fs.readFileSync(profile.file,"utf8"));
 assert.equal(blueprint.status,"draft","Math paper generation must remain locked until its question pool is approved.");
 assert.equal(blueprint.assessmentLevel,profile.level);
 assert.equal(blueprint.subjectId,"mathematics");
 assert.equal(blueprint.subjectCode,profile.code);
 assert.equal(blueprint.totalQuestions,38);
 assert.equal(blueprint.totalMarks,80);
 assert.equal(blueprint.durationMinutes,180);
 assert.deepEqual(blueprint.markDistribution,{"1":20,"2":5,"3":6,"4":3,"5":4});
 assert.deepEqual(blueprint.unitMarkTargets,units);
 assert.deepEqual(blueprint.competencyMarksTargets,profile.competencies);
 assert.equal(blueprint.slotPlan.length,38);
 assert.deepEqual(blueprint.slotPlan.map(slot=>slot.questionNumber),Array.from({length:38},(_,i)=>i+1));
 assert.deepEqual([...new Set(blueprint.slotPlan.flatMap(slot=>slot.chapterIds||[]))].sort(),chapters.slice().sort());
 const ready={...blueprint,status:"ready"};
 const check=generator.validateBlueprint(ready);
 assert.equal(check.valid,true,check.errors.join(" "));
 assert.equal(check.readyForGeneration,true);
 assert.equal(blueprint.slotPlan.filter(slot=>slot.requiresInternalChoice).length,6);
 assert.equal(blueprint.slotPlan.filter(slot=>Array.isArray(slot.requiresPartInternalChoiceMarks)&&slot.requiresPartInternalChoiceMarks.includes(2)).length,3);
}
const registry=JSON.parse(fs.readFileSync("data/exam-papers/profile-registry.json","utf8"));
const mathProfiles=registry.profiles.filter(profile=>String(profile.profileId||"").startsWith("class-10-mathematics-"));
assert.equal(mathProfiles.length,2);
assert.ok(mathProfiles.every(profile=>profile.enabled===false));
assert.equal(mathProfiles[0].questionBankUrl,mathProfiles[1].questionBankUrl,"Standard and Basic should use one shared Math question pool.");
const schema=JSON.parse(fs.readFileSync("data/exam-papers/question-bank.schema.json","utf8"));
assert.equal(schema.properties.classId.type,"string");
assert.equal(schema.properties.subjectId.type,"string");
assert.equal(schema.properties.questions.items.properties.sectionId.type,"string");
console.log("Mathematics blueprint tests passed: Standard/Basic structure, unit weightages, competency targets, all 14 chapters, internal-choice locations and disabled publication gate.");

// Existing Class 10 chapter-wise MCQs are imported into a shared review pool.
// This verifies structural integrity and provenance without prematurely approving content.
const mathBank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-mathematics-2026-27-v1.json","utf8"));
const mathAudit=JSON.parse(fs.readFileSync("data/exam-papers/audits/class-10-mathematics-mcq-import-audit-2026-27.json","utf8"));
assert.equal(mathBank.questions.length,1394);
assert.equal(mathAudit.summary.sourceQuestions,1400);
assert.equal(mathAudit.summary.importedQuestions,1394);
assert.equal(mathAudit.summary.exactDuplicateStemsExcluded,6);
assert.ok(mathBank.questions.every(q=>q.type==="mcq"&&q.marks===1&&q.approvalStatus==="review"));
assert.ok(mathBank.questions.every(q=>q.assessmentLevels.includes("standard")&&q.assessmentLevels.includes("basic")));
assert.ok(mathBank.questions.every(q=>q.competencyTagStatus==="needs-review"));
assert.equal(generator.validateQuestionBank(mathBank,{classId:"10",subjectId:"mathematics",academicYear:"2026-27"}).valid,true);
const mathMcqStructural=mathBank.questions.filter(q=>q.options.length===4&&new Set(q.options.map(o=>o.text.trim().toLowerCase())).size===4&&q.options.some(o=>o.optionId===q.correctOptionId)&&q.answerKey&&q.answerKey.explanation&&q.markingScheme.reduce((n,m)=>n+m.marks,0)===1);
assert.equal(mathMcqStructural.length,1394);
assert.equal(mathBank.questions.filter(q=>q.approvalStatus==="approved").length,0,"Imported MCQs must not be eligible before the answer/competency audit.");
console.log("Mathematics MCQ import tests passed: 1,394 structurally valid, deduplicated, shared-level questions remain safely in review.");

const paperBank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-mathematics-2026-27-paper-bank-v1.json","utf8"));
assert.equal(paperBank.questions.length,135);
assert.equal(paperBank.questionCount,135);
assert.equal(paperBank.questions.filter(q=>q.type==="mcq").length,54);
assert.equal(paperBank.questions.filter(q=>q.type==="assertion-reason").length,6);
assert.equal(paperBank.questions.filter(q=>["very-short-answer","short-answer","long-answer","case-based"].includes(q.type)).length,75);
assert.equal(generator.validateQuestionBank(paperBank,{classId:"10",subjectId:"mathematics",academicYear:"2026-27"}).valid,true);
for(const profile of profiles){
 const blueprint=JSON.parse(fs.readFileSync(profile.file,"utf8"));
 const readyBlueprint={...blueprint,status:"ready"};
 const coverage=generator.auditSlotCoverage(readyBlueprint,paperBank,3);
 assert.equal(coverage.valid,true,coverage.errors.join(" "));
 assert.equal(coverage.slotCount,38);
 assert.ok(coverage.coverage.every(row=>row.eligibleCount>=3),"Every blueprint slot must have exactly three approved candidates.");
 const fingerprints=[];
 for(let i=0;i<50;i++){
  const paper=generator.generateUniquePaper(readyBlueprint,paperBank,{
   seed:"math-"+profile.level+"-50-paper-regression-"+i,
   recentPaperFingerprints:fingerprints,
   generatedAt:"2026-11-03T00:00:00.000Z"
  });
  assert.equal(generator.validatePaper(paper,readyBlueprint).valid,true);
  fingerprints.push(generator.paperFingerprint(paper));
 }
 assert.equal(new Set(fingerprints).size,50,"Must generate 50 distinct papers for "+profile.level);
}
assert.ok(paperBank.questions.filter(q=>q.type==="case-based").every(q=>
 q.parts.length===3&&q.parts[0].marks===1&&q.parts[1].marks===1&&q.parts[2].marks===2&&
 Array.isArray(q.parts[2].alternatives)&&q.parts[2].alternatives.length===1
));
const updatedRegistry=JSON.parse(fs.readFileSync("data/exam-papers/profile-registry.json","utf8"));
assert.ok(updatedRegistry.profiles.filter(p=>p.subjectId==="mathematics").every(p=>p.enabled===false));
assert.equal(updatedRegistry.profiles.filter(p=>p.subjectId==="mathematics")[0].questionBankUrl,updatedRegistry.profiles.filter(p=>p.subjectId==="mathematics")[1].questionBankUrl);
console.log("Mathematics paper-pool tests passed: 135 candidates, 38 Standard and 38 Basic slots, 50 unique Standard and 50 unique Basic papers, internal choices and disabled publication gates.");
