/* Student attempt experience for parent-assigned MCQ tests.
 * Draft answers are saved locally so an active attempt can resume after refresh.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const params = new URLSearchParams(location.search);
  const assignmentId = params.get("id") || "";
  const draftKey = "eg_assigned_mcq_attempt_v1:" + assignmentId;
  let assignment = null, remaining = 0, timer = null, submitted = false, student = null, answers = {};

  function showStatus(message, tone) {
    const el = $("testStatus");
    el.textContent = message;
    el.className = "test-status" + (tone ? " " + tone : "");
  }
  function readDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      return saved && saved.assignmentId === assignmentId && saved.studentId === student.studentId &&
        saved.answers && typeof saved.answers === "object" ? saved.answers : {};
    } catch (_) { return {}; }
  }
  function collectAnswers() {
    const next = {};
    assignment.questionSnapshot.forEach(q => {
      const selected = Array.from($("testQuestions").querySelectorAll("input[type=radio]:checked")).find(input => input.name === "q-" + q.questionId);
      next[q.questionId] = selected ? selected.value : "";
    });
    answers = next;
    return next;
  }
  function persistDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        assignmentId, studentId: student.studentId, answers: collectAnswers(),
        updatedAt: new Date().toISOString()
      }));
    } catch (_) {
      showStatus("Your browser could not save the answer draft. Keep this page open until you submit.", "error");
    }
    updateProgress();
  }
  function updateProgress() {
    const chosen = Object.values(answers).filter(Boolean).length;
    $("testProgress").textContent = chosen + " / " + assignment.questionCount + " answered";
  }
  function render() {
    $("testTitle").textContent = assignment.title;
    $("testMeta").textContent = assignment.subjectTitle + " · Class " + assignment.classId + " · " +
      assignment.questionCount + " questions · " + (assignment.durationMinutes ? assignment.durationMinutes + " minutes" : "No timer");
    answers = readDraft();
    $("testQuestions").innerHTML = assignment.questionSnapshot.map((q, i) => {
      const options = q.options.map(o => '<label class="test-option"><input type="radio" name="q-' + esc(q.questionId) +
        '" value="' + esc(o.optionId) + '"' + (answers[q.questionId] === o.optionId ? " checked" : "") +
        '><span>' + esc(o.text) + '</span></label>').join("");
      return '<article class="test-question"><h3>Q' + (i + 1) + '. ' + esc(q.prompt) +
        '</h3><div class="test-options">' + options + '</div></article>';
    }).join("");
    $("testAttempt").hidden = false;
    $("testSetup").hidden = true;
    $("testQuestions").querySelectorAll("input[type=radio]").forEach(input => input.addEventListener("change", persistDraft));
    updateProgress();
  }
  function startTimer() {
    clearInterval(timer);
    const active = assignment.attempts.find(x => x.attemptId === assignment.activeAttemptId && x.status === "in-progress");
    if (!active) return;
    const ends = [];
    if (assignment.durationMinutes) ends.push(new Date(active.startedAt).getTime() + assignment.durationMinutes * 60000);
    if (assignment.deadlineAt) ends.push(new Date(assignment.deadlineAt).getTime());
    if (!ends.length) { $("testTimer").textContent = "Untimed"; return; }
    const deadline = Math.min(...ends);
    const tick = () => {
      remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const m = String(Math.floor(remaining / 60)).padStart(2, "0");
      const s = String(remaining % 60).padStart(2, "0");
      $("testTimer").textContent = m + ":" + s;
      if (!remaining) { clearInterval(timer); submit(true); }
    };
    tick();
    if (remaining) timer = setInterval(tick, 1000);
  }
  function submit(auto) {
    if (submitted) return;
    submitted = true;
    clearInterval(timer);
    const submittedAnswers = collectAnswers();
    try {
      const completed = window.C10AssessmentManager.submit(assignment.assignmentId, student.studentId, submittedAnswers);
      try { localStorage.removeItem(draftKey); } catch (_) {}
      assignment = completed;
      $("testAttempt").hidden = true;
      $("testResult").hidden = false;
      const attempt = completed.attempts[completed.attempts.length - 1];
      $("testResultSummary").textContent = (auto ? "Time is up. " : "") + "You answered " +
        attempt.answered + " of " + attempt.total + " questions and scored " + attempt.correct + "/" +
        attempt.total + " (" + attempt.scorePercent + "%).";
      $("testResultNote").textContent = "Your result is saved in this browser and is visible from the Parent/Teacher dashboard on this device.";
    } catch (e) {
      submitted = false;
      showStatus(e.message || "Unable to submit this test.", "error");
    }
  }
  async function init() {
    try {
      student = await window.C10StudentAuth.restoreSession();
      if (!student || student.role !== "student") { location.replace("./index.html"); return; }
      assignment = window.C10AssessmentManager.get(assignmentId);
      if (!assignment || assignment.studentId !== student.studentId) {
        showStatus("This assigned test is not available to the signed-in student.", "error");
        return;
      }
      $("testTitle").textContent = assignment.title;
      $("testMeta").textContent = assignment.subjectTitle + " · Class " + assignment.classId + " · " + assignment.questionCount + " questions";
      const completed = assignment.attempts.filter(x => x.status === "submitted");
      if (completed.length >= assignment.attemptsAllowed) {
        const latest = completed[completed.length - 1];
        $("testSetup").hidden = true;
        $("testResult").hidden = false;
        $("testResultSummary").textContent = "You have already submitted this test. Score: " +
          latest.correct + "/" + latest.total + " (" + latest.scorePercent + "%).";
        $("testResultNote").textContent = "The Parent/Teacher can see this result on the same browser.";
        return;
      }
      if (assignment.deadlineAt && new Date(assignment.deadlineAt).getTime() < Date.now()) {
        showStatus("The deadline for this test has passed.", "error");
        $("startAssignedTest").disabled = true;
        return;
      }
      const active = assignment.attempts.find(x => x.attemptId === assignment.activeAttemptId && x.status === "in-progress");
      $("startAssignedTest").disabled = false;
      $("startAssignedTest").textContent = active ? "Resume test" : "Start test";
      showStatus(active
        ? "An attempt is already in progress. Resume it to continue; saved answers from this browser will be restored."
        : "Assigned by your Parent/Teacher. Your answers will be submitted for automatic MCQ scoring.");
    } catch (e) {
      showStatus(e.message || "Unable to load this assigned test.", "error");
    }
  }
  $("startAssignedTest").addEventListener("click", () => {
    try {
      assignment = window.C10AssessmentManager.start(assignmentId, student.studentId);
      render();
      startTimer();
      showStatus("Test started. You can change your answers until you submit.");
    } catch (e) {
      showStatus(e.message || "Unable to start this test.", "error");
    }
  });
  $("submitAssignedTest").addEventListener("click", () => {
    if (confirm("Submit this test now? You cannot change answers after submission.")) submit(false);
  });
  init();
})();
