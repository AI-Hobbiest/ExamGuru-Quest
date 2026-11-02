"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {}, Math, Object, Array, String, Number, TypeError, Error, Set };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/olympiad-blueprints.js", "utf8"), context, { filename: "js/olympiad-blueprints.js" });
const model = context.window.C10OlympiadBlueprints;
const bank = JSON.parse(fs.readFileSync("data/class-6-science-sof.json", "utf8"));
const chapters = bank.map((chapter, chapterIndex) => ({
  ...chapter,
  chapter_no: chapterIndex + 1,
  key: chapter.key,
  questions: chapter.questions.map(question => ({
    ...question,
    questionKey: "class-6-science-sof/" + chapter.key + "/q-" + question.id,
    chapter_no: chapterIndex + 1,
    chapterKey: chapter.key,
    chapterTitle: chapter.title
  }))
}));
const flat = chapters.flatMap(chapter => chapter.questions);
assert.equal(flat.length, 600, "the SOF bank retains all 600 questions");
const counts = Object.fromEntries(["Logical Reasoning", "Science", "Achievers Section"].map(section => [
  section, flat.filter(question => question.section === section).length
]));
assert.deepEqual(counts, { "Logical Reasoning": 50, "Science": 500, "Achievers Section": 50 });

const paper = model.buildPaper(chapters, "sof-iso-class-6-level-1", () => 0.42);
assert.equal(paper.totalQuestions, 50);
assert.equal(paper.durationSeconds, 3600);
assert.equal(paper.maxMarks, 60);
assert.deepEqual(paper.sections.map(section => [section.id, section.questionCount, section.marksPerQuestion, section.maxMarks]), [
  ["logical-reasoning", 10, 1, 10],
  ["science", 35, 1, 35],
  ["achievers", 5, 3, 15]
]);
assert.deepEqual(paper.sections.map(section => paper.questions.filter(question => question.examSectionId === section.id).length), [10, 35, 5]);
assert.equal(new Set(paper.questions.map(question => question.questionKey)).size, 50, "each mock selects distinct questions");
assert.equal(paper.questions[0].examQuestionNumber, 1);
assert.equal(paper.questions[0].sectionQuestionNumber, 1);
assert.ok(paper.questions.filter(question => question.examSectionId === "achievers").every(question => question.marks === 3));
assert.ok(paper.questions.filter(question => question.examSectionId !== "achievers").every(question => question.marks === 1));
const nextPaper = model.buildPaper(chapters, "sof-iso-class-6-level-1", () => 0.42, {
  recentQuestionIds: paper.questions.map(question => question.questionKey)
});
const priorIds = new Set(paper.questions.map(question => question.questionKey));
assert.ok(nextPaper.questions.every(question => !priorIds.has(question.questionKey)),
  "next mock avoids questions from the immediately previous paper while unseen section pools are sufficient");

const answers = paper.questions.map((question, index) => ({
  status: index % 7 === 0 ? "skipped" : index % 3 === 0 ? "unanswered" : "answered",
  isCorrect: index % 3 !== 0 && index % 7 !== 0 && index % 2 === 0
}));
const results = model.summarizeSections(paper.questions, answers, paper.sections);
assert.equal(results.reduce((sum, section) => sum + section.questionCount, 0), 50);
assert.equal(results.reduce((sum, section) => sum + section.maxMarks, 0), 60);
assert.equal(results.reduce((sum, section) => sum + section.marksEarned, 0),
  paper.questions.reduce((sum, question, index) => sum + (answers[index].status === "answered" && answers[index].isCorrect ? question.marks : 0), 0));
assert.ok(results.every(section => section.answeredCount + section.skippedCount + section.unansweredCount === section.questionCount));
assert.throws(() => model.buildPaper(chapters, "unknown"), /Unknown Olympiad blueprint/);
assert.throws(() => model.buildPaper(chapters.slice(0, 1), "sof-iso-class-6-level-1"), /bank has only/);
console.log("Olympiad blueprint tests passed: 600-question pool, 10/35/5 allocation, 60-mark weighting, uniqueness, section scoring and invalid-pool guards.");
