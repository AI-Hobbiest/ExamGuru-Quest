"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {}, Math, Object, Array, String, Number, TypeError, Error, Set };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/question-bank.js", "utf8"), context, { filename: "js/question-bank.js" });
vm.runInContext(fs.readFileSync("js/olympiad-blueprints.js", "utf8"), context, { filename: "js/olympiad-blueprints.js" });

const raw = JSON.parse(fs.readFileSync("data/class-3-mathematics-sof.json", "utf8"));
const normalized = context.window.C10QuestionBank.normalize(raw, "class-3-mathematics-sof");
const blueprint = context.window.C10OlympiadBlueprints.getBlueprint("sof-imo-class-3-level-1");
const model = context.window.C10OlympiadBlueprints;
const sections = ["Logical Reasoning", "Mathematical Reasoning", "Everyday Mathematics", "Achievers Section"];
assert.equal(normalized.length, 4);
assert.deepEqual(Array.from(normalized, chapter => chapter.section), sections);
assert.deepEqual(Array.from(normalized, chapter => chapter.questions.length), [70, 70, 70, 37]);
assert.equal(normalized.reduce((sum, chapter) => sum + chapter.questions.length, 0), 247);

const normalizedChapters = Array.from(normalized);
const all = normalizedChapters.flatMap(chapter => Array.from(chapter.questions));
assert.equal(new Set(all.map(question => question.id)).size, 247, "question IDs are unique");
assert.equal(new Set(all.map(question => question.questionKey)).size, 247, "normalized question keys are unique");
assert.ok(all.every(question => question.section && question.syllabusTopic && question.syllabusSource),
  "every question records its exam section and topic provenance");
assert.ok(all.every(question => Number.isInteger(question.syllabusClass) && [2, 3].includes(question.syllabusClass)),
  "every question declares a Class 2 or Class 3 syllabus source");
assert.ok(all.every(question => (question.syllabusOrigin === "current-class" && question.syllabusClass === 3) ||
  (question.syllabusOrigin === "previous-class" && question.syllabusClass === 2)),
  "syllabus grade and origin tags agree");
assert.ok(all.every(question => Array.isArray(question.options) && question.options.length === 4 &&
  new Set(question.options).size === 4 && Number.isInteger(question.answer) &&
  question.answer >= 0 && question.answer < 4 && question.explanation && question.explanation.length >= 10),
  "every question has four distinct options, one indexed answer and an explanation");
assert.ok(all.every(question => ["Easy", "Medium", "Hard", "Challenge"].includes(question.difficulty)),
  "difficulty labels use the supported bank vocabulary");
const sectionDifficulty = normalizedChapters.map(chapter => chapter.questions.reduce((counts, question) => {
  counts[question.difficulty]++;
  return counts;
}, { Easy: 0, Medium: 0, Hard: 0, Challenge: 0 }));
assert.deepEqual(sectionDifficulty, [
  { Easy: 31, Medium: 4, Hard: 27, Challenge: 8 },
  { Easy: 33, Medium: 2, Hard: 29, Challenge: 6 },
  { Easy: 25, Medium: 10, Hard: 22, Challenge: 13 },
  { Easy: 0, Medium: 8, Hard: 0, Challenge: 29 }
], "Class 3 IMO sections maintain age-appropriate 50% or higher Hard + Challenge mix");
const totalDifficulty = all.reduce((counts, question) => {
  counts[question.difficulty]++;
  return counts;
}, { Easy: 0, Medium: 0, Hard: 0, Challenge: 0 });
assert.deepEqual(totalDifficulty, { Easy: 89, Medium: 24, Hard: 78, Challenge: 56 },
  "Class 3 IMO aggregate difficulty totals remain stable");
