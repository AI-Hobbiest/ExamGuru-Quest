"use strict";
// Regression suite includes nested English response-selection and repeat-protection cases.
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
const shortAnswerGroup=makeQuestion(99);
shortAnswerGroup.type="short-answer";
shortAnswerGroup.marks=12;
shortAnswerGroup.attemptAny=4;
shortAnswerGroup.parts=shortAnswerGroup.parts.slice(0,5).map((part,i)=>({
 ...part,partId:String.fromCharCode(97+i),marks:3,
 prompt:"Explain a distinct textual choice using evidence in approximately 40–50 words.",
 options:undefined,correctOptionId:undefined,
 markingScheme:[{criterion:"Relevant textual point",marks:1},{criterion:"Supporting evidence",marks:1},{criterion:"Clear explanation",marks:1}]
}));
shortAnswerGroup.markingScheme=[{criterion:"Four selected responses, each worth three marks",marks:12}];
assert.equal(generator.validateQuestion(shortAnswerGroup).length,0,"12-mark choose-four-of-five groups must validate");
const wrongGroupMarks={...shortAnswerGroup,marks:11};
assert.ok(generator.validateQuestion(wrongGroupMarks).some(error=>error.includes("common part mark value")));
const withAlternative=makeQuestion(98);
withAlternative.alternatives=[{
 questionId:withAlternative.questionId+"-ALT",
 prompt:"OR read this alternative passage and answer its questions.",
 stimulus:"An original alternative passage for regression purposes.",
 parts:withAlternative.parts.slice(0,10).map((part,i)=>({...part,partId:String.fromCharCode(97+i),questionId:withAlternative.questionId+"-ALT-ITEM-"+(i+1)})),
 answerKey:{modelAnswer:"Responses should be supported by the alternative passage."},
 markingScheme:[{criterion:"Accurate responses to the alternative passage items",marks:10}]
}];
assert.equal(generator.validateQuestion(withAlternative).length,0,"nested parts inside a full-question alternative must validate");

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
assert.ok(booklet.includes("Option A")&&booklet.includes("Option D"),"nested MCQ options must appear in the printable answer booklet");
const selfStudy=fs.readFileSync("js/exam-paper-self-study.js","utf8");
assert.ok(selfStudy.includes('data-part-attempt'),"online exam must let students choose the required number of nested items");
assert.ok(selfStudy.includes('data-part-option'),"online exam must support MCQs inside nested parts");
assert.ok(selfStudy.includes("questionContentIds(q)"),"five-paper history must store nested item identities");
const invalidAttemptWithoutParts={...makeQuestion(87),parts:undefined,attemptAny:1};
assert.ok(generator.validateQuestion(invalidAttemptWithoutParts).some(error=>error.includes("attemptAny requires a non-empty parts array")));
const duplicateNestedBank={...bank,questions:bank.questions.map((question,index)=>index===1?{...question,parts:question.parts.map((part,j)=>j===0?{...part,questionId:bank.questions[0].parts[0].questionId}:part)}:question)};
assert.ok(generator.validateQuestionBank(duplicateNestedBank).errors.some(error=>error.includes("Duplicate question content ID")));
const draftBlueprint=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-10-english-language-literature-2026-27.json","utf8"));
const draftBank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-english-language-literature-2026-27-v1.json","utf8"));
const draftRegistry=JSON.parse(fs.readFileSync("data/exam-papers/profile-registry.json","utf8"));
const draftCheck=generator.validateBlueprint(draftBlueprint);
assert.equal(draftCheck.valid,true,draftCheck.errors.join("; "));
assert.equal(draftCheck.readyForGeneration,false,"English must stay locked until the release gate is met");
assert.equal(draftBlueprint.totalQuestions,11);
assert.equal(draftBlueprint.totalMarks,80);
assert.equal(draftBlueprint.slotPlan.length,11);
assert.equal(generator.validateQuestionBank(draftBank,{classId:"10",subjectId:"english-language-literature",academicYear:"2026-27"}).valid,true);
const wordCount=value=>(String(value||"").match(/[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*/g)||[]).length;
assert.equal(draftBank.questions.length,180,"Q1–Q9 must each contain twenty curated candidate bundles at this milestone");
const bySlot=number=>draftBank.questions.filter(question=>question.questionId.startsWith("ENG184-Q"+String(number).padStart(2,"0")+"-"));
for(let number=1;number<=9;number++)assert.equal(bySlot(number).length,20,"Q"+number+" must contain twenty candidates");
const slotCoverage=generator.auditSlotCoverage(draftBlueprint,draftBank,20).coverage;
for(let number=1;number<=9;number++){
 const slot=slotCoverage.find(item=>item.questionNumber===number);
 assert.equal(slot.eligibleCount,20,"Q"+number+" must clear the twenty-candidate eligibility gate");
}
for(const number of [10,11])assert.equal(slotCoverage.find(item=>item.questionNumber===number).eligibleCount,0,"Q"+number+" remains outstanding");
const q1=bySlot(1),q2=bySlot(2),q3=bySlot(3),q4=bySlot(4),q5=bySlot(5),q6=bySlot(6),q7=bySlot(7),q8=bySlot(8),q9Bundles=bySlot(9);
assert.ok(q1.every(q=>q.stimulusWordCount>=400&&q.stimulusWordCount<=450&&wordCount(q.stimulus)>=400&&wordCount(q.stimulus)<=450&&q.parts.length===8),"Q1 must contain original 400–450-word unseen passages with eight marked items");
assert.ok(q2.every(q=>q.stimulusWordCount>=200&&q.stimulusWordCount<=250&&wordCount(q.stimulus)>=200&&wordCount(q.stimulus)<=250&&q.parts.length===9&&q.visualData&&q.visualData.columns.length===3&&q.visualData.rows.length===3),"Q2 must contain 200–250-word case passages and structured three-row visual data");
assert.ok(q3.every(q=>q.attemptAny===10&&q.parts.length===12&&q.parts.every(p=>p.marks===1)),"Q3 must have twelve one-mark grammar tasks with attempt-any-ten");
assert.ok(q4.every(q=>q.alternatives?.length===1&&q.answerKey.wordCount>=100&&q.answerKey.wordCount<=120&&q.alternatives[0].answerKey.wordCount>=100&&q.alternatives[0].answerKey.wordCount<=120),"Q4 must contain two valid 100–120-word formal-letter choices");
assert.ok(q5.every(q=>q.alternatives?.length===1&&q.visualData?.rows.length===3&&q.alternatives[0].visualData?.rows.length===3&&q.answerKey.wordCount>=100&&q.answerKey.wordCount<=120&&q.alternatives[0].answerKey.wordCount>=100&&q.alternatives[0].answerKey.wordCount<=120),"Q5 must contain two data-based choices and 100–120-word model paragraphs");
assert.ok(q6.every(q=>q.chapterId==="first-flight-prose"&&q.parts.length===4&&q.alternatives?.length===1&&q.alternatives[0].parts.length===4&&String(q.stimulus).includes("Original paraphrased scene cue")),"Q6 must contain prose/drama context sets with four parts and an alternative");
assert.ok(q7.every(q=>q.chapterId==="first-flight-poetry"&&q.parts.length===4&&q.alternatives?.length===1&&q.alternatives[0].parts.length===4&&String(q.stimulus).includes("Original paraphrased poetic-context cue")),"Q7 must contain poetry context sets with four parts and an alternative");
assert.ok(q8.every(q=>q.attemptAny===4&&q.parts.length===5&&q.parts.every(p=>p.marks===3&&p.answerKey.wordCount>=40&&p.answerKey.wordCount<=50&&wordCount(p.answerKey.modelAnswer)>=40&&wordCount(p.answerKey.modelAnswer)<=50)),"Q8 must contain five independently tracked 3-mark items and 40–50-word model answers");
assert.equal(q8.filter(q=>q.chapterId==="first-flight-prose").length,10,"Q8 must include ten prose bundles");
assert.equal(q8.filter(q=>q.chapterId==="first-flight-poetry").length,10,"Q8 must include ten poetry bundles");
assert.ok(q9Bundles.every(question=>question.approvalStatus==="approved"&&question.parts.length===3),"each approved Q9 bundle must contain three independently tracked sub-questions");
const q9Coverage=slotCoverage.find(slot=>slot.slotId==="q09-footprints-short-answer");
assert.equal(q9Coverage.eligibleCount,20,"Q9 must clear the twenty-candidate toll gate");
const allContentIds=draftBank.questions.flatMap(question=>generator.questionContentIds(question));
assert.equal(new Set(allContentIds).size,allContentIds.length,"all parent, part and alternative content IDs must be globally unique");
const q9ContentIds=q9Bundles.flatMap(question=>generator.questionContentIds(question));
assert.equal(q9ContentIds.length,80,"Q9 parent and nested IDs must be accounted for");
const q9WordCounts=q9Bundles.flatMap(question=>question.parts.map(part=>part.answerKey.wordCount));
assert.ok(q9WordCounts.every(count=>count>=40&&count<=50),"Q9 model answers must follow the 40–50-word limit");
const englishProfile=draftRegistry.profiles.find(profile=>profile.profileId==="class-10-english-language-literature-2026-27");
assert.ok(englishProfile,"English draft profile must be registered");
assert.equal(englishProfile.enabled,false,"English must not appear in student Exam Studio before approval");

console.log("English Exam Studio nested response checks passed: attempt-any validation, nested MCQ, online answer capture, print rendering and all-format repeat exclusion.");
