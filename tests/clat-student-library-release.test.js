"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const engine = require("../js/clat-engine.js");

const base = JSON.parse(fs.readFileSync("data/clat/model-papers.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("data/clat/model-papers-batch-02.json", "utf8"));
assert.equal(batch.kind, "clat-model-paper-batch");
assert.equal(batch.releaseType, "practice-pilot");
assert.deepEqual(batch.papers.map(p => p.paperNumber), [7,8,9,10]);

for (const paper of batch.papers) {
  assert.equal(paper.status, "practice-pilot");
  assert.equal(paper.durationMinutes, 120);
  assert.equal(paper.questions.length, 120);
  assert.equal(paper.passages.length, 23);
  const result = engine.validatePaper(paper, { strictCLAT: true });
  assert.equal(result.valid, true, `Paper ${paper.paperNumber}: ${result.errors.join(" | ")}`);
}

const allFullLength = [
  ...base.papers.filter(p => Array.isArray(p.questions) && p.questions.length === 120),
  ...batch.papers
];
const integrity = engine.validateLibrary({ papers: allFullLength }, { expectedPaperCount: 10 });
assert.equal(integrity.valid, true, integrity.errors.join(" | "));
assert.equal(integrity.paperCount, 10);
assert.equal(integrity.questionCount, 1200);
assert.equal(integrity.uniqueQuestionStems, 1200);
assert.equal(integrity.uniquePassages, 229);
console.log("CLAT student-library release passed: Papers 001–010, 1,200 unique questions, 229 unique passages; Papers 007–010 explicitly marked practice-pilot.");
