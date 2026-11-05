"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const context={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};
context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),context);
vm.runInContext(fs.readFileSync("js/exam-paper-renderer.js","utf8"),context);
const generator=context.window.ExamPaperGenerator,renderer=context.window.ExamPaperRenderer;
assert.ok(generator&&renderer,"Exam Studio generator and renderer must load");
const blueprint={
 schemaVersion:1,kind:"exam-paper-blueprint",blueprintId:"english-attempt-any-fixture",version:1,
 title:"English Language & Literature · Nested response fixture",academicYear:"2026-27",
 classId:"10",subjectId:"english-language-literature",subjectCode:"184",subjectTitle:"English Language & Literature",
 durationMinutes:180,totalQuestions:1,totalMarks:10,status:"ready",
 sections:[{sectionId:"reading",title:"Section A · Reading Skills",questionCount:1,totalMarks:10}],
 slotPlan:[{slotId:"Q1",questionNumber:1,sectionId:"reading",marks:10,allowedTypes:["case-based"],chapterIds:["discursive-reading"]}],
 generalInstructions:["Attempt any 10 of the 12 items."]
};
function makeQuestion(n){
 const questionId="ENG184-READING-"+String(n).padStart(2,"0");
 const parts=Array.from({length:12},(_,i)=>{
  const partId=String.fromCharCode(97+i),questionIdPart=questionId+"-ITEM-"+String(i+1).padStart(2,"0");
  const base={partId,questionId:questionIdPart,prompt:"Reading item "+(i+1)+" asks about a specific detail in the passage.",marks:1,answerKey:{modelAnswer:"A defensible response for item "+(i+1)},markingScheme:[{criterion:"Accurate response",marks:1}]};
  if(i<6)return{...base,options:[{optionId:"A",text:"Option A"},{optionId:"B",text:"Option B"},{optionId:"C",text:"Option C"},{optionId:"D",text:"Option D"}],correctOptionId:"B"};
  return base;
 });
 return{
  questionId,sectionId:"reading",chapterId:"discursive-reading",topicTags:["reading","discursive"],
  type:"case-based",marks:10,attemptAny:10,prompt:"Read the unseen discursive passage and answer any ten items.",
  stimulus:"A school community introduces a reading programme, gathers feedback and adjusts the timetable. This original passage gives students evidence to interpret, compare and evaluate.",
  parts,difficulty:"medium",competency:"analysis-evaluation-creation",approvalStatus:"approved",
  answerKey:{modelAnswer:"Responses should be supported by the unseen passage."},
  markingScheme:[{criterion:"One mark for each of ten accurate responses",marks:10}],
  source:{type:"original",reference:"ExamGuru English nested-response fixture."}
 };
}
const bank={
 schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"english-language-literature",
 academicYear:"2026-27",bankVersion:"fixture-v1",questions:Array.from({length:25},(_,i)=>makeQuestion(i+1))
};
const check=generator.validateBlueprint(blueprint);
assert.equal(check.valid,true,check.errors.join("; "));
assert.equal(generator.validateQuestionBank(bank,{classId:"10",subjectId:"english-language-literature",academicYear:"2026-27"}).valid,true);
const coverage=generator.auditSlotCoverage(blueprint,bank,20);
assert.equal(coverage.valid,true,coverage.errors.join("; "));
assert.equal(coverage.coverage[0].eligibleCount,25);
assert.equal(generator.questionContentIds(bank.questions[0]).length,13,"content identity includes the parent and all 12 nested items");
assert.ok(generator.questionContentIds(bank.questions[0]).includes(bank.questions[0].parts[0].questionId));
const invalidAttempt={...bank.questions[0],attemptAny:13};
assert.ok(generator.validateQuestion(invalidAttempt).some(error=>error.includes("attemptAny")));
const invalidPart={...bank.questions[0],parts:bank.questions[0].parts.map((part,i)=>i===0?{...part,correctOptionId:"Z"}:part)};
assert.ok(generator.validateQuestion(invalidPart).some(error=>error.includes("correctOptionId")));
const usedIds=generator.questionContentIds(bank.questions[0]);
const paper=generator.generatePaper(blueprint,bank,{seed:"english-nested-repeat-test",recentQuestionIds:usedIds});
const chosenIds=generator.questionContentIds(paper.questions[0]);
assert.ok(!chosenIds.some(id=>usedIds.includes(id)),"a used nested item must hold out its entire parent bundle");
assert.ok(paper.questions[0].attemptAny===10&&paper.questions[0].parts.length===12);
const repeated=generator.generateUniquePaper(blueprint,bank,{
 seed:"english-nested-unique-test",recentPaperFingerprints:[],
 recentQuestionIdSets:[usedIds],uniqueSearchAttempts:100
});
assert.equal(repeated.repeatProtection.appliedWindow,1);
assert.ok(!generator.questionContentIds(repeated.questions[0]).some(id=>usedIds.includes(id)));
const html=renderer.buildDocumentHtml(paper,"student","/");
assert.ok(html.includes("Attempt any 10 of the 12 items."));
assert.ok(html.includes("Option A")&&html.includes("Option D"),"nested MCQ options must print");
const booklet=renderer.buildAnswerBookletHtml(paper,"/");
assert.ok(booklet.includes("Attempt any 10 of the 12 items."));
const selfStudy=fs.readFileSync("js/exam-paper-self-study.js","utf8");
assert.ok(selfStudy.includes('data-part-attempt'),"online exam must let students choose the required number of nested items");
assert.ok(selfStudy.includes('data-part-option'),"online exam must support MCQs inside nested parts");
assert.ok(selfStudy.includes("questionContentIds(q)"),"five-paper history must store nested item identities");
console.log("English Exam Studio nested response checks passed: attempt-any validation, nested MCQ, online answer capture, print rendering and all-format repeat exclusion.");
