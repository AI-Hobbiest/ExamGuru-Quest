"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const bank=JSON.parse(fs.readFileSync("_site/data/science.json","utf8"));
assert.equal(bank.length,14,"Science bank keeps all 14 chapter sets");
const rawCount=bank.reduce((total,chapter)=>total+chapter.questions.length,0);
assert.equal(rawCount,1400,"Science bank keeps all 1,400 questions");
for(const chapter of bank){
  assert.ok(chapter.title,"every Science chapter has a title");
  assert.ok(Array.isArray(chapter.questions)&&chapter.questions.length>0,"every Science chapter has questions");
  for(const question of chapter.questions){
    assert.ok(question.question,"question text is retained");
    assert.equal(question.options.length,4,"each Science MCQ has four options");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"correct answer index is valid");
    assert.ok(question.explanation,"every MCQ has a usable explanation");
  }
}

const context={window:{}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/question-bank.js","utf8"),context,{filename:"js/question-bank.js"});
const chapters=context.window.C10QuestionBank.normalize(bank,"science");
assert.equal(chapters.length,14,"shared question-bank normalizer accepts Science");
const questions=chapters.flatMap(chapter=>chapter.questions);
assert.equal(questions.length,1400,"all Science questions normalize into shared shape");
assert.equal(new Set(questions.map(question=>question.questionKey)).size,1400,"Science question keys are stable and unique");
for(const question of questions){
  assert.equal(question.options.length,4);
  assert.ok(question.optionIds.includes(question.correctOptionId),"correct option ID survives option shuffling");
  assert.ok(question.answer>=0&&question.answer<4);
  assert.ok(question.explanation);
}

const engine=fs.readFileSync("js/quiz-engine.js","utf8");
assert.ok(engine.includes('science: { title:"Science"'),"shared quiz engine registers Science");
const route=fs.readFileSync("science.html","utf8");
assert.ok(route.includes("practice.html?subject=science"),"legacy Science URL forwards to the common practice page");

const examContext={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};
examContext.globalThis=examContext;
vm.createContext(examContext);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),examContext,{filename:"js/exam-paper-generator.js"});
const exam=examContext.window.C10ExamPaperGenerator;
const blueprint=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-10-science-2026-27.json","utf8"));
const dedicated=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-science-2026-27-v1.json","utf8"));
const integrated=exam.mergeQuestionBanks(dedicated,bank,blueprint);
assert.ok(integrated.stats.appended>=450,"the shared Science practice bank should contribute at least 450 distinct summative MCQs with competency tags above the review threshold");
assert.ok(integrated.stats.excluded.invalidQuestion>0&&integrated.stats.invalidReasons.duplicateSourceStem===integrated.stats.excluded.invalidQuestion,"repeated practice-bank stems should be filtered as duplicates, not reported as malformed questions");
assert.ok(Object.entries(integrated.stats.invalidReasons).filter(([key])=>key!=="duplicateSourceStem").every(([,count])=>count===0),"valid source MCQs must not be rejected for invalid content metadata");
assert.ok(integrated.stats.excluded.outOfSummativeScope>0,"chapters outside the summative blueprint must be excluded explicitly");
assert.equal(integrated.bank.questions.length,dedicated.questions.length+integrated.stats.appended);
assert.equal(new Set(integrated.bank.questions.map(q=>q.questionId)).size,integrated.bank.questions.length,"integrated question IDs must remain unique");
const imported=integrated.bank.questions.filter(q=>q.source&&q.source.type==="practice-bank");
assert.equal(imported.length,integrated.stats.appended,"every imported MCQ must retain practice-bank provenance");
assert.ok(imported.every(q=>q.type==="mcq"&&q.marks===1&&q.options.length===4&&q.answerKey&&q.markingScheme.length===1));
assert.ok(imported.every(q=>q.competencyTagStatus==="inferred"||q.competencyTagStatus==="author-confirmed"),"Exam Paper Studio must not use unreviewed low-confidence practice MCQs");
assert.ok(imported.every(q=>q.competencyTagReason),"integrated MCQs must retain a reason for their competency label");
assert.equal(new Set(integrated.bank.questions.map(q=>String(q.prompt).toLowerCase().replace(/[^a-z0-9]+/g," ").trim())).size,integrated.bank.questions.length,"the merged pool must not contain duplicate stems");
const mcqSlots=blueprint.slotPlan.filter(slot=>slot.allowedTypes.includes("mcq"));
assert.equal(mcqSlots.length,16,"the blueprint currently has 16 MCQ slots");
const mcqCoverage=integrated.stats.coverage.coverage.filter(slot=>mcqSlots.some(mcq=>mcq.slotId===slot.slotId));
assert.equal(mcqCoverage.length,16);
assert.ok(mcqCoverage.every(slot=>slot.eligibleCount>=20),"every MCQ slot needs at least twenty eligible questions");
const paperFingerprints=[],paperHistory=[];
for(let attempt=1;attempt<=50;attempt++){
 const recentMcqQuestionIds=paperHistory.slice(-2).flatMap(p=>p.mcqQuestionIds);
 const next=exam.generateUniquePaper(blueprint,integrated.bank,{seed:"shared-science-mcq-release-"+attempt,recentPaperFingerprints:paperFingerprints,recentQuestionIds:recentMcqQuestionIds,uniqueSearchAttempts:500});
 assert.equal(exam.validatePaper(next,blueprint).valid,true);
 assert.ok(next.questions.some(q=>q.source&&q.source.type==="practice-bank"),"generated papers must actually draw from the chapter-wise MCQ pool");
 const mcqQuestionIds=next.questions.filter(q=>q.type==="mcq").map(q=>q.questionId);
 for(const previous of paperHistory.slice(-2))assert.ok(!mcqQuestionIds.some(id=>previous.mcqQuestionIds.includes(id)),"an MCQ must not recur within the previous two papers");
 const fingerprint=exam.paperFingerprint(next);
 assert.ok(!paperFingerprints.includes(fingerprint),"the integrated pool must not repeat a complete paper within the 50-paper cycle");
 paperFingerprints.push(fingerprint);
 paperHistory.push({mcqQuestionIds});
}
assert.equal(new Set(paperFingerprints).size,50);
console.log("Science integration passed: 14 chapter sets / 1,400 practice MCQs; "+integrated.stats.appended+" competency-tagged existing MCQs reused (needs educator review: "+integrated.stats.excluded.needsReview+"); "+imported.length+" carry traceable source IDs; "+mcqCoverage.length+" MCQ slots have 20+ eligible candidates; 50 distinct integrated papers generated. MCQ slot coverage: "+mcqCoverage.map(x=>x.questionNumber+":"+x.eligibleCount).join(", ")+".");

