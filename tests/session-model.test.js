"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {}, Date, Math, Number, String, TypeError, JSON, Object, Array, Set };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/olympiad-blueprints.js", "utf8"), context);
vm.runInContext(fs.readFileSync("js/session-model.js", "utf8"), context);
const model = context.window.C10SessionModel;

assert.equal(model.secondsBetween("2026-10-25T10:00:00.000Z", "2026-10-25T10:00:09.999Z"), 9);
assert.equal(model.remainingSeconds("2026-10-25T10:01:00.000Z", Date.parse("2026-10-25T10:00:40.000Z")), 20);
assert.equal(model.remainingSeconds("2026-10-25T10:00:00.000Z", Date.parse("2026-10-25T10:00:01.000Z")), 0);
assert.equal(model.formatDuration(0), "00:00");
assert.equal(model.formatDuration(65), "01:05");
assert.equal(model.formatDuration(3661), "01:01:01");

const answeredCorrect = model.makeAnswerRecord({
  answerRecordId: "ar-1", attemptId: "attempt-1", questionId: "math/algebra/q1",
  selectedOptionId: "b", selectedOptionText: "12", correctOptionId: "b", correctOptionText: "12",
  status: "answered", answeredAt: "2026-10-25T10:00:10.000Z", timeSpentSeconds: 10
});
const answeredWrong = model.makeAnswerRecord({
  answerRecordId: "ar-2", attemptId: "attempt-1", questionId: "math/algebra/q2",
  selectedOptionId: "a", selectedOptionText: "3", correctOptionId: "c", correctOptionText: "4",
  status: "answered", answeredAt: "2026-10-25T10:00:20.000Z", timeSpentSeconds: 10
});
const skipped = model.makeAnswerRecord({
  answerRecordId: "ar-3", attemptId: "attempt-1", questionId: "math/algebra/q3",
  selectedOptionId: null, selectedOptionText: null, correctOptionId: "a", correctOptionText: "1",
  status: "skipped", answeredAt: null, timeSpentSeconds: 5
});
assert.equal(answeredCorrect.isCorrect, true);
assert.equal(answeredWrong.isCorrect, false);
assert.equal(skipped.isCorrect, null);

const attempt = {
  attemptId: "attempt-1", profileId: "profile-1", subjectId: "mathematics", mode: "timed-exam",
  source: { type: "chapter-bank", sourceId: "algebra" }, questionBankVersion: "legacy-bank-v1",
  startedAt: "2026-10-25T10:00:00.000Z", timeLimitSeconds: 600, questions: [
    { questionKey: "math/algebra/q1", id: "q1", options: ["10", "12"], answer: 1, correctOptionId: "b", optionIds: ["a", "b"] },
    { questionKey: "math/algebra/q2", id: "q2", options: ["3", "5", "4"], answer: 2, correctOptionId: "c", optionIds: ["a", "b", "c"] },
    { questionKey: "math/algebra/q3", id: "q3", options: ["1", "2"], answer: 0, correctOptionId: "a", optionIds: ["a", "b"] },
    { questionKey: "math/algebra/q4", id: "q4", options: ["7", "8"], answer: 0, correctOptionId: "x", optionIds: ["x", "y"] }
  ],
  answers: [answeredCorrect, answeredWrong, skipped, null]
};
const result = model.summarize(attempt, { submittedAt: "2026-10-25T10:02:30.000Z", status: "timed-out" });
assert.equal(result.attempt.status, "timed-out");
assert.equal(result.attempt.durationSeconds, 150);
assert.equal(result.attempt.correctCount, 1);
assert.equal(result.attempt.score, 1);
assert.equal(result.attempt.maxScore, 4);
assert.equal(result.attempt.questionCount, 4);
assert.equal(result.attempt.answeredCount, 2);
assert.equal(result.attempt.skippedCount, 1);
assert.equal(result.attempt.unansweredCount, 1);
assert.equal(result.answers[3].status, "unanswered");
assert.deepEqual(Array.from(result.attempt.questionIds), [
  "math/algebra/q1", "math/algebra/q2", "math/algebra/q3", "math/algebra/q4"
]);
assert.throws(() => model.summarize({ questions: [], answers: [] }, { status: "in-progress" }), /Invalid final attempt status/);

