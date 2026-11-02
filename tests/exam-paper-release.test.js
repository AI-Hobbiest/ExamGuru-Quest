"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-renderer.js","utf8"),ctx);
const g=ctx.window.C10ExamPaperGenerator,r=ctx.window.C10ExamPaperRenderer;
const blueprint=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-10-science-2026-27.json","utf8"));
const bank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-science-2026-27-v1.json","utf8"));
const bc=g.validateBlueprint(blueprint);
assert.equal(bc.valid,true,bc.errors.join("; "));
assert.equal(bc.readyForGeneration,true);
assert.equal(blueprint.totalQuestions,39);
assert.equal(blueprint.totalMarks,80);
assert.deepEqual(blueprint.sections.map(s=>s.totalMarks),[30,25,25]);
assert.deepEqual(Object.values(blueprint.unitMarkTargets),[25,25,12,13,5]);
assert.deepEqual(Object.values(blueprint.competencyMarksTargets),[40,24,16]);
assert.equal(blueprint.slotPlan.length,39);
const choiceSlots=[11,15,16,26,28,29,34,38,39];
for(const n of choiceSlots){
 const slot=blueprint.slotPlan.find(s=>s.questionNumber===n);
 assert.equal(slot.requiresInternalChoice,true,"internal-choice slot Q"+n);
}
for(const q of bank.questions){
 const token=q.questionId.split("-Q")[1];
 const questionNumber=Number(token&&token.split("-")[0]);
 assert.ok(Number.isInteger(questionNumber),"question ID carries a numbered slot: "+q.questionId);
 const slot=blueprint.slotPlan.find(s=>s.questionNumber===questionNumber);
 assert.ok(slot,"question has a blueprint slot: "+q.questionId);
 assert.ok(slot.chapterIds.includes(q.chapterId),"question chapter matches slot Q"+questionNumber);
}
const qcheck=g.validateQuestionBank(bank,{academicYear:"2026-27"});
assert.equal(qcheck.valid,true,qcheck.errors.join("; "));
assert.equal(bank.questions.length,117);
assert.equal(g.auditSlotCoverage(blueprint,bank,3).valid,true,g.auditSlotCoverage(blueprint,bank,3).errors.join("; "));
assert.ok(g.auditSlotCoverage(blueprint,bank,3).coverage.every(slot=>slot.eligibleCount>=3));
assert.equal(new Set(bank.questions.map(q=>q.questionId)).size,117);
for(const n of choiceSlots){
 const q=bank.questions.find(q=>q.questionId.includes("-Q"+String(n).padStart(2,"0")+"-"));
 assert.ok(q&&q.alternatives&&q.alternatives.length,"alternative present at Q"+n);
 assert.equal(q.alternatives[0].markingScheme.reduce((sum,x)=>sum+x.marks,0),q.marks);
}
const paper=g.generatePaper(blueprint,bank,{seed:"cbse-2026-27-release-test",generatedAt:"2026-11-02T00:00:00.000Z"});
const pc=g.validatePaper(paper,blueprint);
assert.equal(pc.valid,true,pc.errors.join("; "));
assert.equal(paper.questions.length,39);
assert.equal(paper.totalMarks,80);
assert.deepEqual(paper.sectionResults.map(s=>s.totalMarks),[30,25,25]);
const unitMarks={},competencyMarks={};
paper.questions.forEach(q=>{unitMarks[q.unitId]=(unitMarks[q.unitId]||0)+q.marks;competencyMarks[q.competency]=(competencyMarks[q.competency]||0)+q.marks;});
assert.deepEqual(unitMarks,blueprint.unitMarkTargets);
assert.deepEqual(competencyMarks,blueprint.competencyMarksTargets);
const student=r.buildDocumentHtml(paper,"student","https://ai-hobbiest.github.io/ExamGuru-Quest/");
const teacher=r.buildDocumentHtml(paper,"teacher","https://ai-hobbiest.github.io/ExamGuru-Quest/");
assert.ok(student.includes("Q39."));
const imageSources=paper.questions.flatMap(q=>(q.images||[]).map(image=>image.src.replace(/^\\.\\//,"")));
assert.equal(imageSources.length,3,"the paper should render its three diagram-based slots");
for(const source of imageSources)assert.ok(student.includes(source),"student paper should render "+source);
assert.ok(!student.includes("Expected answer:"));
assert.ok(teacher.includes("Expected answer:"));
assert.ok(teacher.includes("Marking scheme"));
const paperHistory=[];
for(let attempt=1;attempt<=6;attempt++){
 const recentQuestionIds=paperHistory.slice(-2).flatMap(ids=>ids);
 const next=g.generatePaper(blueprint,bank,{seed:"release-repeat-test-"+attempt,recentQuestionIds});
 assert.equal(g.validatePaper(next,blueprint).valid,true);
 const ids=next.questions.map(q=>q.questionId);
 for(const prior of paperHistory.slice(-2))assert.equal(ids.some(id=>prior.includes(id)),false,"no question may repeat within the previous two attempts");
 paperHistory.push(ids);
}
console.log("Exam Paper Studio release passed: 39-question/80-mark blueprint, 117-question pool, minimum three eligible candidates per slot, six consecutive repeat-resistant papers, section/unit/competency totals, all internal choices, diagrams, and student/teacher renderer separation.");
