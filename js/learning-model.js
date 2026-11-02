/* Stage C learning library: consolidated mistakes, bookmarks, mastery and adaptive selection. */
(() => {
  "use strict";

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const MAX_RESPONSES = 12000;
  const EMPTY = () => ({
    schemaVersion: 1,
    kind: "learning-library",
    mistakes: [],
    bookmarks: [],
    responses: []
  });

  function isValidLibrary(value) {
    return !!value && value.schemaVersion === 1 &&
      value.kind === "learning-library" &&
      Array.isArray(value.mistakes) &&
      Array.isArray(value.bookmarks) &&
      Array.isArray(value.responses);
  }

  function snapshotQuestion(question, context = {}) {
    const images = Array.isArray(question.images) ? question.images.map(image => {
      if (!image || typeof image !== "object") return null;
      const row = { alt: String(image.alt || ""), caption: String(image.caption || "") };
      if (typeof image.src === "string" && !/^data:image\//i.test(image.src)) row.src = image.src;
      else if (typeof image.src === "string") row.imageStoredInBank = true;
      return row;
    }).filter(Boolean) : [];
    return {
      questionKey: String(question.questionKey || question.id),
      questionId: String(question.id || question.questionKey),
      subjectId: String(context.subjectId || question.subjectId || ""),
      subjectTitle: String(context.subjectTitle || context.subjectId || question.subjectId || "Practice"),
      classId: String(context.classId || ""),
      chapterKey: String(question.chapterKey || question.chapterId || question.chapterTitle || "general"),
      chapterTitle: String(question.chapterTitle || question.chapterName || question.chapterKey || "General"),
      question: String(question.question || ""),
      options: Array.isArray(question.options) ? question.options.map(String) : [],
      answer: Number.isInteger(question.answer) ? question.answer : null,
      explanation: String(question.explanation || ""),
      difficulty: String(question.difficulty || "Unlabelled"),
      section: String(question.section || ""),
      marks: Number(question.marks || 1),
      images
    };
  }

  function responseKey(attemptId, questionKey) {
    return String(attemptId || "unknown-attempt") + "::" + String(questionKey);
  }

  function recordOutcome(input) {
    const data = isValidLibrary(input.library) ? clone(input.library) : EMPTY();
    const question = input.question || {};
    const context = input.context || {};
    const outcome = input.outcome || {};
    const snapshot = snapshotQuestion(question, context);
    const key = snapshot.questionKey;
    if (!key || !snapshot.question) return data;
    const attemptId = String(context.attemptId || "unknown-attempt");
    const timestamp = outcome.at || now();
    const status = outcome.status === "skipped" ? "skipped" : "answered";
    const isCorrect = status === "answered" ? outcome.isCorrect === true : null;
    const row = {
      responseId: responseKey(attemptId, key),
      attemptId,
      questionKey: key,
      subjectId: snapshot.subjectId,
      subjectTitle: snapshot.subjectTitle,
      classId: snapshot.classId,
      chapterKey: snapshot.chapterKey,
      chapterTitle: snapshot.chapterTitle,
      difficulty: snapshot.difficulty,
      status,
      isCorrect,
      answeredAt: timestamp,
      mode: String(context.mode || "")
    };
    const existingIndex = data.responses.findIndex(item => item.responseId === row.responseId);
    if (existingIndex >= 0) data.responses[existingIndex] = row;
    else data.responses.push(row);
    if (data.responses.length > MAX_RESPONSES) data.responses = data.responses.slice(-MAX_RESPONSES);

    const history = data.responses.filter(item => item.questionKey === key);
    const wrongRows = history.filter(item => item.status === "answered" && item.isCorrect === false);
    const skippedRows = history.filter(item => item.status === "skipped");
    let mistake = data.mistakes.find(item => item.questionKey === key);
    if (wrongRows.length || skippedRows.length) {
      if (!mistake) {
        mistake = {
          ...snapshot,
          status: "open",
          firstMissedAt: timestamp,
          lastMissedAt: timestamp,
          wrongCount: 0,
          skippedCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        data.mistakes.push(mistake);
      }
      Object.assign(mistake, snapshot, {
        wrongCount: wrongRows.length,
        skippedCount: skippedRows.length,
        lastMissedAt: history.map(item => item.answeredAt).filter(Boolean).sort().slice(-1)[0] || timestamp,
        lastOutcome: row.status === "skipped" ? "skipped" : isCorrect ? "correct-after-mistake" : "incorrect",
        updatedAt: timestamp
      });
      if (!mistake.firstMissedAt) mistake.firstMissedAt = timestamp;
      if (row.status === "skipped" || (row.status === "answered" && isCorrect === false)) mistake.status = "open";
    } else if (mistake && mistake.status !== "mastered") {
      data.mistakes = data.mistakes.filter(item => item.questionKey !== key);
    }
    data.updatedAt = timestamp;
    return data;
  }

  function toggleBookmark(input) {
    const data = isValidLibrary(input.library) ? clone(input.library) : EMPTY();
    const snapshot = snapshotQuestion(input.question || {}, input.context || {});
    if (!snapshot.questionKey || !snapshot.question) return { library: data, bookmarked: false };
    const index = data.bookmarks.findIndex(item => item.questionKey === snapshot.questionKey);
    if (index >= 0) {
      data.bookmarks.splice(index, 1);
      data.updatedAt = now();
      return { library: data, bookmarked: false };
    }
    data.bookmarks.unshift({
      ...snapshot,
      bookmarkedAt: now(),
      note: ""
    });
    data.updatedAt = now();
    return { library: data, bookmarked: true };
  }

  function removeBookmark(library, questionKey) {
    const data = isValidLibrary(library) ? clone(library) : EMPTY();
    data.bookmarks = data.bookmarks.filter(item => item.questionKey !== String(questionKey));
    data.updatedAt = now();
    return data;
  }

  function setMistakeStatus(library, questionKey, status) {
    if (!["open", "mastered"].includes(status)) throw new TypeError("Mistake status must be open or mastered.");
    const data = isValidLibrary(library) ? clone(library) : EMPTY();
    const item = data.mistakes.find(row => row.questionKey === String(questionKey));
    if (item) {
      item.status = status;
      item.updatedAt = now();
    }
    data.updatedAt = now();
    return data;
  }

  function importLegacyProgress(input) {
    let data = isValidLibrary(input.library) ? clone(input.library) : EMPTY();
    const progress = input.progress || {};
    const context = input.context || {};
    const questions = Array.isArray(input.questions) ? input.questions : [];
    const byRef = new Map();
    questions.forEach(question => {
      [question.questionKey, question.id, question.legacyId,
        question.chapter_no != null && question.id != null ? String(question.chapter_no) + ":" + String(question.id) : null,
        question.chapter_no != null && question.legacyId != null ? String(question.chapter_no) + ":" + String(question.legacyId) : null
      ].filter(value => value != null).forEach(value => byRef.set(String(value), question));
    });
    for (const [index, event] of (progress.attempts || []).entries()) {
      const reference = String(event.questionId || event.id || "");
      const question = byRef.get(reference);
      if (!question) continue;
      const status = event.status === "skipped" ? "skipped" : "answered";
      const attemptId = event.attemptId || "legacy-" + reference + "-" + String(event.at || index);
      data = recordOutcome({
        library: data,
        question,
        context: { ...context, attemptId, mode: "legacy-progress" },
        outcome: { status, isCorrect: status === "answered" ? event.correct === true : null, at: event.at || now() }
      });
    }
    for (const reference of (progress.missed || [])) {
      const question = byRef.get(String(reference));
      if (!question) continue;
      const questionKey = String(question.questionKey || question.id);
      const alreadyPresent = data.responses.some(row => row.questionKey === questionKey &&
        (row.status === "skipped" || row.isCorrect === false));
      if (alreadyPresent) continue;
      data = recordOutcome({
        library: data,
        question,
        context: { ...context, attemptId: "legacy-missed-" + questionKey, mode: "legacy-migration" },
        outcome: { status: "skipped", at: now() }
      });
    }
    return data;
  }

  function filterByDifficulty(questions, difficulty) {
    const pool = Array.isArray(questions) ? questions : [];
    const wanted = String(difficulty || "all").trim().toLowerCase();
    if (!wanted || wanted === "all") return pool.slice();
    return pool.filter(question => String(question.difficulty || "Unlabelled").trim().toLowerCase() === wanted);
  }

  function summarizeTopics(library) {
    const data = isValidLibrary(library) ? library : EMPTY();
    const latest = new Map();
    const historyCount = new Map();
    for (const row of data.responses) {
      const compound = String(row.subjectId) + "::" + String(row.chapterKey) + "::" + String(row.questionKey);
      historyCount.set(compound, (historyCount.get(compound) || 0) + 1);
      const prior = latest.get(compound);
      if (!prior || String(row.answeredAt || "") >= String(prior.answeredAt || "")) latest.set(compound, row);
    }
    const groups = new Map();
    for (const [compound, row] of latest.entries()) {
      const key = String(row.subjectId) + "::" + String(row.chapterKey);
      const item = groups.get(key) || {
        subjectId: row.subjectId,
        subjectTitle: row.subjectTitle,
        chapterKey: row.chapterKey,
        chapterTitle: row.chapterTitle,
        uniqueQuestions: 0,
        answeredCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
        attemptsCount: 0,
        lastPracticedAt: ""
      };
      item.uniqueQuestions++;
      item.attemptsCount += historyCount.get(compound) || 1;
      if (row.status === "skipped") item.skippedCount++;
      else {
        item.answeredCount++;
        if (row.isCorrect === true) item.correctCount++;
        else if (row.isCorrect === false) item.incorrectCount++;
      }
      if (String(row.answeredAt || "") > item.lastPracticedAt) item.lastPracticedAt = String(row.answeredAt || "");
      groups.set(key, item);
    }
    return [...groups.values()].map(item => {
      const denominator = item.uniqueQuestions;
      const masteryPercent = denominator ? Math.round(item.correctCount / denominator * 100) : 0;
      const status = denominator < 5 ? "Building evidence" :
        masteryPercent < 50 ? "Needs attention" :
        masteryPercent < 70 ? "Developing" :
        masteryPercent < 85 ? "Strong" : "Mastered";
      return { ...item, masteryPercent, status };
    }).sort((a, b) => a.masteryPercent - b.masteryPercent ||
      b.uniqueQuestions - a.uniqueQuestions || a.chapterTitle.localeCompare(b.chapterTitle));
  }

  function adaptiveOrder(questions, library, count, random = Math.random) {
    const pool = Array.isArray(questions) ? questions.slice() : [];
    const limit = count === 0 || count == null ? pool.length : Math.min(pool.length, Math.max(0, Number(count) || 0));
    if (!limit) return [];
    const data = isValidLibrary(library) ? library : EMPTY();
    const mastery = summarizeTopics(data);
    const masteryByTopic = new Map(mastery.map(item => [String(item.subjectId) + "::" + String(item.chapterKey), item]));
    const openMistakes = new Set(data.mistakes.filter(item => item.status !== "mastered").map(item => item.questionKey));
    const seen = new Set(data.responses.map(item => item.questionKey));
    const candidates = pool.map(question => {
      const questionKey = String(question.questionKey || question.id);
      const subjectId = String(question.subjectId || (question.questionKey || "").split("/")[0] || "");
      const chapterKey = String(question.chapterKey || question.chapterId || question.chapterTitle || "general");
      const topic = masteryByTopic.get(subjectId + "::" + chapterKey);
      const accuracy = topic ? topic.masteryPercent : null;
      const isMistake = openMistakes.has(questionKey);
      const isUnseen = !seen.has(questionKey);
      const difficulty = String(question.difficulty || "").toLowerCase();
      let difficultyFit = 0;
      if (accuracy !== null) {
        if (accuracy < 50 && ["easy", "medium"].includes(difficulty)) difficultyFit = 1;
        else if (accuracy >= 50 && accuracy < 75 && ["medium", "hard"].includes(difficulty)) difficultyFit = 1;
        else if (accuracy >= 75 && ["hard", "challenge", "very hard"].includes(difficulty)) difficultyFit = 1;
      }
      const weakness = accuracy === null ? 0.25 : (100 - accuracy) / 100;
      const weight = 1 + (isMistake ? 4 : 0) + weakness * 3 + (isUnseen ? 1.25 : 0) + difficultyFit * 0.75;
      return { question, weight };
    });
    const selected = [];
    while (candidates.length && selected.length < limit) {
      const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
      let target = random() * totalWeight;
      let index = candidates.length - 1;
      for (let i = 0; i < candidates.length; i++) {
        target -= candidates[i].weight;
        if (target <= 0) { index = i; break; }
      }
      selected.push(candidates[index].question);
      candidates.splice(index, 1);
    }
    return selected;
  }

  function recommendations(library) {
    const data = isValidLibrary(library) ? library : EMPTY();
    const rows = [];
    const openMistakes = data.mistakes.filter(item => item.status !== "mastered");
    if (openMistakes.length) {
      const subjectCount = openMistakes.reduce((result, item) => {
        result[item.subjectId] = (result[item.subjectId] || 0) + 1;
        return result;
      }, {});
      const subjectId = Object.keys(subjectCount).sort((a, b) => subjectCount[b] - subjectCount[a])[0] || "";
      rows.push({
        id: "mistakes",
        title: "Review your Mistake Book",
        detail: openMistakes.length + " question" + (openMistakes.length === 1 ? " needs" : "s need") + " another look across your subjects.",
        action: "mistakes",
        subjectId
      });
    }
    const weak = summarizeTopics(data).filter(item => item.uniqueQuestions >= 3 && item.masteryPercent < 70).slice(0, 2);
    weak.forEach((item, index) => rows.push({
      id: "topic-" + item.subjectId + "-" + item.chapterKey,
      title: "Strengthen " + item.chapterTitle,
      detail: item.masteryPercent + "% current mastery across " + item.uniqueQuestions + " distinct questions. Try a focused adaptive set.",
      action: "adaptive",
      subjectId: item.subjectId,
      chapterKey: item.chapterKey
    }));
    if (data.bookmarks.length) rows.push({
      id: "bookmarks",
      title: "Revisit your saved questions",
      detail: data.bookmarks.length + " bookmarked question" + (data.bookmarks.length === 1 ? "" : "s") + " ready for another look.",
      action: "bookmarks",
      subjectId: data.bookmarks[0].subjectId || ""
    });
    if (!rows.length) rows.push({
      id: "build-evidence",
      title: "Build your learning map",
      detail: "Complete a few practice sets across your topics. ExamGuru will use your answers to identify what deserves attention next.",
      action: "practice",
      subjectId: ""
    });
    return rows.slice(0, 5);
  }

  function createStore(classId) {
    if (!window.C10Storage) throw new Error("C10Storage must load before the learning library.");
    const adapter = window.C10Storage.createLocalStore({
      kind: "learning-library",
      recordId: "class-" + String(classId || "10"),
      defaults: EMPTY,
      validate: isValidLibrary
    });
    return Object.freeze({
      load: () => adapter.load(),
      save: value => adapter.save(value),
      recordAnswer: (question, context, outcome) => {
        const next = recordOutcome({ library: adapter.load(), question, context, outcome });
        adapter.save(next);
        return next;
      },
      toggleBookmark: (question, context) => {
        const result = toggleBookmark({ library: adapter.load(), question, context });
        adapter.save(result.library);
        return result.bookmarked;
      },
      removeBookmark: questionKey => {
        const next = removeBookmark(adapter.load(), questionKey);
        adapter.save(next);
        return next;
      },
      setMistakeStatus: (questionKey, status) => {
        const next = setMistakeStatus(adapter.load(), questionKey, status);
        adapter.save(next);
        return next;
      },
      importLegacyProgress: (progress, questions, context) => {
        const next = importLegacyProgress({ library: adapter.load(), progress, questions, context });
        adapter.save(next);
        return next;
      },
      clear: () => adapter.clear(),
      storageKey: adapter.storageKey
    });
  }

  window.C10LearningModel = Object.freeze({
    schemaVersion: 1,
    maxResponses: MAX_RESPONSES,
    emptyLibrary: EMPTY,
    isValidLibrary,
    snapshotQuestion,
    recordOutcome,
    toggleBookmark,
    removeBookmark,
    setMistakeStatus,
    importLegacyProgress,
    filterByDifficulty,
    summarizeTopics,
    adaptiveOrder,
    recommendations,
    createStore
  });
})();
