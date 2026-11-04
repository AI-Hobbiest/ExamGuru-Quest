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
 assert.equal(blueprint.status,"ready","Mathematics release blueprint must be ready after full integrated-pool QA.");
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
 assert.deepEqual(blueprint.difficultyTargets,profile.level==="standard"?{easy:5,medium:29,hard:4}:{easy:8,medium:29,hard:1});
 assert.deepEqual(blueprint.mcqPracticeExclusions,["triangles"],"Triangle MCQs stay in practice but outside the exam MCQ adapter.");
 const check=generator.validateBlueprint(blueprint);
 assert.equal(check.valid,true,check.errors.join(" "));
 assert.equal(check.readyForGeneration,true);
 assert.equal(blueprint.slotPlan.filter(slot=>slot.requiresInternalChoice).length,6);
 assert.equal(blueprint.slotPlan.filter(slot=>Array.isArray(slot.requiresPartInternalChoiceMarks)&&slot.requiresPartInternalChoiceMarks.includes(2)).length,3);
}
const registry=JSON.parse(fs.readFileSync("data/exam-papers/profile-registry.json","utf8"));
const mathProfiles=registry.profiles.filter(profile=>String(profile.profileId||"").startsWith("class-10-mathematics-"));
assert.equal(mathProfiles.length,2);
assert.ok(mathProfiles.every(profile=>profile.enabled===true),"Both Mathematics exam profiles must be published after release QA.");
assert.equal(mathProfiles[0].questionBankUrl,mathProfiles[1].questionBankUrl,"Standard and Basic should use one shared Math question pool.");
assert.ok(mathProfiles.every(profile=>profile.practiceBankUrl==="./data/mathematics.json"));
assert.equal(registry.defaultProfileId,"class-10-science-2026-27","Science remains the default profile while Mathematics is added as a selectable option.");
const schema=JSON.parse(fs.readFileSync("data/exam-papers/question-bank.schema.json","utf8"));
assert.equal(schema.properties.classId.type,"string");
assert.equal(schema.properties.subjectId.type,"string");
assert.equal(schema.properties.questions.items.properties.sectionId.type,"string");
console.log("Mathematics blueprint tests passed: Standard/Basic structure, unit weightages, competency targets, all 14 chapters, internal-choice locations, ready blueprints and disabled registry gate.");