const normalizedStem = value => String(value).toLowerCase().normalize("NFKC")
  .replace(/[’‘]/g, "'").replace(/[0-9,]+/g, "#")
  .replace(/[^a-z#₹]+/g, " ").replace(/\s+/g, " ").trim();
for (const chapter of normalizedChapters) {
  const stems = chapter.questions.map(question => normalizedStem(question.question));
  assert.equal(new Set(stems).size, stems.length, chapter.title + " has no repeated stems after number normalization");
}
const allStems = all.map(question => normalizedStem(question.question));
assert.equal(new Set(allStems).size, allStems.length, "question stems are unique across every exam section");
assert.ok(raw[0].questions.find(question => question.id === "c3imo-lr-c-020").question.includes("3, 4 and 5 straight sides"),
  "the shape-sequence item uses a valid polygon sequence");
const achieverRange = raw[3].questions.find(question => question.id === "c3imo-ach-c-181");
assert.equal(achieverRange.options[achieverRange.answer], "3,266",
  "the Achievers number-range item has one valid matching number");
const sourceBank = JSON.parse(fs.readFileSync("data/class-3-mathematics.json", "utf8"));
const sourceById = new Map(sourceBank.flatMap(chapter => chapter.questions.map(question =>
  [String(question.id), { question, chapter }]
)));
const reused = all.filter(question => question.sourceType === "reused-cbse");
assert.equal(reused.length, 16, "only the explicitly selected 16 qualifying CBSE items are reused");
for (const question of reused) {
  const source = sourceById.get(String(question.sourceQuestionId));
  assert.ok(source, "reused question has a traceable source ID");
  assert.equal(question.sourceBankId, "class-3-mathematics");
  assert.equal(question.question, source.question.question, "reused stem matches the reviewed source");
  assert.equal(question.options[question.answer], source.question.options[source.question.answer],
    "reused keyed answer remains identical to the reviewed source");
  assert.equal(question.explanation, source.question.explanation, "reused explanation matches its source");
}
assert.equal(all.filter(question => question.syllabusOrigin === "previous-class").length, 84,
  "previous-class source pool has 28 questions in each non-Achievers section");
assert.equal(all.filter(question => question.syllabusOrigin === "current-class").length, 163,
  "current-class source pool has 42 questions in each non-Achievers section and 37 Achievers questions");
const answerPositions = [0, 0, 0, 0];
raw.flatMap(chapter => chapter.questions).forEach(question => answerPositions[question.answer]++);
assert.ok(Math.max(...answerPositions) - Math.min(...answerPositions) <= 1,
  "correct answer positions are balanced across the bank");

assert.equal(blueprint.classId, "3");
assert.equal(blueprint.subjectId, "mathematics-sof");
assert.equal(blueprint.durationSeconds, 3600);
assert.deepEqual(Array.from(blueprint.sections, section => [
  section.id, section.questionCount, section.marksPerQuestion
]), [
  ["logical-reasoning", 10, 1],
  ["mathematical-reasoning", 10, 1],
  ["everyday-mathematics", 10, 1],
  ["achievers", 5, 2]
]);
assert.equal(blueprint.sections.reduce((sum, section) => sum + section.questionCount, 0), 35);
assert.equal(blueprint.sections.reduce((sum, section) => sum + section.questionCount * section.marksPerQuestion, 0), 40);

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const completed = [];
const paperFingerprints = new Set();
for (let index = 0; index < 50; index++) {
  const recentQuestionIds = completed.slice(-5).flatMap(paper => paper.questions.map(question => question.questionKey));
  const paper = model.buildPaper(normalized, blueprint.id, seeded(1009 + index * 7919), { recentQuestionIds });
  assert.equal(paper.totalQuestions, 35, "every generated paper has 35 questions");
  assert.equal(paper.maxMarks, 40, "every generated paper totals 40 marks");
  assert.equal(paper.durationSeconds, 3600, "every generated paper is 60 minutes");
  assert.deepEqual(Array.from(paper.sections, section => section.questionCount), [10, 10, 10, 5]);
  assert.deepEqual(Array.from(paper.sections, section => section.maxMarks), [10, 10, 10, 10]);
  assert.equal(new Set(paper.questions.map(question => question.questionKey)).size, 35,
    "one generated paper never repeats a question");
  const recent = new Set(recentQuestionIds);
  assert.ok(paper.questions.every(question => !recent.has(question.questionKey)),
    "no question appears in any of the preceding five papers");
  const origins = paper.questions.reduce((counts, question) => {
    counts[question.syllabusOrigin] = (counts[question.syllabusOrigin] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(origins, { "current-class": 23, "previous-class": 12 },
    "each paper follows the 60:40 non-Achievers split plus current-class Achievers");
  assert.ok(paper.questions.filter(question => question.examSectionId === "achievers")
    .every(question => question.syllabusOrigin === "current-class" && question.marks === 2),
    "Achievers questions are current-class only and worth two marks");
  const fingerprint = paper.questions.map(question => question.questionKey).sort().join("|");
  assert.ok(!paperFingerprints.has(fingerprint), "each of the 50 generated paper sets is distinct");
  paperFingerprints.add(fingerprint);
  completed.push(paper);
}
const scoreAnswers = completed[0].questions.map((question, index) => ({
  status: "answered",
  isCorrect: question.examSectionId === "achievers" && index === 30
}));
const sectionResults = model.summarizeSections(completed[0].questions, scoreAnswers, completed[0].sections);
assert.equal(sectionResults.length, 4);
assert.equal(sectionResults.reduce((sum, section) => sum + section.maxMarks, 0), 40);
assert.equal(sectionResults.find(section => section.sectionId === "achievers").marksEarned, 2,
  "a correct Achievers response earns two marks");
console.log("Class 3 SOF IMO bank tests passed: 247 question-bank records, 16 traceable CBSE reuse, exact syllabus quotas, 50 distinct papers, five-paper repeat protection and weighted 40-mark scoring.");
