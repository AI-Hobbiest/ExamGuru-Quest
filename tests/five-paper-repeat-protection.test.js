"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sandbox = { window: {}, console, Date, Math, Set, Map, JSON, Array, Object, Number, String, RegExp, Error };
vm.runInNewContext(fs.readFileSync(path.join(root, "js/exam-paper-generator.js"), "utf8"), sandbox, { filename: "exam-paper-generator.js" });
const engine = sandbox.window.ExamPaperGenerator || sandbox.ExamPaperGenerator;
assert.ok(engine && typeof engine.generateUniquePaper === "function", "Exam paper generator must expose generateUniquePaper");
function runSequence(label, blueprint, mergedBank, count = 50) {
  const coverage = engine.auditSlotCoverage(blueprint, mergedBank, 20);
  const gaps = coverage.coverage.filter(slot => slot.eligibleCount < 20);
  assert.equal(gaps.length, 0, label + " must have at least 20 eligible candidates for every blueprint slot");
  const history = [];
  for (let index = 0; index < count; index++) {
    const previous = history.slice(-5);
    const paper = engine.generateUniquePaper(blueprint, mergedBank, {
      seed: "five-paper-repeat-" + label + "-" + index,
      recentPaperFingerprints: history.map(entry => entry.fingerprint),
      recentQuestionIdSets: previous.map(entry => entry.questionIds),
      uniqueSearchAttempts: 1000
    });
    assert.equal(paper.questions.length, 38, label + " paper " + (index + 1) + " must contain 38 questions");
    assert.equal(paper.repeatProtection.appliedWindow, previous.length, label + " paper " + (index + 1) + " must apply the full available five-paper window");
    const ids = paper.questions.map(question => question.questionId);
    assert.equal(new Set(ids).size, ids.length, label + " paper " + (index + 1) + " must contain unique question IDs");
    for (const prior of previous) {
      const priorIds = new Set(prior.questionIds);
      assert.deepEqual(ids.filter(id => priorIds.has(id)), [], label + " must not repeat any format from the previous five papers");
    }
    assert.ok(paper.paperFingerprint, label + " paper must have a fingerprint");
    history.push({ fingerprint: paper.paperFingerprint, questionIds: ids });
  }
  assert.equal(new Set(history.map(entry => entry.fingerprint)).size, count, label + " must produce distinct paper combinations");
  return { label, papers: count, slotCount: coverage.coverage.length, bankQuestions: mergedBank.questions.length, fivePaperAllFormatRepeat: "passed" };
}
const mathBase = readJson("data/exam-papers/question-banks/class-10-mathematics-2026-27-v1.json");
const mathSource = readJson("data/mathematics.json");
const mathProfiles = [
  readJson("data/exam-papers/blueprints/class-10-mathematics-standard-2026-27.json"),
  readJson("data/exam-papers/blueprints/class-10-mathematics-basic-2026-27.json")
];
const results = [];
for (const blueprint of mathProfiles) {
  const merged = engine.mergeQuestionBanks(mathBase, mathSource, blueprint, { minimumCandidatesPerSlot: 20 });
  results.push(runSequence(blueprint.profileId || blueprint.assessmentLevel || "Mathematics", blueprint, merged.bank));
}
const scienceSourcePath = path.join(root, "_site/data/science.json");
if (!fs.existsSync(scienceSourcePath)) execFileSync(process.execPath, [path.join(__dirname, "build-science-bank-fixture.js")], { cwd: root, stdio: "inherit" });
assert.ok(fs.existsSync(scienceSourcePath), "Science MCQ fixture must be built before repeat-protection audit");
const scienceBase = readJson("data/exam-papers/question-banks/class-10-science-2026-27-v1.json");
const scienceSource = JSON.parse(fs.readFileSync(scienceSourcePath, "utf8"));
const scienceBlueprint = readJson("data/exam-papers/blueprints/class-10-science-2026-27.json");
const scienceMerged = engine.mergeQuestionBanks(scienceBase, scienceSource, scienceBlueprint, { minimumCandidatesPerSlot: 20 });
results.push(runSequence("Class 10 Science", scienceBlueprint, scienceMerged.bank));
console.log("Five-paper all-format repeat protection passed:", JSON.stringify(results));
