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
const studioSource=fs.readFileSync("js/exam-paper-studio.js","utf8");
const adminHtml=fs.readFileSync("admin.html","utf8");
assert.ok(adminHtml.includes("./js/exam-paper-studio.js?v=20261105-mathbank-refresh"),"Admin must load the refreshed Studio script instead of a cached older copy");
assert.ok(adminHtml.includes("./js/exam-paper-generator.js?v=20261105-math-adapter-refresh"),"Admin must load the refreshed generator/MCQ adapter instead of a cached older copy");
assert.ok(studioSource.includes("const publishedBank=await q.json();"),"Exam Paper Studio must always fetch the published Mathematics bank");
assert.ok(studioSource.includes('String(savedBank.bankVersion||"")===String(publishedBank.bankVersion||"")'),"a saved local bank may be reused only when its version matches the published bank");
assert.ok(studioSource.includes("bankStore.save(sourceBank)"),"a stale local bank must be replaced with the current published version");
assert.ok(!studioSource.includes("sourceBank=bankStore.load()||await q.json()"),"a stale local bank must never silently override a newer published question pool");
const profiles=[
 {level:"standard",code:"041",path:"data/exam-papers/blueprints/class-10-mathematics-standard-2026-27.json",difficultyTargets:{easy:5,medium:29,hard:4}},
 {level:"basic",code:"241",path:"data/exam-papers/blueprints/class-10-mathematics-basic-2026-27.json",difficultyTargets:{easy:8,medium:29,hard:1}}
];
const countBy=(rows,key)=>rows.reduce((counts,row)=>{const value=String(row[key]??"(missing)");counts[value]=(counts[value]||0)+1;return counts;},{});
const practiceCount=source.reduce((sum,chapter)=>sum+(chapter.questions||[]).length,0);
assert.equal(source.length,14,"Mathematics practice source must contain all 14 chapters");
assert.equal(practiceCount,1400,"Mathematics practice source must retain all 1,400 MCQs");
assert.equal(baseBank.questions.length,601,"the curated mixed-format examination seed pool must include the approved Basic slot-depth additions");
const baseAudit=engine.validateQuestionBank(baseBank,{classId:"10",subjectId:"mathematics",academicYear:"2026-27"});
assert.equal(baseAudit.valid,true,baseAudit.errors.join(" | "));
assert.equal(new Set(baseBank.questions.map(q=>q.questionId)).size,601,"the curated mixed-format seed pool must have unique IDs");

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
 assert.ok(coverage.coverage.every(slot=>slot.eligibleCount>=20),profile.level+" every paper slot must have at least 20 eligible candidates");
 assert.equal(integrated.stats.practiceSourceCount,1294,"1,294 structurally valid, unique, in-scope source MCQs should be adapted");
 assert.equal(integrated.stats.appended,1243,"1,243 source MCQs should be added after de-duplicating against the curated bank");
 assert.equal(integrated.stats.duplicateStems,51,"51 adapted MCQs should already exist in the curated examination bank");
 assert.equal(integrated.stats.excluded.outOfSummativeScope,100,"Triangle practice questions remain available for practice but are outside the current MCQ-only paper adapter");
 assert.equal(integrated.stats.excluded.ambiguousChapter,0,"valid source chapters must not be mislabeled as ambiguous when they simply have no MCQ paper slot");
 assert.equal(integrated.stats.excluded.invalidQuestion,6,"only the six repeated source stems should be removed from the 1,300 in-scope source MCQs");
 assert.equal(integrated.stats.invalidReasons.duplicateSourceStem,6);
 assert.ok(Object.entries(integrated.stats.invalidReasons).filter(([reason])=>reason!=="duplicateSourceStem").every(([,count])=>count===0),"valid source MCQs must not be excluded for malformed content fields");

 assert.equal(bank.questions.length,baseBank.questions.length+integrated.stats.appended,"the merged runtime pool must retain every curated record and every appended practice MCQ");
 assert.equal(new Set(bank.questions.map(q=>q.questionId)).size,bank.questions.length,"the merged runtime pool must preserve unique IDs across the curated and imported pools");
 assert.equal(countBy(bank.questions,"type").mcq,1304);
 assert.deepEqual(countBy(bank.questions,"type"),{
  mcq:1304,
  "assertion-reason":40,
  "very-short-answer":100,
  "short-answer":160,
  "long-answer":120,
  "case-based":120
 });
 assert.deepEqual(countBy(bank.questions,"sectionId"),{A:1344,B:100,C:160,D:120,E:120});
 const difficultyCounts=countBy(bank.questions,"difficulty");
 assert.deepEqual(Object.keys(difficultyCounts).sort(),["easy","hard","medium"]);
 assert.equal(Object.values(difficultyCounts).reduce((sum,count)=>sum+count,0),bank.questions.length);
 assert.ok(bank.questions.every(question=>["easy","medium","hard"].includes(question.difficulty)));
 assert.equal(bank.questions.filter(q=>q.source&&q.source.type==="practice-bank").length,baseBank.questions.filter(q=>q.source&&q.source.type==="practice-bank").length+integrated.stats.appended,"the runtime pool must retain existing practice-bank questions and every newly appended practice MCQ");

 const fingerprints=[],paperHistory=[];
 for(let attempt=1;attempt<=50;attempt++){
  const previousPapers=paperHistory.slice(-5);
  const paper=engine.generateUniquePaper(blueprint,bank,{
   seed:"class10-mathematics-full-integration-"+profile.level+"-"+attempt,
   recentPaperFingerprints:fingerprints,
   recentQuestionIdSets:previousPapers.map(previous=>previous.questionIds),
   uniqueSearchAttempts:1000,
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
  const contentIds=paper.questions.flatMap(q=>engine.questionContentIds(q));
  const appliedWindow=previousPapers.length;
  assert.equal(paper.repeatProtection.appliedWindow,appliedWindow,
    profile.level+" must honour the complete available five-paper history without relaxing it");
  for(const previous of previousPapers){
   const previousIds=new Set(previous.questionIds);
   assert.ok(!contentIds.some(id=>previousIds.has(id)),
    profile.level+" must not repeat any question format or nested content from the preceding five papers");
  }
  const fingerprint=engine.paperFingerprint(paper);
  assert.ok(fingerprint);
  assert.ok(!fingerprints.includes(fingerprint),profile.level+" full paper combination must be unique");
  fingerprints.push(fingerprint);
  paperHistory.push({questionIds:contentIds});
 }
 assert.equal(new Set(fingerprints).size,50,profile.level+" must produce 50 distinct complete papers using the full merged pool");
 const previousPapers=paperHistory.slice(-5);
 const paper51=engine.generateUniquePaper(blueprint,bank,{
  seed:"class10-mathematics-full-integration-"+profile.level+"-51",
  recentPaperFingerprints:fingerprints,
  recentQuestionIdSets:previousPapers.map(previous=>previous.questionIds),
  uniqueSearchAttempts:1000,
  maxSearchAttempts:250000
 });
 const paper51Ids=paper51.questions.flatMap(q=>engine.questionContentIds(q));
 assert.equal(paper51.repeatProtection.appliedWindow,5,profile.level+" must preserve the five-paper rule after a full 50-paper browser history");
 for(const previous of previousPapers){
  const ids=new Set(previous.questionIds);
  assert.ok(!paper51Ids.some(id=>ids.has(id)),profile.level+" paper 51 must exclude all question formats from the previous five papers");
 }
 assert.ok(!fingerprints.includes(engine.paperFingerprint(paper51)),profile.level+" paper 51 must remain distinct from all 50 previous full-paper combinations");

}

console.log("Mathematics end-to-end passed: 1,400 source MCQs audited; 1,844 unique merged runtime candidates; 38-question/80-mark Standard and Basic profiles; exact difficulty targets; and 50 unique full-integrated papers per level with five-paper all-format repeat protection.");
