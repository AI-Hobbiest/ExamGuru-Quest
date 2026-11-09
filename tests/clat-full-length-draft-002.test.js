"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const engine=require("../js/clat-engine.js");
const paper=JSON.parse(fs.readFileSync("data/clat/drafts/clat-ug27-full-002.json","utf8"));
const result=engine.validatePaper(paper,{strictCLAT:true});
assert.equal(result.valid,true,result.errors.join("\n"));
assert.equal(result.totalQuestions,120);
assert.equal(paper.durationMinutes,120);
assert.deepEqual(result.counts,{english:24,"current-affairs":30,legal:30,logical:24,quantitative:12});
assert.equal(paper.passages.length,23);
assert.equal(new Set(paper.questions.map(q=>q.questionId)).size,120);
assert.equal(new Set(paper.passages.map(p=>p.passageId)).size,23);
assert.ok(new Set(paper.passages.filter(p=>p.sectionId==="current-affairs").map(p=>p.domain)).size>=4);
for(const q of paper.questions){
  assert.equal(new Set(q.options.map(o=>o.optionId)).size,4);
  assert.ok(q.explanation && q.explanation.trim().length>=30,q.questionId);
}
const keyCounts=Object.fromEntries(["o1","o2","o3","o4"].map(k=>[k,paper.questions.filter(q=>q.correctOptionId===k).length]));
assert.deepEqual(keyCounts,{o1:30,o2:30,o3:30,o4:30});
let run=1;
for(let i=1;i<paper.questions.length;i++){run=paper.questions[i].correctOptionId===paper.questions[i-1].correctOptionId?run+1:1;assert.ok(run<=4,"answer key run exceeds four at "+paper.questions[i].questionId);}
const answer=id=>{const q=paper.questions.find(x=>x.questionId==="clat-ug27-p002-q"+id);return q.options.find(o=>o.optionId===q.correctOptionId).text;};
assert.equal(answer("112"),"It fell short of the target by 270 thousand litres.");
assert.equal(answer("114"),"₹40.5 lakh.");
assert.equal(answer("116"),"Approximately 32.4 trips.");
assert.equal(answer("120"),"₹22.68 lakh.");
console.log("CLAT Paper 002 strict validation passed: 120 questions, 23 passage/data sets, five sections, sourced CA, answer balance, explanations and QT recalculation.");
