"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const engine = require("../js/clat-engine.js");

const nums = [1,2,3,4,5,6,7,8,9,10];
const papers = nums.map(n => JSON.parse(fs.readFileSync(
  `data/clat/drafts/clat-ug27-full-${String(n).padStart(3,"0")}.json`, "utf8"
)));
const batch = papers.slice(5);
assert.equal(batch.length, 5);

for (const paper of batch) {
  const result = engine.validatePaper(paper, { strictCLAT: true });
  assert.equal(result.valid, true, `${paper.paperId}: ${result.errors.join(" | ")}`);
  assert.equal(paper.status, "draft-unpublished");
  assert.equal(paper.durationMinutes, 120);
  assert.equal(paper.questions.length, 120);
  assert.equal(paper.passages.length, 23);
  assert.deepEqual(result.counts, {
    english: 24, "current-affairs": 30, legal: 30, logical: 24, quantitative: 12
  });

  const keyCounts = Object.fromEntries(["o1","o2","o3","o4"].map(k =>
    [k, paper.questions.filter(q => q.correctOptionId === k).length]
  ));
  assert.deepEqual(keyCounts, {o1:30,o2:30,o3:30,o4:30});

  const difficultyCounts = Object.fromEntries(["easy","moderate","challenging"].map(d =>
    [d, paper.questions.filter(q => q.difficulty === d).length]
  ));
  assert.deepEqual(difficultyCounts, {easy:24,moderate:72,challenging:24});

  for (const p of paper.passages.filter(x => x.sectionId === "current-affairs")) {
    assert.ok(p.asOf, p.passageId);
    assert.ok(p.sources?.length, p.passageId);
    for (const s of p.sources) {
      assert.ok(s.title && s.publisher && s.date, p.passageId);
      assert.match(s.url, /^https:\/\//, p.passageId);
    }
  }
}

// Independent answer-key verification for every quantitative item in Papers 006–010.
const expectedQT = {
  6:["29,900","149,500","11,960","60","₹80 crore","₹28.8 crore","₹15.8 crore","₹88 crore","720","2.83 days","606","₹2,85,000"],
  7:["12,120","9,696","606","1,818","1,080 packs","3,240 packs","486 packs","3,726 packs","186","56","130","69.9%"],
  8:["7,200 tonnes","1,800 tonnes","270 tonnes","1,530 tonnes","360 tonnes","₹384 lakh","₹1,149 lakh","₹3.19 lakh","3,500","140","3,360","40%"],
  9:["₹96,000","₹1,62,000","₹2,12,000","23.6%","₹30 crore","₹9 crore","₹8.6 crore","₹35 crore","40 days","47,040","960","0.8 day"],
  10:["14,000","2,800","11,200","32%","36,000","₹1.62 crore","12,000","40%","84","60","96","42 hours"]
};
for (const paper of batch) {
  const qt = paper.questions.filter(q => q.sectionId === "quantitative");
  assert.equal(qt.length, 12);
  assert.deepEqual(
    qt.map(q => q.options.find(o => o.optionId === q.correctOptionId).text),
    expectedQT[paper.paperNumber],
    `QT keyed answers for Paper ${paper.paperNumber}`
  );
  for (const q of qt) {
    const answer = q.options.find(o => o.optionId === q.correctOptionId).text;
    const normalise = s => s.toLowerCase().replace(/\\bworking\\s+/g," ").replace(/\\s+/g," ").trim();
    assert.ok(normalise(q.explanation).includes(normalise(answer)), q.questionId);
  }
}

// Exact cross-paper integrity over all ten full-length drafts.
const libraryCheck = engine.validateLibrary({ papers }, { expectedPaperCount: 10 });
assert.equal(libraryCheck.valid, true, libraryCheck.errors.join(" | "));
assert.equal(libraryCheck.paperCount, 10);
assert.equal(libraryCheck.questionCount, 1200);
assert.equal(libraryCheck.uniqueQuestionStems, 1200);
assert.equal(libraryCheck.uniquePassages, 229);

console.log("CLAT Batch 02 draft validation passed: Papers 006–010, 600 questions, five-section blueprint, sources, answer/difficulty balance, all 60 QT keys and exact integrity across Papers 001–010.");
