"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const pdf=require("../js/clat-pdf.js");
const library=JSON.parse(fs.readFileSync("data/clat/model-papers.json","utf8"));
const batch=JSON.parse(fs.readFileSync("data/clat/model-papers-batch-02.json","utf8"));
const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
const papers=[
  ...library.papers.filter(paper=>paper.questions.length===120),
  ...batch.papers
];
assert.equal(papers.length,10,"ten full-length CLAT practice pilots should be exportable");
for(const paper of papers){
  const html=pdf.buildHtml(paper);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("AI-ENTHUSIAST"));
  assert.ok(html.includes("Answer Recording Sheet"));
  assert.ok(html.includes("Save as PDF"));
  assert.ok(html.includes("Not an official Consortium of NLUs paper"),"PDF must be identified as an independent practice pilot");
  assert.ok(html.includes("120 minutes"));
  assert.ok(!html.includes("correctOptionId"),"the question PDF must not expose answer-key fields");
  assert.ok(!html.includes('class="explanation"'),"the question PDF must not expose explanation blocks");
  assert.ok(!html.includes("answerReview"),"the question PDF must not expose online review UI");
  assert.ok(!html.includes("Submitted"),"the question PDF must not contain attempt results");
  for(const question of paper.questions){
    assert.ok(html.includes(escape(question.prompt)),"missing question prompt: "+question.questionId);
    for(const option of question.options)assert.ok(html.includes(escape(option.text)),"missing option: "+question.questionId);
  }
  for(const passage of paper.passages)assert.ok(html.includes(escape(passage.title)),"missing passage title: "+passage.passageId);

  const keyHtml=pdf.buildAnswerKeyHtml(paper);
  assert.ok(keyHtml.startsWith("<!doctype html>"));
  assert.ok(keyHtml.includes("Answer Key"));
  assert.ok(keyHtml.includes("Correct answer"));
  assert.ok(keyHtml.includes("explanation"));
  assert.ok(keyHtml.includes("Not an official Consortium of NLUs paper"));
  assert.ok(keyHtml.includes("Save as PDF"));
  for(let index=0;index<paper.questions.length;index++){
    const question=paper.questions[index];
    const correctIndex=question.options.findIndex(option=>option.optionId===question.correctOptionId);
    assert.ok(correctIndex>=0,"missing correct option: "+question.questionId);
    const answer=question.options[correctIndex];
    const letter=String.fromCharCode(65+correctIndex);
    assert.ok(keyHtml.includes(escape(question.prompt)),"answer key missing question: "+question.questionId);
    assert.ok(keyHtml.includes(letter+". "+escape(answer.text)),"answer key has wrong displayed option: "+question.questionId);
    assert.ok(keyHtml.includes(escape(question.explanation)),"answer key missing explanation: "+question.questionId);
  }
}
const sample=JSON.parse(JSON.stringify(papers[0]));
sample.title='<script>alert("x")</script> & CLAT';
const safe=pdf.buildHtml(sample);
assert.ok(safe.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; CLAT"));
assert.ok(!safe.includes('<script>alert("x")</script>'));
const safeKey=pdf.buildAnswerKeyHtml(sample);
assert.ok(safeKey.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; CLAT"));
assert.ok(!safeKey.includes('<script>alert("x")</script>'));
assert.equal(typeof pdf.printPaper,"function");
assert.equal(typeof pdf.buildAnswerKeyHtml,"function");
assert.equal(typeof pdf.printAnswerKey,"function");
console.log("CLAT PDF export tests passed: all ten full-length papers have separate question and answer-key PDFs; all displayed answers and explanations are present and escaped.");
