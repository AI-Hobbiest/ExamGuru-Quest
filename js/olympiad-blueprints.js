/* Config-driven Class 6 SOF Olympiad Level 1 paper blueprints and section scoring. */
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
        { id: "logical-reasoning", title: "Logical Reasoning", sourceSection: "Logical Reasoning", questionCount: 10, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 6, "previous-class": 4 } },
        { id: "science", title: "Science", sourceSection: "Science", questionCount: 35, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 21, "previous-class": 14 } },
        { id: "achievers", title: "Achievers Section", sourceSection: "Achievers Section", questionCount: 5, marksPerQuestion: 3, syllabusOriginQuotas: { "current-class": 5 } }
      ],
      syllabusCoverageNote: "This Class 6 Level 1 mock allocates 60% current-class and 40% previous-class questions across the 45 non-Achievers questions (27 current-class, 18 previous-class). All five Achievers questions are drawn from the current-class syllabus, as SOF specifies."
    },
    "sof-imo-class-6-level-1": {
      id: "sof-imo-class-6-level-1",
      title: "SOF International Mathematics Olympiad (IMO) · Class 6 · Level 1",
      legacyName: "SOF IMO",
      classId: "6",
      subjectId: "mathematics-sof",
      durationSeconds: 3600,
      sections: [
        { id: "logical-reasoning", title: "Logical Reasoning", sourceSection: "Logical Reasoning", questionCount: 15, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 9, "previous-class": 6 } },
        { id: "mathematical-reasoning", title: "Mathematical Reasoning", sourceSection: "Mathematical Reasoning", questionCount: 20, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 12, "previous-class": 8 } },
        { id: "everyday-mathematics", title: "Everyday Mathematics", sourceSection: "Everyday Mathematics", questionCount: 10, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 6, "previous-class": 4 } },
        { id: "achievers", title: "Achievers Section", sourceSection: "Achievers Section", questionCount: 5, marksPerQuestion: 3, syllabusOriginQuotas: { "current-class": 5 } }
      ],
      syllabusCoverageNote: "This Class 6 Level 1 mock allocates 60% current-class and 40% previous-class questions across the 45 non-Achievers questions (27 current-class, 18 previous-class). All five Achievers questions are drawn from the current-class syllabus, as SOF specifies."
    },
    "sof-imo-class-3-level-1": {
      id: "sof-imo-class-3-level-1",
      title: "SOF International Mathematics Olympiad (IMO) · Class 3 · Level 1",
      legacyName: "SOF IMO",
      classId: "3",
      subjectId: "mathematics-sof",
      durationSeconds: 3600,
      sections: [
        { id: "logical-reasoning", title: "Logical Reasoning", sourceSection: "Logical Reasoning", questionCount: 10, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 6, "previous-class": 4 } },
        { id: "mathematical-reasoning", title: "Mathematical Reasoning", sourceSection: "Mathematical Reasoning", questionCount: 10, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 6, "previous-class": 4 } },
        { id: "everyday-mathematics", title: "Everyday Mathematics", sourceSection: "Everyday Mathematics", questionCount: 10, marksPerQuestion: 1, syllabusOriginQuotas: { "current-class": 6, "previous-class": 4 } },
        { id: "achievers", title: "Achievers Section", sourceSection: "Achievers Section", questionCount: 5, marksPerQuestion: 2, syllabusOriginQuotas: { "current-class": 5 } }
      ],
      syllabusCoverageNote: "SOF Level 1 coverage is implemented as 18 current-class and 12 previous-class questions across the 30 non-Achievers questions, plus five current-class Achievers questions. The 6/4 split in each non-Achievers section is an ExamGuru allocation to make the paper deterministic and auditable; SOF does not publish separate per-section grade quotas."
    },
    "sof-ieo-class-6-level-1": {
      id: "sof-ieo-class-6-level-1",
      title: "SOF International English Olympiad (IEO) · Class 6 · Level 1",
      legacyName: "SOF IEO",
      classId: "6",
      subjectId: "english-sof",
      durationSeconds: 3600,
      sections: [
        { id: "word-structure", title: "Word and Structure Knowledge", sourceSection: "Word and Structure Knowledge", questionCount: 30, marksPerQuestion: 1 },
        { id: "reading", title: "Reading", sourceSection: "Reading", questionCount: 10, marksPerQuestion: 1 },
        { id: "spoken-written", title: "Spoken and Written Expression", sourceSection: "Spoken and Written Expression", questionCount: 5, marksPerQuestion: 1 },
        { id: "achievers", title: "Achievers Section", sourceSection: "Achievers Section", questionCount: 5, marksPerQuestion: 3 }
      ],
      syllabusCoverageNote: "The blueprint matches the published Level 1 section counts, time and marks. The source bank is section-tagged; no additional current/previous-class syllabus-origin certification is claimed."
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
      const recentIds = new Set((options.recentQuestionIds || []).map(String));
      const originQuotas = section.syllabusOriginQuotas || null;
      let chosen = [];
      if (originQuotas) {
        const quotaEntries = Object.entries(originQuotas);
        const quotaTotal = quotaEntries.reduce((sum, entry) => sum + Number(entry[1] || 0), 0);
        if (quotaTotal !== section.questionCount) {
          throw new Error("Syllabus-origin quotas for " + section.title + " total " + quotaTotal +
            ", but the section requires " + section.questionCount + ".");
        }
        for (const [origin, rawCount] of quotaEntries) {
          const count = Number(rawCount);
          if (!Number.isInteger(count) || count < 0) {
            throw new Error("Invalid syllabus-origin quota for " + section.title + ": " + origin + ".");
          }
          if (!count) continue;
          const originPool = pool.filter(question => question.syllabusOrigin === origin);
          if (originPool.length < count) {
            throw new Error("Blueprint needs " + count + " " + origin + " questions for " + section.title +
              ", but the bank has only " + originPool.length + ".");
          }
          const unseen = shuffle(originPool.filter(question => !recentIds.has(String(question.questionKey || question.id))), random);
          const recent = shuffle(originPool.filter(question => recentIds.has(String(question.questionKey || question.id))), random);
          chosen = chosen.concat((unseen.length >= count ? unseen : unseen.concat(recent)).slice(0, count));
        }
        chosen = shuffle(chosen, random);
      } else {
        if (pool.length < section.questionCount) {
          throw new Error("Blueprint needs " + section.questionCount + " questions for " + section.title +
            ", but the bank has only " + pool.length + ".");
        }
        const unseen = shuffle(pool.filter(question => !recentIds.has(String(question.questionKey || question.id))), random);
        const recent = shuffle(pool.filter(question => recentIds.has(String(question.questionKey || question.id))), random);
        chosen = (unseen.length >= section.questionCount ? unseen : unseen.concat(recent)).slice(0, section.questionCount);
      }
      if (chosen.length !== section.questionCount) {
        throw new Error("The selected questions do not meet the required syllabus-origin quotas for " + section.title + ".");
      }
      const syllabusOriginCounts = chosen.reduce((counts, question) => {
        const origin = String(question.syllabusOrigin || "unclassified");
        counts[origin] = (counts[origin] || 0) + 1;
        return counts;
      }, {});
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
        maxMarks: section.questionCount * section.marksPerQuestion,
        syllabusOriginQuotas: originQuotas ? { ...originQuotas } : null,
        syllabusOriginCounts
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
      syllabusCoverageNote: blueprint.syllabusCoverageNote,
      syllabusOriginCounts: selected.reduce((counts, question) => {
        const origin = String(question.syllabusOrigin || "unclassified");
        counts[origin] = (counts[origin] || 0) + 1;
        return counts;
      }, {}),
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
