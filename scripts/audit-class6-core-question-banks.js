"use strict";

// Diagnostic audit for the four Class 6 core MCQ banks.
// Run from the repository root: node scripts/audit-class6-core-question-banks.js

const fs = require("node:fs");
const paths = [
  ["English", "data/class-6-english.json"],
  ["Mathematics", "data/class-6-mathematics.json"],
  ["Science", "data/class-6-science.json"],
  ["Social Science", "data/class-6-social-science.json"]
];

const suspectOptions = new Set(["maybe", "no", "none of these", "h", "t", "n/a"]);
const normalise = value => String(value || "")
  .toLowerCase()
  .replace(/[“”‘’"]/g, "")
  .replace(/\s+/g, " ")
  .trim();

let failedRead = false;
for (const [subject, path] of paths) {
  let chapters;
  try {
    chapters = JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    console.error(subject + ": unable to read " + path + " — " + error.message);
    failedRead = true;
    continue;
  }

  const questions = chapters.flatMap(chapter => (chapter.questions || []).map(question => ({
    ...question,
    _chapter: chapter.title,
    _chapterNo: chapter.chapter_no
  })));
  const difficulty = {};
  const exact = new Map();
  const crossChapter = new Map();
  const invalid = [];
  const suspect = [];

  for (const question of questions) {
    const level = question.difficulty || "Unlabelled";
    difficulty[level] = (difficulty[level] || 0) + 1;

    const stem = normalise(question.question);
    if (!exact.has(stem)) exact.set(stem, []);
    exact.get(stem).push(question);

    const chapterTitle = String(question._chapter || "");
    const escapedTitle = chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withoutChapter = normalise(question.question.replace(new RegExp(escapedTitle, "gi"), "[chapter]"));
    if (!crossChapter.has(withoutChapter)) crossChapter.set(withoutChapter, []);
    crossChapter.get(withoutChapter).push(question);

    const options = Array.isArray(question.options) ? question.options : [];
    if (!question.id || !question.question || !question.explanation ||
        options.length !== 4 || new Set(options.map(normalise)).size !== 4 ||
        !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      invalid.push(question.id || "(missing id)");
    }
    if (options.some(option => suspectOptions.has(normalise(option)))) {
      suspect.push(question.id || "(missing id)");
    }
  }

  const duplicateGroups = [...exact.values()].filter(group => group.length > 1);
  const templateGroups = [...crossChapter.values()].filter(group =>
    new Set(group.map(question => question._chapterNo)).size > 1
  );
  const chapterReport = chapters.map(chapter => {
    const rows = chapter.questions || [];
    const stems = new Set(rows.map(question => normalise(question.question)));
    const counts = {};
    rows.forEach(question => {
      const level = question.difficulty || "Unlabelled";
      counts[level] = (counts[level] || 0) + 1;
    });
    return {
      chapter: chapter.title,
      questions: rows.length,
      uniqueLiteralStems: stems.size,
      difficulty: counts
    };
  });

  console.log(JSON.stringify({
    subject,
    chapters: chapters.length,
    total: questions.length,
    difficulty,
    hardPlusChallenge: (difficulty.Hard || 0) + (difficulty.Challenge || 0),
    highDifficultyPercent: questions.length
      ? Math.round(((difficulty.Hard || 0) + (difficulty.Challenge || 0)) / questions.length * 1000) / 10
      : 0,
    exactDuplicateGroups: duplicateGroups.length,
    duplicateCopiesBeyondFirst: duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
    repeatedCrossChapterTemplates: templateGroups.length,
    entriesInRepeatedCrossChapterTemplates: templateGroups.reduce((sum, group) => sum + group.length, 0),
    invalidQuestionRecords: invalid.length,
    suspectDistractorRecords: suspect.length,
    chapterReport
  }, null, 2));
}

if (failedRead) process.exitCode = 1;
