/* Consolidated student learning view: Mistake Book, bookmarks, mastery and recommendations. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const SUBJECT_TITLES = {
    science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi",
    "science-sof":"Science · SOF","mathematics-sof":"Mathematics · SOF","english-sof":"English · SOF"
  };
  function currentClassId() {
    try {
      const student = window.C10StudentAuth && window.C10StudentAuth.currentUser
        ? window.C10StudentAuth.currentUser() : null;
      if (student && student.classId) return String(student.classId);
    } catch (_) {}
    try {
      const saved = JSON.parse(sessionStorage.getItem("c10playground_static_student_v1") || "null");
      if (saved && saved.classId) return String(saved.classId);
    } catch (_) {}
    return "10";
  }
  const classId = currentClassId();
  const entries = (() => {
    const ids = classId === "6"
      ? ["science","science-sof","mathematics","mathematics-sof","english","english-sof","social-science"]
      : classId === "3" ? ["mathematics","english"]
      : ["science","mathematics","english","social-science","hindi"];
    return ids.map(subjectId => ({
      subjectId,
      subjectTitle: SUBJECT_TITLES[subjectId] || subjectId,
      recordId: classId === "10" ? subjectId : "class-" + classId + "-" + subjectId
    }));
  })();
  const learningStore = window.C10LearningModel.createStore(classId);
  let library = learningStore.load();

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const escapeId = value => String(value || "");
  function safeSubject(subjectId) {
    return entries.some(entry => entry.subjectId === subjectId) ? subjectId : "";
  }
  function practiceHref(subjectId, collection, topicKey) {
    const subject = safeSubject(subjectId);
    if (!subject) return "./dashboard.html";
    const params = new URLSearchParams({ subject, collection });
    if (topicKey) params.set("topic", String(topicKey));
    return "./practice.html?" + params.toString();
  }
  function progressStore(entry) {
    return window.C10Storage.createLocalStore({
      kind: "subject-progress",
      recordId: entry.recordId,
      legacyKey: classId === "10" ? "c10playground_v1_" + entry.subjectId : null,
      defaults: () => ({ missed: [], answered: 0, correct: 0, attempts: [] }),
      validate: value => !!value && Array.isArray(value.missed) &&
        Array.isArray(value.attempts) && Number.isFinite(value.answered) && Number.isFinite(value.correct)
    });
  }
  async function migrateExistingSubjectHistory() {
    const results = await Promise.all(entries.map(async entry => {
      try {
        const progress = progressStore(entry).load();
        if (!(progress.missed || []).length && !(progress.attempts || []).length) return false;
        const response = await fetch("./data/" + entry.recordId + ".json", { cache: "no-store" });
        if (!response.ok) return false;
        const bank = await response.json();
        const chapters = window.C10QuestionBank.normalize(bank, entry.recordId);
        const questions = chapters.flatMap(chapter => chapter.questions.map(question => ({
          ...question,
          subjectId: entry.subjectId,
          classId,
          chapter_no: chapter.chapter_no,
          chapterKey: chapter.chapterKey || chapter.key || String(chapter.chapter_no),
          chapterTitle: chapter.title
        })));
        library = window.C10LearningModel.importLegacyProgress({
          library,
          progress,
          questions,
          context: { classId, subjectId: entry.subjectId, subjectTitle: entry.subjectTitle }
        });
        return true;
      } catch (_) {
        return false;
      }
    }));
    if (results.some(Boolean)) learningStore.save(library);
    library = learningStore.load();
  }
  function subjectFilterValue() {
    return $("mistakeSubjectFilter").value || "all";
  }
  function setSummary(topics) {
    const open = library.mistakes.filter(item => item.status !== "mastered").length;
    const needs = topics.filter(item => item.uniqueQuestions >= 3 && item.masteryPercent < 70).length;
    const strong = topics.filter(item => item.uniqueQuestions >= 5 && item.masteryPercent >= 85).length;
    $("openMistakeCount").textContent = String(open);
    $("bookmarkCount").textContent = String(library.bookmarks.length);
    $("weakTopicCount").textContent = String(needs);
    $("masteredTopicCount").textContent = String(strong);
  }
  function renderSubjectFilter() {
    const select = $("mistakeSubjectFilter");
    const current = select.value || "all";
    const subjectIds = [...new Set(library.mistakes.map(item => item.subjectId).filter(Boolean))];
    select.innerHTML = "";
    select.appendChild(new Option("All subjects", "all"));
    subjectIds.sort((a,b) => (SUBJECT_TITLES[a] || a).localeCompare(SUBJECT_TITLES[b] || b))
      .forEach(id => select.appendChild(new Option(SUBJECT_TITLES[id] || id, id)));
    select.value = subjectIds.includes(current) ? current : "all";
  }
  function renderRecommendations() {
    const container = $("recommendationList");
    container.innerHTML = "";
    const rows = window.C10LearningModel.recommendations(library);
    rows.forEach(item => {
      const card = make("article", "learning-recommendation");
      card.appendChild(make("strong", "", item.title));
      card.appendChild(make("p", "", item.detail));
      const link = make("a", "", item.action === "mistakes" ? "Open Mistake Book →" :
        item.action === "bookmarks" ? "Practise saved questions →" :
        item.action === "adaptive" ? "Start focused adaptive practice →" : "Choose a subject →");
      link.href = item.action === "mistakes" ? "#mistakes" :
        item.action === "bookmarks" ? practiceHref(item.subjectId, "bookmarks") :
        item.action === "adaptive" ? practiceHref(item.subjectId, "adaptive", item.chapterKey) :
        "./dashboard.html";
      card.appendChild(link);
      container.appendChild(card);
    });
  }
  function renderMistakes() {
    const container = $("mistakeList");
    container.innerHTML = "";
    const status = $("mistakeStatusFilter").value;
    const subject = subjectFilterValue();
    const items = library.mistakes.filter(item =>
      (status === "all" || item.status === status) &&
      (subject === "all" || item.subjectId === subject)
    ).sort((a,b) => String(b.lastMissedAt || b.updatedAt || "").localeCompare(String(a.lastMissedAt || a.updatedAt || "")));
    if (!items.length) {
      container.appendChild(make("div", "learning-empty", status === "mastered"
        ? "No mastered mistakes match this filter yet."
        : "No open mistakes match this filter. Keep practising; incorrect and skipped answers will be collected here."));
      return;
    }
    items.forEach(item => {
      const card = make("article", "learning-card");
      const top = make("div", "learning-card-top");
      const meta = make("div", "learning-meta",
        (SUBJECT_TITLES[item.subjectId] || item.subjectTitle || item.subjectId) + " · " +
        (item.chapterTitle || "General") + " · " + (item.difficulty || "Unlabelled"));
      const badge = make("span", "learning-badge " + (item.status === "mastered" ? "good" : "warning"),
        item.status === "mastered" ? "Mastered" : "Needs review");
      top.append(meta, badge);
      card.appendChild(top);
      card.appendChild(make("div", "learning-question", item.question));
      if (Array.isArray(item.options) && item.options.length) {
        const options = make("div", "learning-options");
        item.options.forEach((option,index) => options.appendChild(make("div",
          "learning-option" + (index === item.answer ? " correct" : ""),
          String.fromCharCode(65 + index) + ". " + option + (index === item.answer ? " · Correct answer" : "")
        )));
        card.appendChild(options);
      }
      if (item.explanation) card.appendChild(make("p", "learning-explanation", "Explanation: " + item.explanation));
      const countText = (Number(item.wrongCount) || 0) + " incorrect · " +
        (Number(item.skippedCount) || 0) + " skipped";
      card.appendChild(make("div", "learning-meta", countText +
        (item.lastMissedAt ? " · Last recorded " + new Date(item.lastMissedAt).toLocaleDateString() : "")));
      const actions = make("div", "learning-actions");
      const practice = make("a", "", "Practise this subject's mistakes");
      practice.href = practiceHref(item.subjectId, "mistakes");
      actions.appendChild(practice);
      const statusButton = make("button", "", item.status === "mastered" ? "Reopen" : "Mark as mastered");
      statusButton.type = "button";
      statusButton.onclick = () => {
        learningStore.setMistakeStatus(item.questionKey, item.status === "mastered" ? "open" : "mastered");
        refresh();
      };
      actions.appendChild(statusButton);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }
  function renderBookmarks() {
    const container = $("bookmarkList");
    container.innerHTML = "";
    const items = library.bookmarks.slice().sort((a,b) => String(b.bookmarkedAt || "").localeCompare(String(a.bookmarkedAt || "")));
    if (!items.length) {
      container.appendChild(make("div", "learning-empty", "No bookmarks yet. During practice, select “Save question” to keep a question here for later revision."));
      return;
    }
    items.forEach(item => {
      const card = make("article", "learning-card");
      card.appendChild(make("div", "learning-meta",
        (SUBJECT_TITLES[item.subjectId] || item.subjectTitle || item.subjectId) + " · " +
        (item.chapterTitle || "General") + " · " + (item.difficulty || "Unlabelled")));
      card.appendChild(make("div", "learning-question", item.question));
      if (Array.isArray(item.options) && item.options.length) {
        const options = make("div", "learning-options");
        item.options.forEach((option,index) => options.appendChild(make("div",
          "learning-option" + (index === item.answer ? " correct" : ""),
          String.fromCharCode(65 + index) + ". " + option + (index === item.answer ? " · Correct answer" : "")
        )));
        card.appendChild(options);
      }
      if (item.explanation) card.appendChild(make("p", "learning-explanation", "Explanation: " + item.explanation));
      const actions = make("div", "learning-actions");
      const practice = make("a", "", "Practise saved questions");
      practice.href = practiceHref(item.subjectId, "bookmarks");
      actions.appendChild(practice);
      const remove = make("button", "", "Remove bookmark");
      remove.type = "button";
      remove.onclick = () => {
        learningStore.removeBookmark(item.questionKey);
        refresh();
      };
      actions.appendChild(remove);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }
  function renderMastery(topics) {
    const container = $("topicMasteryList");
    container.innerHTML = "";
    if (!topics.length) {
      container.appendChild(make("div", "learning-empty", "Topic mastery will appear after you answer questions in Learn, Test, Timed Exam or Olympiad practice."));
      return;
    }
    topics.forEach(item => {
      const row = make("div", "topic-row");
      const copy = make("div", "");
      copy.appendChild(make("div", "topic-title", item.chapterTitle));
      copy.appendChild(make("div", "topic-subtitle",
        (SUBJECT_TITLES[item.subjectId] || item.subjectTitle || item.subjectId) + " · " +
        item.uniqueQuestions + " distinct questions · " + item.attemptsCount + " recorded responses · " + item.status));
      const meter = make("div", "topic-meter");
      const fill = make("i", "");
      fill.style.width = Math.max(0, Math.min(100, item.masteryPercent)) + "%";
      meter.appendChild(fill);
      copy.appendChild(meter);
      const percent = make("div", "topic-percent", item.uniqueQuestions < 5
        ? item.masteryPercent + "% · Building" : item.masteryPercent + "%");
      const actions = make("div", "learning-actions");
      const practice = make("a", "", "Adaptive set");
      practice.href = practiceHref(item.subjectId, "adaptive", item.chapterKey);
      actions.appendChild(practice);
      const wrapper = make("div", "");
      wrapper.append(percent, actions);
      row.append(copy, wrapper);
      container.appendChild(row);
    });
  }
  function refresh() {
    library = learningStore.load();
    const topics = window.C10LearningModel.summarizeTopics(library);
    setSummary(topics);
    renderSubjectFilter();
    renderRecommendations();
    renderMistakes();
    renderBookmarks();
    renderMastery(topics);
    $("learningStatus").textContent =
      "Class " + classId + " · " + entries.length + " available subjects · Saved on this browser and device.";
  }

  $("mistakeStatusFilter").addEventListener("change", renderMistakes);
  $("mistakeSubjectFilter").addEventListener("change", renderMistakes);
  $("learningStatus").textContent = "Preparing your learning library and importing older subject retry lists…";
  migrateExistingSubjectHistory().then(refresh).catch(() => {
    refresh();
    $("learningStatus").textContent = "Some older subject history could not be imported. Your newly recorded mistakes and bookmarks remain available.";
  });
})();
