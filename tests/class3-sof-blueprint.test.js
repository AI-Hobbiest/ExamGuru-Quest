"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const blueprint = JSON.parse(fs.readFileSync("data/sof-blueprints/class-3-imo-level-1.json", "utf8"));
assert.equal(blueprint.kind, "sof-olympiad-blueprint");
assert.equal(blueprint.classId, "3");
assert.equal(blueprint.level, "Level 1");
assert.equal(blueprint.durationSeconds, 3600);
assert.equal(blueprint.totalQuestions, 35);
assert.equal(blueprint.totalMarks, 40);
assert.deepEqual(blueprint.sections.map(section => [
  section.id, section.questionCount, section.marksPerQuestion, section.maxMarks
]), [
  ["logical-reasoning", 10, 1, 10],
  ["mathematical-reasoning", 10, 1, 10],
  ["everyday-mathematics", 10, 1, 10],
  ["achievers", 5, 2, 10]
]);
assert.equal(blueprint.sections.reduce((sum, section) => sum + section.questionCount, 0), 35);
assert.equal(blueprint.sections.reduce((sum, section) => sum + section.maxMarks, 0), 40);
for (const section of blueprint.sections) {
  assert.equal(Object.values(section.originQuotas).reduce((sum, count) => sum + count, 0), section.questionCount,
    section.title + " origin quotas sum to its question count");
}
assert.deepEqual(blueprint.syllabusCoverage.quotas, {
  currentClassNonAchievers: 18,
  previousClassNonAchievers: 12,
  currentClassAchievers: 5
});
assert.deepEqual(blueprint.sections.map(section => section.originQuotas), [
  {"current-class":6,"previous-class":4},
  {"current-class":6,"previous-class":4},
  {"current-class":6,"previous-class":4},
  {"current-class":5}
]);
assert.ok(blueprint.sections.at(-1).originQuotas["previous-class"] === undefined,
  "Achievers questions are current-class only");
assert.equal(blueprint.sourceReferences.length, 2);
assert.ok(blueprint.releaseGates.length >= 7);
console.log("Class 3 SOF IMO blueprint checks passed: 35 questions, 40 marks, 60 minutes, official section structure and 60:40 non-Achievers origin quotas.");
