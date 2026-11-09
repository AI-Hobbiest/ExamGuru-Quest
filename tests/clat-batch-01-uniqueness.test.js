"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const engine=require("../js/clat-engine.js");
const papers=[1,2,3,4,5].map(n=>JSON.parse(fs.readFileSync(
  "data/clat/drafts/clat-ug27-full-00"+n+".json","utf8"
)));
const result=engine.validateLibrary({papers},{expectedPaperCount:5});
assert.equal(result.valid,true,result.errors.join("\n"));
assert.equal(result.paperCount,5);
assert.equal(result.questionCount,600);
assert.equal(result.uniqueQuestionStems,600);
assert.equal(result.uniquePassages,114);
for(const paper of papers){
  for(const q of paper.questions){
    assert.equal(new Set(q.options.map(o=>o.text.toLowerCase().replace(/\s+/g," ").trim())).size,4,
      "Duplicate option text: "+q.questionId);
  }
}
console.log("CLAT Batch 01 cross-paper integrity passed: 5 papers, 600 unique question stems, 114 unique passages and distinct options.");
