"use strict";
const assert=require("node:assert/strict");
const model=require("../js/clat-dashboard-model.js");
const now=new Date(2026,10,9,12,0,0);
const yesterday=new Date(2026,10,8,12,0,0);
const today=new Date(2026,10,9,12,0,0);
const attempts=[
 {attemptId:"one",paperTitle:"CLAT Practice 1",status:"submitted",startedAt:yesterday.toISOString(),submittedAt:yesterday.toISOString(),score:{marks:88.75,maxMarks:120,correct:90,wrong:5,unanswered:25,attempted:95,accuracy:94.7},sectionScores:[
  {sectionId:"english",title:"English Language",correct:20,wrong:4,unanswered:0,marks:19,maxMarks:24},
  {sectionId:"legal",title:"Legal Reasoning",correct:18,wrong:1,unanswered:1,marks:17.75,maxMarks:20}
 ]},
 {attemptId:"two",paperTitle:"CLAT Practice 2",status:"submitted",startedAt:today.toISOString(),submittedAt:today.toISOString(),score:{marks:97.5,maxMarks:120,correct:100,wrong:10,unanswered:10,attempted:110,accuracy:90.9},sectionScores:[
  {sectionId:"english",title:"English Language",correct:22,wrong:2,unanswered:0,marks:21.5,maxMarks:24},
  {sectionId:"legal",title:"Legal Reasoning",correct:20,wrong:2,unanswered:0,marks:19.5,maxMarks:22},
  {sectionId:"quantitative",title:"Quantitative Techniques",correct:10,wrong:1,unanswered:1,marks:9.75,maxMarks:12}
 ]}
];
assert.equal(model.xpFor(attempts[0]),205,"paper completion, correct answers and accuracy bonuses award XP");
assert.equal(model.xpFor({status:"in-progress",score:attempts[0].score}),0,"unfinished papers do not award XP");
const summary=model.build(attempts,now);
assert.equal(summary.attempts.length,2);
assert.equal(summary.xp,430);
assert.equal(summary.level.level,3);
assert.equal(summary.level.title,"Concept Builder");
assert.equal(summary.level.progressPercent,90);
assert.equal(summary.streak.current,2);
assert.equal(summary.streak.best,2);
assert.equal(summary.bestAccuracy,94.7);
assert.equal(summary.sectionStats.find(s=>s.id==="english").correct,42);
assert.equal(summary.sectionStats.find(s=>s.id==="english").wrong,6);
assert.equal(summary.sectionStats.find(s=>s.id==="quantitative").tests,1);
assert.equal(summary.recent.length,2);
assert.ok(summary.badges.some(b=>b.id==="first-paper"&&b.earned));
assert.ok(summary.badges.some(b=>b.id==="five-sections"&&!b.earned));
const empty=model.build([],now);
assert.equal(empty.xp,0);
assert.equal(empty.level.level,1);
assert.equal(empty.attempts.length,0);
assert.equal(empty.streak.current,0);
console.log("CLAT dashboard model tests passed: per-paper XP, accuracy bonuses, level progress, consecutive-day streaks, five-section aggregation, badges and empty state.");
