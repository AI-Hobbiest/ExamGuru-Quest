"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {}, Math, Object, Array, String, Number, TypeError, Error, Set };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/olympiad-blueprints.js", "utf8"), context, { filename: "js/olympiad-blueprints.js" });
const model = context.window.C10OlympiadBlueprints;

function loadBank(file, bankId) {
  const bank = JSON.parse(fs.readFileSync(file, "utf8"));
  const chapters = bank.map((chapter, chapterIndex) => ({
    ...chapter,
    chapter_no: chapter.chapter_no || chapterIndex + 1,
    key: chapter.key,
    questions: chapter.questions.map(question => ({
      ...question,
      questionKey: bankId + "/" + chapter.key + "/q-" + question.id,
      chapter_no: chapter.chapter_no || chapterIndex + 1,
      chapterKey: chapter.key,
      chapterTitle: chapter.title
    }))
  }));
  return { bank, chapters, flat: chapters.flatMap(chapter => chapter.questions) };
}
function sectionCounts(flat) {
  return Object.fromEntries([...new Set(flat.map(question => question.section))].map(section => [
    section, flat.filter(question => question.section === section).length
  ]));
}
function verifyPaper(chapters, blueprintId, expectedSections, expectedQuestions = 50) {
  const paper = model.buildPaper(chapters, blueprintId, () => 0.42);
  assert.equal(paper.totalQuestions, expectedQuestions, blueprintId + " question count");
  assert.equal(paper.durationSeconds, 3600, blueprintId + " duration");
  assert.equal(paper.maxMarks, 60, blueprintId + " maximum marks");
  assert.deepEqual(
    JSON.parse(JSON.stringify(paper.sections.map(section => [section.id, section.questionCount, section.marksPerQuestion, section.maxMarks]))),
    expectedSections,
    blueprintId + " published section quotas and marks"
  );
  assert.equal(new Set(paper.questions.map(question => question.questionKey)).size, expectedQuestions,
    blueprintId + " selects distinct questions");
  assert.equal(paper.questions[0].examQuestionNumber, 1);
  assert.equal(paper.questions[0].sectionQuestionNumber, 1);
  const nextPaper = model.buildPaper(chapters, blueprintId, () => 0.42, {
    recentQuestionIds: paper.questions.map(question => question.questionKey)
  });
  const previousIds = new Set(paper.questions.map(question => question.questionKey));
  assert.ok(nextPaper.questions.every(question => !previousIds.has(question.questionKey)),
    blueprintId + " avoids the immediately previous paper while unseen section pools are sufficient");
  const answers = paper.questions.map((question, index) => ({
    status: index % 7 === 0 ? "skipped" : index % 3 === 0 ? "unanswered" : "answered",
    isCorrect: index % 3 !== 0 && index % 7 !== 0 && index % 2 === 0
  }));
  const results = model.summarizeSections(paper.questions, answers, paper.sections);
  assert.equal(results.reduce((sum, section) => sum + section.questionCount, 0), expectedQuestions);
  assert.equal(results.reduce((sum, section) => sum + section.maxMarks, 0), 60);
  assert.equal(results.reduce((sum, section) => sum + section.marksEarned, 0),
    paper.questions.reduce((sum, question, index) => sum +
      (answers[index].status === "answered" && answers[index].isCorrect ? question.marks : 0), 0));
  assert.ok(results.every(section => section.answeredCount + section.skippedCount + section.unansweredCount === section.questionCount));
  return paper;
}

const nso = loadBank("data/class-6-science-sof.json", "class-6-science-sof");
assert.equal(nso.flat.length, 600, "the Class 6 SOF Science pool retains all 600 questions");
assert.deepEqual(sectionCounts(nso.flat), {
  "Logical Reasoning": 50, "Science": 500, "Achievers Section": 50
});
verifyPaper(nso.chapters, "sof-iso-class-6-level-1", [
  ["logical-reasoning", 10, 1, 10],
  ["science", 35, 1, 35],
  ["achievers", 5, 3, 15]
]);

const imo = loadBank("data/class-6-mathematics-sof.json", "class-6-mathematics-sof");
assert.equal(imo.flat.length, 550, "the IMO bank retains all 550 questions");
assert.deepEqual(sectionCounts(imo.flat), {
  "Mathematical Reasoning": 300,
  "Everyday Mathematics": 120,
  "Achievers Section": 80,
  "Logical Reasoning": 50
});
const imoPaper = verifyPaper(imo.chapters, "sof-imo-class-6-level-1", [
  ["logical-reasoning", 15, 1, 15],
  ["mathematical-reasoning", 20, 1, 20],
  ["everyday-mathematics", 10, 1, 10],
  ["achievers", 5, 3, 15]
]);
assert.ok(imoPaper.questions.filter(question => question.examSectionId === "achievers").every(question => question.marks === 3));
assert.ok(imoPaper.questions.filter(question => question.examSectionId !== "achievers").every(question => question.marks === 1));
assert.match(model.getBlueprint("sof-imo-class-6-level-1").syllabusCoverageNote, /60% current-class and 40% previous-class/);

const ieo = loadBank("data/class-6-english-sof.json", "class-6-english-sof");
assert.equal(ieo.bank.length, 12, "IEO bank has its eight word/grammar topics plus Reading, mixed practice, Spoken/Written and Achievers sets");
assert.equal(ieo.flat.length, 600, "IEO bank has 600 questions after adding dedicated exam-section pools");
assert.deepEqual(sectionCounts(ieo.flat), {
  "Word and Structure Knowledge": 446,
  "Reading": 50,
  "Spoken and Written Expression": 54,
  "Achievers Section": 50
});
assert.ok(ieo.flat.every(question => question.section), "every IEO question is tagged to an official exam section");
assert.equal(new Set(ieo.flat.map(question => question.id)).size, 600, "IEO question IDs are unique");
assert.equal(new Set(ieo.flat.map(question => question.question.trim().toLowerCase())).size, 600, "IEO question stems are unique");
const ieoPaper = verifyPaper(ieo.chapters, "sof-ieo-class-6-level-1", [
  ["word-structure", 30, 1, 30],
  ["reading", 10, 1, 10],
  ["spoken-written", 5, 1, 5],
  ["achievers", 5, 3, 15]
]);
assert.ok(ieoPaper.questions.filter(question => question.examSectionId === "achievers").every(question => question.marks === 3));
assert.ok(ieoPaper.questions.filter(question => question.examSectionId !== "achievers").every(question => question.marks === 1));

assert.throws(() => model.buildPaper(imo.chapters, "unknown"), /Unknown Olympiad blueprint/);
assert.throws(() => model.buildPaper(ieo.chapters.slice(0, 1), "sof-ieo-class-6-level-1"), /bank has only/);
console.log("Olympiad blueprint tests passed: NSO, IMO and IEO bank inventories, SOF section quotas, 60-mark weighting, no-repeat paper assembly, section scoring and insufficient-pool guards.");
