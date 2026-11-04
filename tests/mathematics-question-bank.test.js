"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const engine=ctx.window.ExamPaperGenerator;
const source=JSON.parse(fs.readFileSync("data/mathematics.json","utf8"));
const baseBank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-mathematics-2026-27-v1.json","utf8"));
const profiles=[
 {level:"standard",code:"041",path:"data/exam-papers/blueprints/class-10-mathematics-standard-2026-27.json",difficultyTargets:{easy:5,medium:29,hard:4}},
 {level:"basic",code:"241",path:"data/exam-papers/blueprints/class-10-mathematics-basic-2026-27.json",difficultyTargets:{easy:8,medium:29,hard:1}}
];
const countBy=(rows,key)=>rows.reduce((counts,row)=>{const value=String(row[key]??"(missing)");counts[value]=(counts[value]||0)+1;return counts;},{});
const practiceCount=source.reduce((sum,chapter)=>sum+(chapter.questions||[]).length,0);
assert.equal(source.length,14,"Mathematics practice source must contain all 14 chapters");
assert.equal(practiceCount,1400,"Mathematics practice source must retain all 1,400 MCQs");
assert.equal(baseBank.questions.length,482,"the curated mixed-format examination seed pool must remain intact");
const baseAudit=engine.validateQuestionBank(baseBank,{classId:"10",subjectId:"mathematics",academicYear:"2026-27"});
assert.equal(baseAudit.valid,true,baseAudit.errors.join(" | "));
assert.equal(new Set(baseBank.questions.map(q=>q.questionId)).size,140);

for(const profile of profiles){
 const blueprint=JSON.parse(fs.readFileSync(profile.path,"utf8"));
 assert.equal(blueprint.status,"ready",profile.level+" blueprint must be enabled for generation only after release gates pass");
 assert.equal(blueprint.assessmentLevel,profile.level);
 assert.equal(blueprint.subjectCode,profile.code);
 assert.deepEqual(blueprint.difficultyTargets,profile.difficultyTargets);
 assert.equal(engine.validateBlueprint(blueprint).valid,true,profile.level+" blueprint: "+engine.validateBlueprint(blueprint).errors.join(" | "));
 assert.equal(blueprint.totalQuestions,38);
 assert.equal(blueprint.totalMarks,80);
 assert.equal(blueprint.slotPlan.length,38);

 const integrated=engine.mergeQuestionBanks(baseBank,source,blueprint,{minimumCandidatesPerSlot: 20});
 const bank=integrated.bank;
 const coverage=integrated.stats.coverage;
 assert.equal(coverage.valid,true,profile.level+" integrated coverage: "+coverage.errors.join(" | "));
 assert.equal(coverage.slotCount,38);
 assert.ok(coverage.coverage.every(slot=>slot.eligibleCount>=3),profile.level+" every paper slot needs at least three eligible candidates");
 assert.equal(integrated.stats.practiceSourceCount,1294,"1,294 structurally valid, unique, in-scope source MCQs should be adapted");
 assert.equal(integrated.stats.appended,1243,"1,243 source MCQs should be added after de-duplicating against the curated bank");
 assert.equal(integrated.stats.duplicateStems,51,"51 adapted MCQs should already exist in the curated examination bank");
 assert.equal(integrated.stats.excluded.outOfSummativeScope,100,"Triangle practice questions remain available for practice but are outside the current MCQ-only paper adapter");
 assert.equal(integrated.stats.excluded.ambiguousChapter,0,"valid source chapters must not be mislabeled as ambiguous when they simply have no MCQ paper slot");
 assert.equal(integrated.stats.excluded.invalidQuestion,6,"only the six repeated source stems should be removed from the 1,300 in-scope source MCQs");
 assert.equal(integrated.stats.invalidReasons.duplicateSourceStem,6);
 assert.ok(Object.entries(integrated.stats.invalidReasons).filter(([reason])=>reason!=="duplicateSourceStem").every(([,count])=>count===0),"valid source MCQs must not be excluded for malformed content fields");

 assert.equal(bank.questions.length,1725,"the full merged runtime pool must contain 1,383 unique question records");
 assert.equal(new Set(bank.questions.map(q=>q.questionId)).size,1383);
 assert.equal(countBy(bank.questions,"type").mcq,1304);
 assert.deepEqual(countBy(bank.questions,"type"),{
  mcq:1304,
  "assertion-reason":40,
  "very-short-answer":100,
  "short-answer":126,
  "long-answer":86,
  "case-based":69
 });
 assert.deepEqual(countBy(bank.questions,"sectionId"),{A:1308,B:15,C:24,D:18,E:18});
 assert.deepEqual(countBy(bank.questions,"difficulty"),{easy:530,medium:755,hard:98});
 assert.equal(bank.questions.filter(q=>q.source&&q.source.type==="practice-bank").length,1297,"the runtime pool must retain all 1,294 unique in-scope source MCQs plus three Triangle practice questions already in the curated seed bank");

 const fingerprints=[],paperHistory=[];
 for(let attempt=1;attempt<=50;attempt++){
  const recentMcqQuestionIds=paperHistory.slice(-2).flatMap(p=>p.mcqQuestionIds);
  const paper=engine.generateUniquePaper(blueprint,bank,{
   seed:"class10-mathematics-full-integration-"+profile.level+"-"+attempt,
   recentPaperFingerprints:fingerprints,
   recentQuestionIds:recentMcqQuestionIds,
   uniqueSearchAttempts:500,
   maxSearchAttempts:250000
  });
  const check=engine.validatePaper(paper,blueprint);
  assert.equal(check.valid,true,profile.level+" paper "+attempt+": "+check.errors.join(" | "));
  assert.equal(paper.totalQuestions,38);
  assert.equal(paper.totalMarks,80);
  assert.equal(new Set(paper.questions.map(q=>q.questionId)).size,38);
  assert.deepEqual(countBy(paper.questions,"difficulty"),profile.difficultyTargets,profile.level+" paper "+attempt+" must satisfy the full-paper difficulty target");
  assert.deepEqual(countBy(paper.questions,"sectionId"),{A:20,B:5,C:6,D:4,E:3});
  assert.deepEqual(countBy(paper.questions,"type"),{
   mcq:18,
   "assertion-reason":2,
   "very-short-answer":5,
   "short-answer":6,
   "long-answer":4,
   "case-based":3
  });
  assert.ok(paper.questions.some(q=>q.source&&q.source.type==="practice-bank"),"every generated examination must actually draw from the integrated chapter MCQ bank");
  const mcqQuestionIds=paper.questions.filter(q=>q.type==="mcq").map(q=>q.questionId);
  for(const previous of paperHistory.slice(-2)){
   assert.ok(!mcqQuestionIds.some(id=>previous.mcqQuestionIds.includes(id)),profile.level+" MCQs must not repeat in the preceding two papers");
  }
  const fingerprint=engine.paperFingerprint(paper);
  assert.ok(fingerprint);
  assert.ok(!fingerprints.includes(fingerprint),profile.level+" full paper combination must be unique");
  fingerprints.push(fingerprint);
  paperHistory.push({mcqQuestionIds});
 }
 assert.equal(new Set(fingerprints).size,50,profile.level+" must produce 50 distinct complete papers using the full merged pool");
}

console.log("Mathematics end-to-end passed: 1,400 source MCQs audited; 1,383 merged runtime candidates; 38-question/80-mark Standard and Basic profiles; exact difficulty targets; and 50 unique full-integrated papers per level with two-paper MCQ repeat protection.");
