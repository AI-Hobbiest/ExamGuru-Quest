"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const groups = JSON.parse(fs.readFileSync("data/class-6-mathematics-sof.json", "utf8"));
const questions = groups.flatMap(group => group.questions || []);
const count = questions.reduce((out, q) => {
  out[q.difficulty] = (out[q.difficulty] || 0) + 1;
  return out;
}, {});
assert.equal(questions.length, 635, "Class 6 Mathematics SOF bank must retain 635 questions");
assert.deepEqual(count, { Easy: 96, Medium: 221, Challenge: 91, Hard: 227 });
assert.ok(count.Hard + count.Challenge >= Math.ceil(questions.length * 0.5),
  "At least 50% of the full bank, including previous-class bridge questions, must be Hard or Challenge");
assert.equal(count.Hard + count.Challenge, 318);
assert.equal(new Set(questions.map(q => q.id)).size, questions.length, "Question IDs must be unique");
assert.ok(questions.every(q => Array.isArray(q.options) && q.options.length === 4), "Every MCQ must have four options");
assert.ok(questions.every(q => Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length),
  "Every answer index must point to a valid option");
const challenge = questions.filter(q => q.difficulty === "Challenge");
assert.equal(challenge.length, 91);
assert.ok(challenge.every(q => typeof q.difficultyRationale === "string" && q.difficultyRationale.trim().length >= 25),
  "Every Challenge question must explain why it qualifies for the highest tier");
const core = groups.filter(g => g.questions.some(q => q.syllabusOrigin === "current-class"));
assert.equal(core.length, 11, "All 11 Class 6 IMO syllabus topics must remain represented");
assert.ok(core.every(g => g.questions.filter(q => q.difficulty === "Challenge").length >= 8),
  "Every core topic must include at least eight Challenge questions");
const challengeStems = challenge.map(q => q.question.trim().toLowerCase().replace(/[^a-z0-9]+/g, " "));
assert.equal(new Set(challengeStems).size, challengeStems.length, "Challenge question stems must be unique");
console.log("Class 6 Mathematics SOF quality passed: 635 questions; 318 Hard/Challenge (50.08%); 91 Challenge with rationales; 11 syllabus topics covered.");
