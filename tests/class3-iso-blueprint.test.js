"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const blueprint=JSON.parse(fs.readFileSync("data/sof-blueprints/class-3-iso-level-1.json","utf8"));
assert.equal(blueprint.kind,"sof-olympiad-blueprint");
assert.equal(blueprint.classId,"3");
assert.equal(blueprint.level,"Level 1");
assert.equal(blueprint.durationSeconds,3600);
assert.equal(blueprint.totalQuestions,35);
assert.equal(blueprint.totalMarks,40);
assert.deepEqual(blueprint.sections.map(s=>[s.id,s.questionCount,s.marksPerQuestion,s.maxMarks]),[
 ["logical-reasoning",5,1,5],["science",25,1,25],["achievers",5,2,10]
]);
assert.equal(blueprint.sections.reduce((n,s)=>n+s.questionCount,0),35);
assert.equal(blueprint.sections.reduce((n,s)=>n+s.maxMarks,0),40);
assert.deepEqual(blueprint.syllabusCoverage.quotas,{currentClassNonAchievers:18,previousClassNonAchievers:12,currentClassAchievers:5});
assert.deepEqual(blueprint.sections.map(s=>s.syllabusOriginQuotas),[
 {"current-class":3,"previous-class":2},{"current-class":15,"previous-class":10},{"current-class":5}
]);
for(const section of blueprint.sections)assert.equal(Object.values(section.syllabusOriginQuotas).reduce((n,x)=>n+x,0),section.questionCount);
assert.equal(blueprint.sections.at(-1).syllabusOriginQuotas["previous-class"],undefined);
assert.ok(blueprint.scienceTopics.length>=10);
assert.ok(blueprint.reasoningTopics.length>=10);
assert.ok(blueprint.sourceReferences.some(x=>x.includes("sofworld.org/nso/class-3")));
console.log("Class 3 SOF ISO blueprint checks passed: official 35-question / 40-mark / 60-minute structure, three sections and Level 1 origin quotas.");
