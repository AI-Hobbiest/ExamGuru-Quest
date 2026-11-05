"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = process.cwd();
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function startServer() {
  const server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname); }
    catch { res.writeHead(400).end("Bad request"); return; }
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end("Forbidden"); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end("Not found: " + relative); return; }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function smokeProfile(browser, baseUrl, profileId, expectedTitle) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    // Use the repository's active Class 10 test account to pass the page guard.
    // The app's own student-auth module then validates this session against the
    // published student account data before the exam page becomes available.
    sessionStorage.setItem("c10playground_static_student_v1", JSON.stringify({
      username: "jp10",
      role: "student",
      classId: "10"
    }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("dialog", dialog => dialog.accept());

  await page.goto(baseUrl + "/exam-practice.html?profile=" + encodeURIComponent(profileId), { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const status = document.querySelector("#loadStatus")?.textContent || "";
    return status.includes("Ready:") || status.includes("Unable to prepare");
  });
  const loadStatus = await page.locator("#loadStatus").innerText();
  assert.match(loadStatus, /Ready: 38 questions · 80 marks/, profileId + " should load its approved 38-question, 80-mark profile");
  assert.equal(await page.locator("#profileTitle").innerText(), expectedTitle);

  const selector = page.locator("#profileSelect");
  await assert.equal(await selector.isVisible(), true, "the profile selector should appear when Science, Standard and Basic are enabled");
  const options = await selector.locator("option").allTextContents();
  assert.ok(options.some(text => text.includes("Mathematics Standard (041)")));
  assert.ok(options.some(text => text.includes("Mathematics Basic (241)")));
  assert.ok(options.some(text => text.includes("Science (086)")));
  assert.equal(await selector.inputValue(), profileId);

  // Exercise the real student-page path with five prior complete papers saved in this profile.
  // The sixth paper must honour the same five-paper all-format repeat window used in production.
  await page.evaluate(async profileId => {
    const registry = await (await fetch("./data/exam-papers/profile-registry.json")).json();
    const profile = registry.profiles.find(item => item.profileId === profileId);
    const [blueprint, baseBank, practice] = await Promise.all([
      fetch(profile.blueprintUrl).then(response => response.json()),
      fetch(profile.questionBankUrl).then(response => response.json()),
      profile.practiceBankUrl ? fetch(profile.practiceBankUrl).then(response => response.json()) : Promise.resolve(null)
    ]);
    const engine = window.ExamPaperGenerator;
    const merged = engine.mergeQuestionBanks(baseBank, practice, blueprint, {
      minimumCandidatesPerSlot: profile.minimumCandidatesPerSlot || 20
    });
    const history = [];
    for (let index = 0; index < 5; index++) {
      const paper = engine.generateUniquePaper(blueprint, merged.bank, {
        seed: "browser-five-paper-history-" + profileId + "-" + index,
        recentPaperFingerprints: history.map(item => item.fingerprint),
        recentQuestionIdSets: history.map(item => item.questionIds),
        uniqueSearchAttempts: 1000
      });
      history.push({
        paperId: paper.paperId,
        generatedAt: paper.generatedAt,
        questionIds: paper.questions.flatMap(question => engine.questionContentIds(question)),
        fingerprint: paper.paperFingerprint || engine.paperFingerprint(paper),
        mcqQuestionIds: paper.questions.filter(question => question.type === "mcq").map(question => question.questionId)
      });
    }
    const suffix = "_" + profileId.replace(/[^a-z0-9_-]/gi, "_");
    localStorage.setItem("eg_exam_paper_history_v1" + suffix, JSON.stringify(history));
    return { papers: history.length, uniqueFingerprints: new Set(history.map(item => item.fingerprint)).size };
  }, profileId);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => (document.querySelector("#loadStatus")?.textContent || "").includes("Ready: 38 questions · 80 marks"));
  const seededStatus = await page.locator("#loadStatus").innerText();
  assert.match(seededStatus, /Ready: 38 questions · 80 marks/);

  const start = page.locator("#startBtn");
  assert.equal(await start.isEnabled(), true);
  await start.click();
  await page.locator("#attempt").waitFor({ state: "visible" });
  assert.equal(await page.locator("#questions .exam-question").count(), 38);
  const timer = await page.locator("#timer").innerText();
  assert.match(timer, /^(03:00:00|02:59:[0-5]\d)$/, "the three-hour examination timer should start");
  assert.match(await page.locator("#historyStatus").innerText(), /50-paper repeat protection is active/);
  const repeatProof = await page.evaluate(profileId => {
    const suffix = "_" + profileId.replace(/[^a-z0-9_-]/gi, "_");
    const history = JSON.parse(localStorage.getItem("eg_exam_paper_history_v1" + suffix) || "[]");
    const paper = JSON.parse(localStorage.getItem("eg_exam_active_paper_v1" + suffix) || "null");
    const engine = window.ExamPaperGenerator;
    const currentIds = paper.questions.flatMap(question => engine.questionContentIds(question));
    const prior = history.slice(-6, -1);
    const overlaps = prior.reduce((count, entry) => {
      const ids = new Set(entry.questionIds || []);
      return count + currentIds.filter(id => ids.has(id)).length;
    }, 0);
    return { historyCount: history.length, appliedWindow: paper.repeatProtection?.appliedWindow, overlaps };
  }, profileId);
  assert.equal(repeatProof.historyCount, 6, "the generated paper should be appended to the five pre-existing profile papers");
  assert.equal(repeatProof.appliedWindow, 5, "student paper generation should retain the full five-paper exclusion window");
  assert.equal(repeatProof.overlaps, 0, "the generated paper must not repeat any format from the previous five papers");

  // Answer one objective item.
  await page.locator('input[name="q0"]').first().check();

  // Verify online case-study OR choice, answer persistence and the corresponding
  // alternative answer key in the review screen.
  const caseQuestion = page.locator("#questions .exam-question").nth(35);
  const alternativeChoice = caseQuestion.locator('input[data-subpart-choice="2"][value="alternative"]');
  assert.equal(await alternativeChoice.count(), 1, "Q36 should expose its 2-mark case-study alternative");
  await alternativeChoice.check();
  const alternativePanel = caseQuestion.locator('[data-subpart-panel="2"][data-subpart-variant="alternative"]');
  assert.equal(await alternativePanel.isVisible(), true);
  const altPrompt = await alternativePanel.locator("h4").innerText();
  assert.ok(altPrompt.length > 10, "the alternative prompt must be visible");
  await alternativePanel.locator("textarea").fill("Browser QA response for the selected alternative.");
  assert.equal(await caseQuestion.locator('[data-subpart-panel="2"][data-subpart-variant="main"]').isVisible(), false);

  await page.locator("#submitBtn").click();
  await page.locator("#review").waitFor({ state: "visible" });
  const review = await page.locator("#reviewAnswers").innerText();
  assert.ok(review.includes(altPrompt), "review must show the selected alternative prompt");
  assert.ok(review.includes("Browser QA response for the selected alternative."), "review must retain the student's alternative answer");
  assert.ok(!pageErrors.length, "browser page errors: " + pageErrors.join(" | "));
  await context.close();
  return { profileId, title: expectedTitle, questionCount: 38, totalMarks: 80, caseStudyAlternative: "passed", submitReview: "passed" };
}


