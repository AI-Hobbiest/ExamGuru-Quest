"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const generator=ctx.window.ExamPaperGenerator;
const source=JSON.parse(fs.readFileSync("data/mathematics.json","utf8"));
assert.equal(source.length,14,"Class 10 Mathematics source bank must contain all 14 chapters");
assert.equal(source.reduce((sum,ch)=>sum+(ch.questions||[]).length,0),1400,"Class 10 Mathematics source bank must contain 1,400 MCQs");
const expectedChapters=["real-numbers","polynomials","pair-of-linear-equations-in-two-variables","quadratic-equations","arithmetic-progressions","coordinate-geometry","introduction-to-trigonometry","some-applications-of-trigonometry","circles","areas-related-to-circles","surface-areas-and-volumes","statistics","probability"];\nconst chapterWithoutMcqSlot="triangles";
const profiles=[
 {level:"standard",file:"data/exam-papers/blueprints/class-10-mathematics-standard-2026-27.json"},
 {level:"basic",file:"data/exam-papers/blueprints/class-10-mathematics-basic-2026-27.json"}
];
for(const profile of profiles){
 const full=JSON.parse(fs.readFileSync(profile.file,"utf8"));
 const slots=full.slotPlan.filter(slot=>slot.sectionId==="A"&&slot.allowedTypes.includes("mcq"));
 assert.equal(slots.length,18,profile.level+" must have 18 one-mark MCQ slots in Section A");
 const unitTotals={},competencyTotals={};
 for(const slot of slots){
  unitTotals[slot.unitId]=(unitTotals[slot.unitId]||0)+slot.marks;
  competencyTotals[slot.competency]=(competencyTotals[slot.competency]||0)+slot.marks;
 }
 const sectionA=full.sections.find(section=>section.sectionId==="A");
 const blueprint={...full,status:"ready",totalQuestions:slots.length,totalMarks:slots.reduce((sum,slot)=>sum+slot.marks,0),
  sections:[{...sectionA,questionCount:slots.length,totalMarks:slots.reduce((sum,slot)=>sum+slot.marks,0)}],
  slotPlan:slots,unitMarkTargets:unitTotals,competencyMarksTargets:competencyTotals,markDistribution:{"1":18}};
 const blueprintCheck=generator.validateBlueprint(blueprint);
 assert.equal(blueprintCheck.valid,true,profile.level+": "+blueprintCheck.errors.join(" "));
 const adapted=generator.adaptChapterMcqBank(source,blueprint,{bankVersion:"class-10-mathematics-practice-1400-v1"});
 assert.ok(adapted.questions.length>=1290,profile.level+" imported "+adapted.questions.length+" questions; adapter audit: "+JSON.stringify(adapted.adapterStats));
 assert.equal(adapted.adapterStats.sourceChapterCount,14);
 assert.equal(adapted.adapterStats.excluded.ambiguousChapter,0,"written-answer and case slots must not make MCQ chapters ambiguous");
 assert.equal(adapted.adapterStats.excluded.outOfSummativeScope,source.find(ch=>ch.key===chapterWithoutMcqSlot).questions.length,"Triangle MCQs are not eligible for this MCQ-only paper adapter because the blueprint assesses that chapter in written-response slots.");
 assert.equal(adapted.adapterStats.excluded.unsupportedCompetency,0);
 assert.equal(adapted.adapterStats.excluded.needsReview,0);
 assert.deepEqual(Object.keys(adapted.adapterStats.byChapter).sort(),expectedChapters.slice().sort());\n assert.equal(adapted.adapterStats.byChapter[chapterWithoutMcqSlot],undefined,"Triangle practice MCQs remain in the source practice bank but are not treated as Section A paper candidates.");
 assert.ok(Object.values(adapted.adapterStats.byChapter).every(count=>count>0),"every chapter must contribute source MCQs");
 const coverage=generator.auditSlotCoverage(blueprint,adapted,3);
 assert.equal(coverage.valid,true,profile.level+": "+coverage.errors.join(" "));
 assert.ok(coverage.coverage.every(slot=>slot.eligibleCount>=3));
 const paper=generator.generatePaper(blueprint,adapted,{seed:"math-"+profile.level+"-section-a"});
 assert.equal(generator.validatePaper(paper,blueprint).valid,true);
 assert.equal(paper.totalQuestions,18);
 assert.equal(paper.totalMarks,18);
 assert.equal(new Set(paper.questions.map(question=>question.questionId)).size,18);
 assert.equal(paper.questions.find(question=>question.paperQuestionNumber===13).competency,"application","the trig-application slot should draw from application questions");
 assert.equal(paper.questions.find(question=>question.paperQuestionNumber===6).chapterId,"arithmetic-progressions","the corrected Q06 allocation should map to Algebra");
 assert.equal(paper.questions.find(question=>question.paperQuestionNumber===10).chapterId,"circles");
}
console.log("Mathematics MCQ integration passed: 1,400 source questions checked, 13 chapters mapped to Section A MCQ slots, 100 Triangle MCQs correctly excluded from the MCQ-only paper adapter, duplicate filtering and Standard/Basic Section A paper generation.");
