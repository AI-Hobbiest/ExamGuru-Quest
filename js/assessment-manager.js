/* Local-first assessment lifecycle shared by Parent/Teacher, Student and Paper Studio.
 * Assignments are frozen snapshots. Storage is browser-local until the cloud DB phase.
 */
(() => {
  "use strict";
  const KEY = "eg_assessment_assignments_v1";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const makeId = prefix => prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  function readAll() {
    try { const rows = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(rows) ? rows : []; }
    catch (_) { return []; }
  }
  function writeAll(rows) {
    try { localStorage.setItem(KEY, JSON.stringify(rows)); return true; }
    catch (_) { throw new Error("This browser could not save the assessment. Check site storage and retry."); }
  }
  function bankPath(classId, subjectId) {
    const cls = String(classId || "");
    if (!["3", "6", "10"].includes(cls)) throw new Error("Custom MCQ assignments currently support Classes 3, 6 and 10.");
    const subject = String(subjectId || "");
    const allowed = cls === "3" ? ["mathematics", "english"]
      : cls === "6" ? ["science", "science-sof", "mathematics", "mathematics-sof", "english", "english-sof", "social-science"]
      : ["science", "mathematics", "english", "social-science", "hindi"];
    if (!allowed.includes(subject)) throw new Error("This subject is not available for the selected class.");
    return "./data/" + (cls === "10" ? subject : "class-" + cls + "-" + subject) + ".json";
  }
  function normalizeDifficulty(value) {
    const raw = String(value || "medium").toLowerCase();
    if (raw.includes("challenge")) return "challenge";
    if (raw.includes("hard")) return "hard";
    if (raw.includes("easy")) return "easy";
    return "medium";
  }
  function buildQuestionPool(chapters, selectedChapterIds, difficulty) {
    if (!Array.isArray(chapters)) throw new TypeError("Question bank chapters must be an array.");
    const selected = new Set((selectedChapterIds || []).map(String));
    const filterDifficulty = difficulty && difficulty !== "all" ? normalizeDifficulty(difficulty) : "all";
    const pool = [];
    chapters.forEach((chapter, chapterIndex) => {
      const chapterId = String(chapter.key || chapter.chapterId || chapter.chapter_no || chapterIndex + 1);
      if (selected.size && !selected.has(chapterId)) return;
      (chapter.questions || []).forEach((q, questionIndex) => {
        const options = Array.isArray(q.options) ? q.options.map((option, index) => ({
          optionId: String(option && option.optionId || String.fromCharCode(97 + index)),
          text: String(option && typeof option === "object" ? option.text || "" : option || "").trim()
        })) : [];
        const answerIndex = Number(q.answer);
        const correctOptionId = q.correctOptionId != null ? String(q.correctOptionId)
          : Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < options.length ? options[answerIndex].optionId : "";
        if (options.length < 2 || options.some(o => !o.text) || !options.some(o => o.optionId === correctOptionId)) return;
        const qDifficulty = normalizeDifficulty(q.difficulty);
        if (filterDifficulty !== "all" && qDifficulty !== filterDifficulty) return;
        const questionId = String(q.questionId || q.id || (chapterId + "-q" + (questionIndex + 1)));
        pool.push({
          questionId, chapterId, chapterTitle: String(chapter.title || chapterId),
          prompt: String(q.question || q.prompt || "").trim(), options,
          correctOptionId, explanation: String(q.explanation || ""),
          difficulty: qDifficulty, competency: q.competency || null,
          competencyTagStatus: q.competencyTagStatus || null,
          competencyTagReason: q.competencyTagReason || null,
          competencyTaggerVersion: q.competencyTaggerVersion || null,
          images: Array.isArray(q.images) ? clone(q.images) : []
        });
      });
    });
    return pool.filter(q => q.prompt);
  }
  function selectQuestions(pool, count, random = Math.random) {
    const rows = pool.slice();
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows.slice(0, Math.max(0, Math.floor(Number(count) || 0)));
  }
  function createMcqAssignment(args) {
    const questions = Array.isArray(args.questions) ? clone(args.questions) : [];
    if (!String(args.studentId || "").trim()) throw new Error("A student must be selected before assigning a test.");
    if (!questions.length || questions.some(q => !q.questionId || !q.prompt || !Array.isArray(q.options) || q.options.length < 2 || !q.options.some(o => o.optionId === q.correctOptionId))) {
      throw new Error("The test needs valid MCQs with answer keys.");
    }
    const createdAt = now();
    const assignment = {
      schemaVersion: 1, kind: "assigned-assessment",
      assignmentId: makeId("assignment"), assessmentId: makeId("assessment"),
      title: String(args.title || "Custom MCQ Test").trim(),
      studentId: String(args.studentId), studentName: String(args.studentName || ""),
      parentId: String(args.parentId || ""), createdBy: String(args.createdBy || "parent"),
      classId: String(args.classId), subjectId: String(args.subjectId),
      subjectTitle: String(args.subjectTitle || args.subjectId),
      assessmentType: "mcq-test", deliveryMode: "online",
      status: "assigned", createdAt,
      startsAt: args.startsAt || createdAt, deadlineAt: args.deadlineAt || null,
      durationMinutes: Math.max(0, Math.min(240, Number(args.durationMinutes) || 0)),
      attemptsAllowed: Math.max(1, Math.min(3, Number(args.attemptsAllowed) || 1)),
      questionCount: questions.length, questionSnapshot: questions,
      attempts: [], activeAttemptId: null
    };
    const all = readAll(); all.push(assignment); writeAll(all);
    return clone(assignment);
  }
  function createPaperAssignment(args) {
    const paper = clone(args.paperSnapshot);
    if (!String(args.studentId || "").trim()) throw new Error("A student must be selected before assigning a paper.");
    if (!paper || paper.kind !== "exam-paper-snapshot" || !Array.isArray(paper.questions) || !paper.questions.length) throw new Error("A valid frozen exam paper is required.");
    const createdAt = now();
    const assignment = {
      schemaVersion: 1, kind: "paper-assessment",
      assignmentId: makeId("assignment"), assessmentId: makeId("assessment"),
      title: String(args.title || paper.title || "Exam Paper").trim(),
      studentId: String(args.studentId), studentName: String(args.studentName || ""),
      parentId: String(args.parentId || ""), createdBy: String(args.createdBy || "parent"),
      classId: String(paper.classId), subjectId: String(args.subjectId || "science"),
      subjectTitle: String(args.subjectTitle || "Science"),
      assessmentType: "blueprint-paper", deliveryMode: ["online","printable","hybrid"].includes(args.deliveryMode) ? args.deliveryMode : "printable",
      status: "assigned", createdAt, startsAt: args.startsAt || createdAt, deadlineAt: args.deadlineAt || null,
      attemptsAllowed: Math.max(1, Math.min(3, Number(args.attemptsAllowed) || 1)),
      questionCount: paper.totalQuestions, totalMarks: paper.totalMarks, durationMinutes: paper.durationMinutes,
      paperSnapshot: paper, attempts: [], activeAttemptId: null
    };
    const all = readAll(); all.push(assignment); writeAll(all);
    return clone(assignment);
  }
  function startPaper(assignmentId, studentId) {
    return update(assignmentId, row => {
      if (row.kind !== "paper-assessment") throw new Error("This is not a full examination paper.");
      if (row.studentId !== String(studentId)) throw new Error("This paper is not assigned to the signed-in student.");
      if (row.deliveryMode === "printable") throw new Error("This paper is assigned for handwritten completion. Use the PDF/print view instead.");
      if (row.status === "cancelled") throw new Error("This assignment has been cancelled.");
      if (row.startsAt && new Date(row.startsAt).getTime() > Date.now()) throw new Error("This paper is not available yet.");
      const active = row.attempts.find(x => x.attemptId === row.activeAttemptId && x.status === "in-progress");
      if (active) return;
      if (row.deadlineAt && new Date(row.deadlineAt).getTime() < Date.now()) throw new Error("The deadline for this paper has passed.");
      const completed = row.attempts.filter(x => x.status === "submitted").length;
      if (completed >= row.attemptsAllowed) throw new Error("The allowed number of attempts has been used.");
      const attempt = { attemptId: makeId("attempt"), startedAt: now(), status: "in-progress", answers: {} };
      row.attempts.push(attempt); row.activeAttemptId = attempt.attemptId; row.status = "in-progress";
    });
  }
  function submitPaper(assignmentId, studentId, answers) {
    return update(assignmentId, row => {
      if (row.kind !== "paper-assessment") throw new Error("This is not a full examination paper.");
      if (row.studentId !== String(studentId)) throw new Error("This paper is not assigned to the signed-in student.");
      const attempt = row.attempts.find(x => x.attemptId === row.activeAttemptId && x.status === "in-progress");
      if (!attempt) throw new Error("There is no active paper attempt to submit.");
      attempt.answers = clone(answers || {}); attempt.submittedAt = now(); attempt.status = "submitted";
      const questions = row.paperSnapshot.questions || [];
      let mcqTotal = 0, mcqCorrect = 0, answered = 0, mcqAnsweredCount = 0;
      let mcqMarksEarned = 0, mcqMaxMarks = 0;
      questions.forEach((question,index) => {
        if (question.type === "mcq" || question.type === "assertion-reason") {
          mcqTotal++;
          const marks = Math.max(0, Number(question.marks) || 1);
          mcqMaxMarks += marks;
          const response = attempt.answers[index];
          if (response && response.optionId) { answered++; mcqAnsweredCount++; }
          if (response && response.optionId === question.correctOptionId) {
            mcqCorrect++;
            mcqMarksEarned += marks;
          }
        } else {
          const response = attempt.answers[index];
          if (response && (response.optionId || (response.text || []).some(value => String(value || "").trim()))) answered++;
        }
      });
      attempt.answered = answered;
      attempt.mcqCorrect = mcqCorrect;
      attempt.mcqTotal = mcqTotal;
      attempt.mcqAnsweredCount = mcqAnsweredCount;
      attempt.mcqMarksEarned = mcqMarksEarned;
      attempt.mcqMaxMarks = mcqMaxMarks;
      attempt.hasWrittenResponses = questions.some(question => !["mcq","assertion-reason"].includes(question.type));
      attempt.evaluationStatus = attempt.hasWrittenResponses ? "pending-manual-review" : "auto-scored";
      attempt.manualReviewNote = attempt.hasWrittenResponses ? "Descriptive answers require handwritten or teacher evaluation." : null;
      row.status = "completed"; row.activeAttemptId = null; row.updatedAt = attempt.submittedAt;
    });
  }
  function recordPaperEvaluation(assignmentId, parentId, score, feedback) {
    return update(assignmentId, row => {
      if (row.kind !== "paper-assessment") throw new Error("Only full examination papers support manual paper evaluation.");
      if (row.parentId !== String(parentId)) throw new Error("This parent is not authorised to evaluate this assignment.");
      if (row.activeAttemptId) throw new Error("The student has an examination attempt in progress. Submit it before evaluation.");
      const maximum = Number(row.totalMarks);
      if (score == null || String(score).trim() === "") throw new Error("Enter the marks awarded before saving the result.");
      const awarded = Number(score);
      if (!Number.isFinite(awarded) || awarded < 0 || awarded > maximum) throw new Error("Enter marks from 0 to " + maximum + ".");
      let attempt = row.attempts.slice().reverse().find(item => item.status === "submitted");
      if (!attempt) {
        attempt = { attemptId: makeId("offline-review"), startedAt: null, submittedAt: now(), status: "submitted", answers: {}, completionMode: "handwritten-offline" };
        row.attempts.push(attempt);
      }
      attempt.manualScore = awarded;
      attempt.maxScore = maximum;
      attempt.scorePercent = maximum ? Math.round(awarded / maximum * 100) : 0;
      attempt.manualFeedback = String(feedback || "").trim().slice(0, 2000);
      attempt.evaluationStatus = "evaluated";
      attempt.evaluatedAt = now();
      attempt.evaluatedBy = String(parentId);
      row.status = "evaluated";
      row.updatedAt = attempt.evaluatedAt;
    });
  }
  function analyticsAttemptsForStudent(studentId) {
    const targetId = String(studentId || "");
    if (!targetId) return [];
    const result = [];
    readAll().forEach(assignment => {
      if (assignment.studentId !== targetId || assignment.status === "cancelled") return;
      const attempts = Array.isArray(assignment.attempts) ? assignment.attempts : [];
      attempts.forEach(attempt => {
        if (!attempt || attempt.status !== "submitted") return;
        const base = {
          attemptId: "assigned-" + assignment.assignmentId + "-" + attempt.attemptId,
          assignmentId: assignment.assignmentId,
          assessmentTitle: assignment.title,
          assessmentSource: "assigned",
          assessmentKind: assignment.kind,
          subjectId: String(assignment.subjectId || ""),
          subjectTitle: String(assignment.subjectTitle || assignment.subjectId || "Assigned assessment"),
          classId: String(assignment.classId || ""),
          mode: assignment.kind === "paper-assessment" ? "assigned-paper" : "assigned-test",
          startedAt: attempt.startedAt || assignment.createdAt || null,
          submittedAt: attempt.submittedAt || attempt.evaluatedAt || assignment.updatedAt || assignment.createdAt,
          status: "submitted"
        };

        if (assignment.kind === "assigned-assessment") {
          const questions = Array.isArray(assignment.questionSnapshot) ? assignment.questionSnapshot : [];
          if (!questions.length) return;
          const responses = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
          let correct = 0, answered = 0;
          const chapters = new Map();
          questions.forEach(question => {
            const questionId = String(question.questionId || "");
            const selected = responses[questionId] == null ? "" : String(responses[questionId]);
            const isAnswered = !!selected;
            const isCorrect = isAnswered && selected === String(question.correctOptionId || "");
            if (isAnswered) answered++;
            if (isCorrect) correct++;
            const chapterId = String(question.chapterId || question.chapterKey || question.chapterTitle || "");
            if (chapterId) {
              const chapter = chapters.get(chapterId) || {
                chapterId,
                chapterTitle: String(question.chapterTitle || chapterId),
                questionCount: 0,
                answeredCount: 0,
                correctCount: 0,
                skippedCount: 0,
                unansweredCount: 0
              };
              chapter.questionCount++;
              if (isAnswered) chapter.answeredCount++;
              else chapter.unansweredCount++;
              if (isCorrect) chapter.correctCount++;
              chapters.set(chapterId, chapter);
            }
          });
          const total = questions.length;
          const chapterResults = Array.from(chapters.values()).map(chapter => ({
            ...chapter,
            accuracy: chapter.questionCount ? Math.round(chapter.correctCount / chapter.questionCount * 100) : 0
          }));
          result.push({
            ...base,
            score: correct,
            maxScore: total,
            correctCount: correct,
            questionCount: total,
            answeredCount: answered,
            xpCorrectCount: correct,
            accuracyCount: correct,
            accuracyTotal: total,
            chapterResults
          });
          return;
        }

        if (assignment.kind !== "paper-assessment") return;
        const paperQuestions = assignment.paperSnapshot && Array.isArray(assignment.paperSnapshot.questions)
          ? assignment.paperSnapshot.questions : [];
        const objectiveQuestions = paperQuestions.filter(question =>
          question.type === "mcq" || question.type === "assertion-reason");
        let calculatedCorrect = 0, calculatedAnswered = 0;
        let calculatedMarks = 0, calculatedMaxMarks = 0;
        objectiveQuestions.forEach(question => {
          const paperIndex = paperQuestions.indexOf(question);
          const response = attempt.answers && attempt.answers[paperIndex];
          const marks = Math.max(0, Number(question.marks) || 1);
          calculatedMaxMarks += marks;
          if (response && response.optionId) calculatedAnswered++;
          if (response && response.optionId === question.correctOptionId) {
            calculatedCorrect++;
            calculatedMarks += marks;
          }
        });
        const questionCount = Math.max(1, Number(assignment.questionCount) || paperQuestions.length || objectiveQuestions.length);

        if (attempt.evaluationStatus === "evaluated") {
          const score = Number(attempt.manualScore);
          const maximum = Number(attempt.maxScore || assignment.totalMarks);
          if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0) return;
          const equivalentCorrect = Math.max(0, Math.min(questionCount, score / maximum * questionCount));
          const xpCorrectCount = Math.round(equivalentCorrect);
          result.push({
            ...base,
            score,
            maxScore: maximum,
            correctCount: xpCorrectCount,
            questionCount,
            answeredCount: attempt.answered == null
              ? (attempt.completionMode === "handwritten-offline" ? questionCount : 0)
              : Number(attempt.answered),
            xpCorrectCount,
            accuracyCount: equivalentCorrect,
            accuracyTotal: questionCount,
            evaluationStatus: "evaluated",
            manualFeedback: String(attempt.manualFeedback || "")
          });
          return;
        }

        const autoScored = attempt.evaluationStatus === "auto-scored" ||
          (!attempt.evaluationStatus && attempt.hasWrittenResponses === false);
        if (!autoScored || attempt.hasWrittenResponses) return;
        const correct = Number.isFinite(Number(attempt.mcqCorrect)) ? Number(attempt.mcqCorrect) : calculatedCorrect;
        const total = Number.isFinite(Number(attempt.mcqTotal)) ? Number(attempt.mcqTotal) : objectiveQuestions.length;
        const answered = Number.isFinite(Number(attempt.mcqAnsweredCount)) ? Number(attempt.mcqAnsweredCount) : calculatedAnswered;
        const score = Number.isFinite(Number(attempt.mcqMarksEarned)) ? Number(attempt.mcqMarksEarned) : calculatedMarks;
        const maximum = Number.isFinite(Number(attempt.mcqMaxMarks)) && Number(attempt.mcqMaxMarks) > 0
          ? Number(attempt.mcqMaxMarks) : calculatedMaxMarks;
        if (!total || maximum <= 0) return;
        result.push({
          ...base,
          score,
          maxScore: maximum,
          correctCount: correct,
          questionCount: total,
          answeredCount: answered,
          xpCorrectCount: correct,
          accuracyCount: correct,
          accuracyTotal: total,
          evaluationStatus: "auto-scored"
        });
      });
    });
    return result.sort((a, b) =>
      String(a.submittedAt || a.startedAt || "").localeCompare(String(b.submittedAt || b.startedAt || "")));
  }

  function listForStudent(studentId) {
    return readAll().filter(x => x.studentId === String(studentId)).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone);
  }
  function listForParent(parentId, studentId) {
    return readAll().filter(x => x.parentId === String(parentId) && (!studentId || x.studentId === String(studentId))).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone);
  }
  function get(assignmentId) {
    const row = readAll().find(x => x.assignmentId === String(assignmentId));
    return row ? clone(row) : null;
  }
  function update(assignmentId, mutate) {
    const all = readAll(), index = all.findIndex(x => x.assignmentId === String(assignmentId));
    if (index < 0) throw new Error("Assigned test was not found in this browser.");
    mutate(all[index]); writeAll(all); return clone(all[index]);
  }
  function start(assignmentId, studentId) {
    return update(assignmentId, row => {
      if (row.studentId !== String(studentId)) throw new Error("This test is not assigned to the signed-in student.");
      if (row.status === "cancelled") throw new Error("This assignment has been cancelled.");
      if (row.startsAt && new Date(row.startsAt).getTime() > Date.now()) throw new Error("This test is not available yet.");
      const active = row.attempts.find(x => x.attemptId === row.activeAttemptId && x.status === "in-progress");
      if (active) return;
      if (row.deadlineAt && new Date(row.deadlineAt).getTime() < Date.now()) throw new Error("The deadline for this test has passed.");
      const completed = row.attempts.filter(x => x.status === "submitted").length;
      if (completed >= row.attemptsAllowed) throw new Error("The allowed number of attempts has been used.");
      const attempt = { attemptId: makeId("attempt"), startedAt: now(), status: "in-progress", answers: {} };
      row.attempts.push(attempt); row.activeAttemptId = attempt.attemptId; row.status = "in-progress";
    });
  }
  function submit(assignmentId, studentId, answers) {
    return update(assignmentId, row => {
      if (row.studentId !== String(studentId)) throw new Error("This test is not assigned to the signed-in student.");
      const attempt = row.attempts.find(x => x.attemptId === row.activeAttemptId && x.status === "in-progress");
      if (!attempt) throw new Error("There is no active attempt to submit.");
      const submittedAnswers = answers && typeof answers === "object" ? answers : {};
      let correct = 0, answered = 0;
      row.questionSnapshot.forEach(q => {
        const selected = submittedAnswers[q.questionId] == null ? "" : String(submittedAnswers[q.questionId]);
        if (selected) answered++;
        if (selected && selected === q.correctOptionId) correct++;
      });
      attempt.answers = clone(submittedAnswers);
      attempt.submittedAt = now(); attempt.status = "submitted";
      attempt.correct = correct; attempt.answered = answered;
      attempt.total = row.questionSnapshot.length;
      attempt.scorePercent = attempt.total ? Math.round(correct / attempt.total * 100) : 0;
      row.status = "completed"; row.activeAttemptId = null; row.updatedAt = attempt.submittedAt;
    });
  }
  window.C10AssessmentManager = Object.freeze({
    key: KEY, bankPath, buildQuestionPool, selectQuestions, createMcqAssignment, createPaperAssignment,
    listForStudent, listForParent, analyticsAttemptsForStudent, get, start, submit, startPaper, submitPaper, recordPaperEvaluation
  });
})();