async function smokeClass6ExamIsolation(browser, baseUrl) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    sessionStorage.setItem("c10playground_static_student_v1", JSON.stringify({
      username: "c6pilot",
      role: "student",
      classId: "6"
    }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(baseUrl + "/dashboard.html", { waitUntil: "networkidle" });
  await page.locator("#c10Sidebar").waitFor({ state: "visible" });
  assert.equal(await page.locator('#c10Sidebar a[href="./exam-practice.html"]').count(), 0,
    "Class 6 navigation must not offer the Class 10 full-paper exam route");

  await page.goto(baseUrl + "/exam-practice.html?profile=class-10-mathematics-standard-2026-27", { waitUntil: "networkidle" });
  await page.waitForFunction(() => (document.querySelector("#loadStatus")?.textContent || "").includes("Full-paper exam mode is not configured for Class 6"));
  const blockedStatus = await page.locator("#loadStatus").innerText();
  assert.match(blockedStatus, /not configured for Class 6/);
  assert.ok(!blockedStatus.includes("Mathematics Standard") && !blockedStatus.includes("Mathematics Basic"),
    "Class 6 must not be shown a Class 10 Mathematics profile");

  await page.goto(baseUrl + "/practice.html?subject=science-sof", { waitUntil: "networkidle" });
  const olympiadButton = page.locator("#olympiadModeBtn");
  await olympiadButton.waitFor({ state: "visible" });
  assert.ok(await olympiadButton.isVisible(), "Class 6 should retain its own subject-level SOF mock entry");
  await olympiadButton.click();
  await page.locator("#olympiadBlueprintPanel").waitFor({ state: "visible" });
  const title = await page.locator("#olympiadBlueprintTitle").innerText();
  assert.ok(title.includes("Class 6"), "Class 6 SOF exam mode must load a Class 6 blueprint");
  assert.ok(!pageErrors.length, "Class 6 browser page errors: " + pageErrors.join(" | "));
  await context.close();
  return { classId: "6", class10PaperRoute: "blocked", class6Olympiad: "available" };
}
(async () => {
  const server = await startServer();
  const address = server.address();
  const baseUrl = "http://127.0.0.1:" + address.port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    results.push(await smokeProfile(browser, baseUrl, "class-10-mathematics-standard-2026-27", "Class 10 · Mathematics Standard (041)"));
    results.push(await smokeProfile(browser, baseUrl, "class-10-mathematics-basic-2026-27", "Class 10 · Mathematics Basic (241)"));
    results.push(await smokeClass6ExamIsolation(browser, baseUrl));
    console.log("Mathematics and class-aware exam browser smoke passed: " + JSON.stringify(results));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