const olympiadQuestions = [
  { id: "lr-1", questionKey: "sof/lr/q1", examSectionId: "logical-reasoning", marks: 1, chapterKey: "reasoning", chapterTitle: "Reasoning", options: ["A", "B"], answer: 0, optionIds: ["a", "b"], correctOptionId: "a" },
  { id: "science-1", questionKey: "sof/science/q1", examSectionId: "science", marks: 1, chapterKey: "science", chapterTitle: "Science", options: ["A", "B"], answer: 1, optionIds: ["a", "b"], correctOptionId: "b" },
  { id: "achievers-1", questionKey: "sof/achievers/q1", examSectionId: "achievers", marks: 3, chapterKey: "achievers", chapterTitle: "Achievers", options: ["A", "B"], answer: 0, optionIds: ["a", "b"], correctOptionId: "a" }
];
const olympiadSections = [
  { id: "logical-reasoning", title: "Logical Reasoning", questionCount: 1, marksPerQuestion: 1, maxMarks: 1 },
  { id: "science", title: "Science", questionCount: 1, marksPerQuestion: 1, maxMarks: 1 },
  { id: "achievers", title: "Achievers Section", questionCount: 1, marksPerQuestion: 3, maxMarks: 3 }
];
const weighted = model.summarize({
  attemptId: "sof-attempt", profileId: "profile-1", subjectId: "science-sof", mode: "olympiad-exam",
  examType: "olympiad", examTitle: "SOF ISO Class 6 Level 1", examBlueprintId: "sof-iso-class-6-level-1",
  sectionBlueprint: olympiadSections, startedAt: "2026-10-25T10:00:00.000Z",
  questions: olympiadQuestions,
  answers: [
    { questionId: "sof/lr/q1", status: "answered", isCorrect: true },
    { questionId: "sof/science/q1", status: "answered", isCorrect: false },
    { questionId: "sof/achievers/q1", status: "answered", isCorrect: true }
  ]
}, { submittedAt: "2026-10-25T10:02:00.000Z" });
assert.equal(weighted.attempt.correctCount, 2, "raw correct count remains available for existing dashboards");
assert.equal(weighted.attempt.score, 2, "legacy question score stays backward compatible");
assert.equal(weighted.attempt.maxScore, 3, "legacy maximum question score stays backward compatible");
assert.equal(weighted.attempt.marksEarned, 4, "Achievers correct answer earns three marks");
assert.equal(weighted.attempt.maxMarks, 5);
assert.equal(weighted.attempt.marksAccuracy, 80);
assert.deepEqual(Array.from(weighted.attempt.sectionResults.map(row => row.marksEarned)), [1, 0, 3]);

const engine = fs.readFileSync("js/quiz-engine.js", "utf8");
new Function(engine);
assert.ok(engine.includes('finish("timed-out",false)'), "countdown auto-submits at timeout");
assert.ok(engine.includes("persistCurrentAttempt"), "in-progress sessions are persisted");
assert.ok(engine.includes("restoreAttempt"), "in-progress sessions are restored");
assert.ok(engine.includes("answerRecordIds"), "result model references answer records");
const practice = fs.readFileSync("practice.html", "utf8");
const scripts = ["./js/storage.js", "./js/question-bank.js", "./js/olympiad-blueprints.js", "./js/session-model.js", "./js/quiz-engine.js"].map(src => practice.indexOf(src));
assert.ok(scripts.every(n => n >= 0) && scripts.every((n, i) => i === 0 || scripts[i - 1] < n), "script dependencies load in the required order");

console.log("Session tests passed: timer arithmetic, countdown expiry, duration formatting, result scoring, unanswered tracking, autosave/recovery wiring, and script order.");
