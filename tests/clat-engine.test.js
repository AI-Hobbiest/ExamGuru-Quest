"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const engine=require("../js/clat-engine.js");
const library=JSON.parse(fs.readFileSync("data/clat/model-papers.json","utf8"));
assert.equal(library.kind,"clat-model-paper-library");
assert.equal(library.examId,"clat-ug-2027");
assert.equal(engine.durationMinutes,120);
assert.equal(engine.negativeMark,-0.25);
assert.equal(engine.sections.length,5);
assert.equal(typeof engine.validateLibrary,"function");
assert.deepEqual(engine.sections.map(s=>s.target),[24,30,30,24,12]);
assert.equal(library.papers.length,8);
for(const paper of library.papers){
 const result=engine.validatePaper(paper);
 assert.equal(result.valid,true,result.errors.join("; "));
 if(paper.durationMinutes===25){
  assert.equal(result.totalQuestions,25);
  const strict=engine.validatePaper(paper,{strictCLAT:true});
  assert.equal(strict.valid,false,"Short diagnostics must never pass as full CLAT papers");
  assert.ok(strict.errors.some(message=>message.includes("exactly 120 questions")));
  assert.deepEqual(Object.values(result.counts),[5,5,5,5,5]);
 }else{
  assert.equal(result.totalQuestions,120);
  const strict=engine.validatePaper(paper,{strictCLAT:true});
  assert.equal(strict.valid,true,strict.errors.join("; "));
  assert.deepEqual(Object.values(result.counts),[24,30,30,24,12]);
 }
}
const paper=library.papers[0],questions=paper.questions.slice(0,4);
const answers={
 [questions[0].questionId]:questions[0].correctOptionId,
 [questions[1].questionId]:questions[1].correctOptionId,
 [questions[2].questionId]:"not-the-correct-option"
};
const scored=engine.score(questions,answers);
assert.equal(scored.correct,2);
assert.equal(scored.wrong,1);
assert.equal(scored.unanswered,1);
assert.equal(scored.marks,1.75);
assert.equal(scored.accuracy,66.7);
const attempt=engine.createAttempt(paper,{studentId:"clat-test-student"});
assert.equal(attempt.durationSeconds,1500);
assert.equal(attempt.paperSnapshot.paperId,paper.paperId);
attempt.answers=answers;
const completed=engine.finalizeAttempt(attempt,"2026-11-08T12:00:00.000Z");
assert.equal(completed.status,"submitted");
assert.equal(completed.score.marks,1.75);
assert.equal(completed.sectionScores.length,5);
assert.equal(engine.formatDuration(1500),"00:25:00");
const invalid=JSON.parse(JSON.stringify(paper));invalid.questions[0].correctOptionId="missing";
assert.equal(engine.validatePaper(invalid).valid,false);
console.log("CLAT engine tests passed: model paper validation, five-section scoring, negative marking, timing and frozen attempt history.");
