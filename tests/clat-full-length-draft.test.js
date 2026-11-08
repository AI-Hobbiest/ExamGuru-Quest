"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const engine=require("../js/clat-engine.js");
const paper=JSON.parse(fs.readFileSync("data/clat/drafts/clat-ug27-full-001.json","utf8"));
const result=engine.validatePaper(paper,{strictCLAT:true});
assert.equal(result.valid,true,result.errors.join("\n"));
assert.equal(result.totalQuestions,120);
assert.equal(paper.durationMinutes,120);
assert.deepEqual(result.counts,{english:24,"current-affairs":30,legal:30,logical:24,quantitative:12});
assert.equal(paper.passages.length,22);
const caDomains=new Set(paper.passages.filter(p=>p.sectionId==="current-affairs").map(p=>p.domain));
assert.ok(caDomains.size>=4,"Current Affairs must span at least four domains");
assert.equal(new Set(paper.questions.map(q=>q.questionId)).size,120);
assert.equal(new Set(paper.questions.map(q=>q.prompt.toLowerCase().replace(/[^a-z0-9]+/g," ").trim())).size,120);
for(const passage of paper.passages){
  if(passage.sectionId==="current-affairs"){
    assert.ok(passage.sources?.length,"Current-affairs passage must have source metadata: "+passage.passageId);
    assert.ok(passage.asOf,"Current-affairs passage must have an as-of date: "+passage.passageId);
  }
}
for(const question of paper.questions){
  assert.ok(question.explanation && question.explanation.length>=30,"Missing useful explanation: "+question.questionId);
  assert.ok(["easy","moderate","challenging"].includes(question.difficulty));
  assert.ok(question.competency);
}
const answerText=id=>{const q=paper.questions.find(x=>x.questionId===id);return q.options.find(o=>o.optionId===q.correctOptionId).text;};
assert.equal(answerText("clat-ug27-p001-q109"),"₹14.4 lakh");
assert.equal(answerText("clat-ug27-p001-q110"),"₹45 lakh");
assert.equal(answerText("clat-ug27-p001-q111"),"₹6.6 lakh");
assert.equal(answerText("clat-ug27-p001-q112"),"11 million litres");
assert.equal(answerText("clat-ug27-p001-q113"),"A decrease of 0.5 million litres");
assert.equal(answerText("clat-ug27-p001-q114"),"11 million litres");
assert.equal(answerText("clat-ug27-p001-q115"),"50");
assert.equal(answerText("clat-ug27-p001-q116"),"60");
assert.equal(answerText("clat-ug27-p001-q117"),"90");
assert.equal(answerText("clat-ug27-p001-q118"),"64");
assert.equal(answerText("clat-ug27-p001-q119"),"69");
assert.equal(answerText("clat-ug27-p001-q120"),"70.2");
const keyCounts=Object.fromEntries(["o1","o2","o3","o4"].map(k=>[k,paper.questions.filter(q=>q.correctOptionId===k).length]));
assert.deepEqual(keyCounts,{o1:30,o2:30,o3:30,o4:30});
const difficultyCounts=Object.fromEntries(["easy","moderate","challenging"].map(k=>[k,paper.questions.filter(q=>q.difficulty===k).length]));
assert.deepEqual(difficultyCounts,{easy:36,moderate:53,challenging:31});
console.log("CLAT full-length draft validation passed: 120 questions, five sections, passage bands, sourced CA, keys, explanations and difficulty.");
