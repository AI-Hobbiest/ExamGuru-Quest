"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const m=ctx.window.C10ExamPaperGenerator;
const production=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-10-science-2026-27.json","utf8"));
const pcheck=m.validateBlueprint(production);assert.equal(pcheck.valid,true);assert.equal(pcheck.readyForGeneration,false);
assert.throws(()=>m.generatePaper(production,{schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"science",academicYear:"2026-27",bankVersion:"x",questions:[]}),/not approved/);
const bp={schemaVersion:1,kind:"exam-paper-blueprint",blueprintId:"fixture",version:1,title:"Fixture",academicYear:"2026-27",classId:"10",subjectId:"science",durationMinutes:180,totalQuestions:4,totalMarks:10,status:"ready",sections:[{sectionId:"biology",title:"Biology",questionCount:2,totalMarks:5},{sectionId:"chemistry",title:"Chemistry",questionCount:1,totalMarks:2},{sectionId:"physics",title:"Physics",questionCount:1,totalMarks:3}],slotPlan:[{slotId:"B1",sectionId:"biology",marks:2,count:1,allowedTypes:["short-answer"]},{slotId:"B2",sectionId:"biology",marks:3,count:1,allowedTypes:["case-based"]},{slotId:"C1",sectionId:"chemistry",marks:2,count:1,allowedTypes:["mcq"]},{slotId:"P1",sectionId:"physics",marks:3,count:1,allowedTypes:["numerical"]}]};
function q(id,sectionId,marks,type,extra={}){return{questionId:id,sectionId,chapterId:"ch-"+sectionId,type,marks,prompt:"Prompt "+id,difficulty:"medium",competency:"application",approvalStatus:"approved",answerKey:{modelAnswer:"Answer "+id},...extra};}
const bank={schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"science",academicYear:"2026-27",bankVersion:"test-1",questions:[
 q("bio1","biology",2,"short-answer"),q("bio2","biology",3,"case-based",{stimulus:"Passage",parts:[{partId:"a",prompt:"Part A",marks:1},{partId:"b",prompt:"Part B",marks:2}]}),
 q("chem1","chemistry",2,"mcq",{options:[{optionId:"a",text:"A"},{optionId:"b",text:"B"}],correctOptionId:"b"}),
 q("phys1","physics",3,"numerical"),q("draft","biology",2,"short-answer",{approvalStatus:"draft"})]};
assert.equal(m.validateQuestionBank(bank).valid,true);
const diagramQuestion=q("diagram","physics",3,"diagram-based",{images:[{src:"./assets/questions/science/circuit.png",alt:"Simple electric circuit"}]});
assert.equal(m.validateQuestion(diagramQuestion).length,0);
const unsafeDiagram=q("bad-diagram","physics",3,"diagram-based",{images:[{src:"../private.png",alt:"Unsafe path"}]});
assert.ok(m.validateQuestion(unsafeDiagram).length>0,"diagram assets must use safe relative paths");
const paper=m.generatePaper(bp,bank,{seed:"same",generatedAt:"2026-11-02T00:00:00.000Z"});
assert.equal(paper.totalQuestions,4);assert.equal(paper.totalMarks,10);assert.equal(m.validatePaper(paper,bp).valid,true);
assert.deepEqual(JSON.parse(JSON.stringify(paper.sectionResults.map(s=>[s.sectionId,s.questionCount,s.totalMarks]))),[["biology",2,5],["chemistry",1,2],["physics",1,3]]);
assert.deepEqual(JSON.parse(JSON.stringify(m.generatePaper(bp,bank,{seed:"same"}).questions.map(x=>x.questionId))),JSON.parse(JSON.stringify(m.generatePaper(bp,bank,{seed:"same"}).questions.map(x=>x.questionId))));
assert.throws(()=>m.generatePaper(bp,{...bank,questions:bank.questions.filter(x=>x.questionId!=="bio2")},{seed:"short"}),/Question pool shortage/);
assert.equal(m.validateQuestionBank({...bank,questions:[...bank.questions,bank.questions[0]]}).valid,false);
assert.equal(m.validateBlueprint({...bp,totalMarks:11}).valid,false);
const choiceBp={...bp,totalQuestions:1,totalMarks:2,sections:[{sectionId:"biology",title:"Bio",questionCount:1,totalMarks:2}],slotPlan:[{slotId:"choice",sectionId:"biology",marks:2,count:1,allowedTypes:["short-answer"],requiresInternalChoice:true}]};
const choiceQ=q("choice","biology",2,"short-answer",{alternatives:[{prompt:"Equivalent alternative"}]});
assert.equal(m.generatePaper(choiceBp,{...bank,questions:[choiceQ]},{seed:"choice"}).questions[0].alternatives.length,1);
assert.throws(()=>m.generatePaper(choiceBp,{...bank,questions:[q("no-choice","biology",2,"short-answer")]},{seed:"x"}),/Question pool shortage/);
console.log("Exam paper generator tests passed: draft guard, mixed types, deterministic unique selection, approved-only eligibility, marks, sections, internal choices and shortage guards.");