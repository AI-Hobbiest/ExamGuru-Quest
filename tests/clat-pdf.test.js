"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const pdf=require("../js/clat-pdf.js");
const library=JSON.parse(fs.readFileSync("data/clat/model-papers.json","utf8"));
const escape=value=>String(value??"").replace(/[&<>"\']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;","\'\'":"&#39;"}[char]));
const papers=library.papers.filter(paper=>paper.questions.length===120);
assert.equal(papers.length,5,"five full-length CLAT practice pilots should be exportable");
for(const paper of papers){
  const html=pdf.buildHtml(paper);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("AI-ENTHUSIAST"));
  assert.ok(html.includes("Answer Recording Sheet"));
  assert.ok(html.includes("Save as PDF"));
  assert.ok(html.includes("120 minutes"));
  assert.ok(!html.includes("correctOptionId"),"the question PDF must not expose answer keys");
  assert.ok(!html.includes("answerReview"),"the question PDF must not expose online review UI");
  assert.ok(!html.includes("correctOptionId"),"the question PDF must not expose answer-key fields");
  assert.ok(!html.includes("class=\\"explanation\\""),"the question PDF must not expose explanation blocks");
  assert.ok(!html.includes("Submitted"),"the question PDF must not contain attempt results");
  for(const question of paper.questions){
    assert.ok(html.includes(escape(question.prompt)),"missing question prompt: "+question.questionId);
    for(const option of question.options)assert.ok(html.includes(escape(option.text)),"missing option: "+question.questionId);
  }
  for(const passage of paper.passages)assert.ok(html.includes(escape(passage.title)),"missing passage title: "+passage.passageId);
}
const sample=JSON.parse(JSON.stringify(papers[0]));
sample.title='<script>alert("x")</script> & CLAT';
const safe=pdf.buildHtml(sample);
assert.ok(safe.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; CLAT"));
assert.ok(!safe.includes('<script>alert("x")</script>'));
assert.equal(typeof pdf.printPaper,"function");
console.log("CLAT PDF export tests passed: five full-length papers, all passages/questions/options, blank answer sheet, no answer keys or explanations, and escaped content.");
