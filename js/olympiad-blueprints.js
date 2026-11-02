/* Config-driven Olympiad paper blueprints and section scoring. */
(() => {
  "use strict";

  const BLUEPRINTS = {
    "sof-iso-class-6-level-1": {
      id: "sof-iso-class-6-level-1",
      title: "SOF International Science Olympiad (ISO) · Class 6 · Level 1",
      legacyName: "National Science Olympiad (NSO)",
      classId: "6",
      subjectId: "science-sof",
      durationSeconds: 3600,
      sections: [
        { id: "logical-reasoning", title: "Logical Reasoning", sourceSection: "Logical Reasoning", questionCount: 10, marksPerQuestion: 1 },
        { id: "science", title: "Science", sourceSection: "Science", questionCount: 35, marksPerQuestion: 1 },
        { id: "achievers", title: "Achievers Section", sourceSection: "Achievers Section", questionCount: 5, marksPerQuestion: 3 }
      ]
    }
  };

  const shuffle = (items, random = Math.random) => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function getBlueprint(id) {
    const blueprint = BLUEPRINTS[id];
    if (!blueprint) throw new Error("Unknown Olympiad blueprint: " + id);
    return blueprint;
  }

  function buildPaper(chapters, blueprintId, random = Math.random, options = {}) {
    const blueprint = getBlueprint(blueprintId);
    if (!Array.isArray(chapters)) throw new TypeError("A chapter array is required.");
    const allQuestions = chapters.flatMap(chapter =>
      (chapter.questions || []).map(question => ({
        ...question,
        chapter_no: question.chapter_no || chapter.chapter_no,
        chapterKey: question.chapterKey || chapter.chapterKey || chapter.key,
        chapterTitle: question.chapterTitle || chapter.title
      }))
    );
    const selected = [];
    const sectionBlueprint = blueprint.sections.map((section, sectionIndex) => {
      const pool = allQuestions.filter(question => String(question.section || "").trim() === section.sourceSection);
      if (pool.length < section.questionCount) {
        throw new Error("Blueprint needs " + section.questionCount + " questions for " + section.title +
          ", but the bank has only " + pool.length + ".");
      }
      const recentIds = new Set((options.recentQuestionIds || []).map(String));
      const unseen = shuffle(pool.filter(question => !recentIds.has(String(question.questionKey || question.id))), random);
      const recent = shuffle(pool.filter(question => recentIds.has(String(question.questionKey || question.id))), random);
      const chosen = (unseen.length >= section.questionCount ? unseen : unseen.concat(recent)).slice(0, section.questionCount);
      chosen.forEach((question, questionIndex) => {
        selected.push({
          ...question,
          examSectionId: section.id,
          examSectionTitle: section.title,
          examSectionNumber: sectionIndex + 1,
          sectionQuestionNumber: questionIndex + 1,
          sectionQuestionCount: section.questionCount,
          marks: section.marksPerQuestion
        });
      });
      return {
        id: section.id,
        title: section.title,
        sourceSection: section.sourceSection,
        questionCount: section.questionCount,
        marksPerQuestion: section.marksPerQuestion,
        maxMarks: section.questionCount * section.marksPerQuestion
      };
    });
    const questionKeys = selected.map(question => String(question.questionKey || question.id));
    if (new Set(questionKeys).size !== questionKeys.length) {
      throw new Error("The generated Olympiad paper contains duplicate question IDs.");
    }
    const totalQuestions = sectionBlueprint.reduce((sum, section) => sum + section.questionCount, 0);
    const maxMarks = sectionBlueprint.reduce((sum, section) => sum + section.maxMarks, 0);
    if (selected.length !== totalQuestions) throw new Error("The generated paper does not match its blueprint.");
    return {
      blueprintId: blueprint.id,
      examTitle: blueprint.title,
      legacyName: blueprint.legacyName,
      durationSeconds: blueprint.durationSeconds,
      totalQuestions,
      maxMarks,
      sections: sectionBlueprint,
      questions: selected.map((question, index) => ({ ...question, examQuestionNumber: index + 1 }))
    };
  }

  function summarizeSections(questions, answers, sections) {
    const rows = Array.isArray(sections) ? sections : [];
    return rows.map(section => {
      const members = questions.map((question, index) => ({ question, answer: answers[index] }))
        .filter(item => item.question.examSectionId === section.id);
      const questionCount = members.length;
      const answeredCount = members.filter(item => item.answer && item.answer.status === "answered").length;
      const correctCount = members.filter(item => item.answer && item.answer.status === "answered" && item.answer.isCorrect === true).length;
      const skippedCount = members.filter(item => item.answer && item.answer.status === "skipped").length;
      const unansweredCount = Math.max(0, questionCount - answeredCount - skippedCount);
      const marksEarned = members.reduce((sum, item) =>
        sum + (item.answer && item.answer.status === "answered" && item.answer.isCorrect === true ? Number(item.question.marks || section.marksPerQuestion || 1) : 0), 0);
      const maxMarks = Number(section.maxMarks) || questionCount * (Number(section.marksPerQuestion) || 1);
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        questionCount,
        answeredCount,
        correctCount,
        skippedCount,
        unansweredCount,
        marksEarned,
        maxMarks,
        accuracy: questionCount ? Math.round(correctCount / questionCount * 100) : 0,
        marksAccuracy: maxMarks ? Math.round(marksEarned / maxMarks * 100) : 0
      };
    });
  }

  window.C10OlympiadBlueprints = Object.freeze({
    blueprints: BLUEPRINTS,
    getBlueprint,
    buildPaper,
    summarizeSections
  });
})();
