"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const engine = require("../js/clat-engine.js");

const legacy = [1,2,3,4,5].map(n => JSON.parse(fs.readFileSync(
  `data/clat/drafts/clat-ug27-full-${String(n).padStart(3,"0")}.json`, "utf8"
)));
const rebuilt = [6,7,8,9,10].map(n => JSON.parse(fs.readFileSync(
  `data/clat/rebuilds/clat-ug27-full-${String(n).padStart(3,"0")}-r2.json`, "utf8"
)));
assert.equal(rebuilt.length, 5);

for (const [index, paper] of rebuilt.entries()) {
  const number = index + 6;
  const result = engine.validatePaper(paper, { strictCLAT: true });
  assert.equal(result.valid, true, `Paper ${number}: ${result.errors.join(" | ")}`);
  assert.equal(paper.paperId, `clat-ug27-full-${String(number).padStart(3,"0")}`);
  assert.equal(paper.status, number === 6 ? "practice-pilot" : "draft-unpublished");
  assert.equal(paper.durationMinutes, 120);
  assert.equal(paper.questions.length, 120);
  assert.equal(paper.passages.length, 23);
  assert.deepEqual(result.counts, {
    english: 24, "current-affairs": 30, legal: 30, logical: 24, quantitative: 12
  });

  const passageCounts = Object.fromEntries(
    ["english","current-affairs","legal","logical","quantitative"].map(section =>
      [section, paper.passages.filter(p => p.sectionId === section).length]
    )
  );
  assert.deepEqual(passageCounts, {
    english: 4, "current-affairs": 6, legal: 6, logical: 4, quantitative: 3
  });

  const keyCounts = Object.fromEntries(["o1","o2","o3","o4"].map(k =>
    [k, paper.questions.filter(q => q.correctOptionId === k).length]
  ));
  assert.deepEqual(keyCounts, {o1:30,o2:30,o3:30,o4:30});

  let maxRun = 1, run = 1;
  for (let i = 1; i < paper.questions.length; i++) {
    run = paper.questions[i].correctOptionId === paper.questions[i-1].correctOptionId ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  assert.ok(maxRun <= 4, `Paper ${number}: answer run of ${maxRun}`);

  // Verify the actual displayed answer position, not merely the internal option ID.
  const displayedPositions = [0,0,0,0];
  let visibleRun = 1, maxVisibleRun = 1, previousPosition = -1;
  for (const q of paper.questions) {
    const position = q.options.findIndex(o => o.optionId === q.correctOptionId);
    assert.ok(position >= 0, `${q.questionId}: key does not map to a displayed option`);
    displayedPositions[position]++;
    visibleRun = position === previousPosition ? visibleRun + 1 : 1;
    maxVisibleRun = Math.max(maxVisibleRun, visibleRun);
    previousPosition = position;
  }
  assert.ok(displayedPositions.every(n => n >= 24 && n <= 36),
    `Paper ${number}: displayed answer positions ${displayedPositions.join("/")}`);
  assert.ok(maxVisibleRun <= 4, `Paper ${number}: visible answer-position run of ${maxVisibleRun}`);


  const difficulty = Object.fromEntries(["easy","moderate","challenging"].map(d =>
    [d, paper.questions.filter(q => q.difficulty === d).length]
  ));
  assert.deepEqual(difficulty, {easy:24,moderate:72,challenging:24});

  const ca = paper.passages.filter(p => p.sectionId === "current-affairs");
  assert.ok(new Set(ca.map(p => p.domain)).size >= 4);
  for (const passage of ca) {
    assert.ok(passage.asOf, passage.passageId);
    assert.ok(Array.isArray(passage.sources) && passage.sources.length > 0, passage.passageId);
    for (const source of passage.sources) {
      assert.ok(source.title && source.publisher && source.date && source.url, passage.passageId);
      assert.match(source.url, /^https:\/\//, passage.passageId);
    }
  }

  for (const passage of paper.passages) {
    const words = passage.text.trim().split(/\s+/).length;
    if (passage.sectionId === "quantitative") assert.ok(words >= 70 && words <= 320, `${passage.passageId}: ${words} words`);
    else if (passage.sectionId === "current-affairs") assert.ok(words >= 350 && words <= 450, `${passage.passageId}: ${words} words`);
    else assert.ok(words >= 380 && words <= 520, `${passage.passageId}: ${words} words`);
  }

  const explanations = paper.questions.map(q => q.explanation.trim());
  assert.equal(new Set(explanations).size, 120, `Paper ${number}: repeated explanations`);
  for (const passage of paper.passages) {
    assert.doesNotMatch(passage.text, /\.\.|, ,|;;/, `${passage.passageId}: punctuation anomaly`);
    assert.doesNotMatch(passage.text, /A useful assessment asks who has information|The practical question is whether the arrangement works/,
      `${passage.passageId}: rejected generic template language`);
  }
  for (const q of paper.questions.filter(q => q.sectionId !== "quantitative")) {
    assert.ok(q.options.every(o => o.text.trim().length >= 14), `${q.questionId}: implausibly short verbal option`);
  }
  for (const q of paper.questions) {
    assert.equal(q.options.length, 4, q.questionId);
    assert.equal(new Set(q.options.map(o => o.optionId)).size, 4, q.questionId);
    assert.equal(new Set(q.options.map(o => o.text.trim().toLowerCase())).size, 4, q.questionId);
    assert.ok(q.options.every(o => o.text.trim()), q.questionId);
  }
}

// Independent expected-answer set for all 60 quantitative items in replacement Papers 006–010.
const expectedQT = {
  6:["₹16.8 crore","₹9.6 crore","₹12.72 crore","37.5%","144","12","30","20%","300","432","126","786"],
  7:["252","90","102","534","500 tonnes","17.5 tonnes","240.5 tonnes","22.41 tonnes","4,320 km","27,000 L","₹25.92 lakh","₹49.82 lakh"],
  8:["960 tonnes","504 tonnes","₹1.92 crore","1,524 tonnes","₹9 crore","₹43.2 lakh","₹37.8 lakh","₹8.394 crore","900 units","1,890 units","3,090 units","2,626.5 units"],
  9:["10,800 visitors","4,500 visitors","₹5.22 lakh","₹13.005 lakh","₹9.6 crore","₹3.6 crore","₹3.6 crore","₹4.8 crore","2,160 photographs","9,840 photographs","1,476 photographs","82.176 staff-hours"],
  10:["420 hours","480 hours","192 hours","618 hours","36,000 transactions","480 transactions","2,120 transactions","0.75%","720 alerts","810 alerts","1,926 alerts","3,213 hours"]
};
for (const paper of rebuilt) {
  const qt = paper.questions.filter(q => q.sectionId === "quantitative");
  assert.equal(qt.length, 12);
  assert.deepEqual(
    qt.map(q => q.options.find(o => o.optionId === q.correctOptionId).text),
    expectedQT[paper.paperNumber],
    `Paper ${paper.paperNumber}: independently checked QT keys`
  );
  for (const q of qt) {
    const answer = q.options.find(o => o.optionId === q.correctOptionId).text.toLowerCase();
    const explanation = q.explanation.toLowerCase().replace(/\s+/g," ");
    assert.ok(explanation.includes(answer.toLowerCase()), q.questionId);
  }
}

// Full exact integrity across the original 001–005 papers and replacement 006–010 papers.
const all = [...legacy, ...rebuilt];
const libraryCheck = engine.validateLibrary({ papers: all }, { expectedPaperCount: 10 });
assert.equal(libraryCheck.valid, true, libraryCheck.errors.join(" | "));
assert.equal(libraryCheck.paperCount, 10);
assert.equal(libraryCheck.questionCount, 1200);
assert.equal(libraryCheck.uniqueQuestionStems, 1200);
assert.equal(libraryCheck.uniquePassages, new Set(all.flatMap(p => p.passages.map(x => x.text.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()))).size);

console.log("CLAT replacement validation passed: Papers 006–010, 600 replacement questions, five-section blueprint, passage bands, sourced current affairs, key/difficulty balance, all 60 QT answers, and exact integrity across Papers 001–010.");
