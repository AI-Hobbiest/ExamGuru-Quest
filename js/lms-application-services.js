/* Compatibility-first LMS application services. No browser or cloud dependency. */
(() => {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const required = (value, name) => {
    if (!value || typeof value !== "object") throw new TypeError(name + " is required.");
    return value;
  };
  function createLmsServices(options) {
    const opts = required(options, "LMS service options");
    const contracts = globalThis.ExamGuruRepositoryContracts;
    if (!contracts) throw new Error("Repository contracts must load before LMS services.");
    const repositories = contracts.assertRepositories(opts.repositories);
    const curriculum = opts.repositories.curriculum || null;
    const content = opts.repositories.content || null;
    const manager = opts.assessmentService || opts.assessmentManager || globalThis.C10AssessmentService || globalThis.C10AssessmentManager || null;

    const academic = Object.freeze({
      async getLearnerContext(userId, membershipId) {
        const id = String(userId || "");
        if (!id) throw new TypeError("A user ID is required.");
        const user = await repositories.identity.getUserById(id);
        if (!user || user.status === "disabled") return null;
        const memberships = await repositories.identity.listMemberships(id);
        const active = memberships.filter(row => row && row.status === "active" &&
          (!membershipId || row.membershipId === String(membershipId)));
        if (membershipId && active.length !== 1) return null;
        const scopes = [];
        for (const membership of active) {
          scopes.push({
            membership: clone(membership),
            enrollments: membership.role === "student"
              ? await repositories.academic.listStudentEnrollments(membership.membershipId) : [],
            teacherAssignments: membership.role === "teacher"
              ? await repositories.academic.listTeacherAssignments(membership.membershipId) : [],
            parentLinks: membership.role === "parent"
              ? await repositories.academic.listParentStudentLinks(membership.membershipId) : []
          });
        }
        return { user: clone(user), memberships: scopes };
      }
    });

    const curriculumService = Object.freeze({
      async list() {
        if (!curriculum || typeof curriculum.listCurriculumItems !== "function") return [];
        return clone(await curriculum.listCurriculumItems());
      },
      async get(itemId) {
        if (!curriculum || typeof curriculum.getCurriculumItem !== "function") return null;
        return clone(await curriculum.getCurriculumItem(String(itemId)));
      }
    });

    const contentService = Object.freeze({
      async listSharedBanks(filters) {
        if (!content || typeof content.listSharedBanks !== "function") return [];
        return clone(await content.listSharedBanks(clone(filters || {})));
      },
      async getSharedBank(bankId) {
        if (!content || typeof content.getSharedBank !== "function") return null;
        return clone(await content.getSharedBank(String(bankId)));
      },
      async listInstitutionContent(institutionId) {
        if (!content || typeof content.listInstitutionContent !== "function") return [];
        return clone(await content.listInstitutionContent(String(institutionId)));
      },
      async createInstitutionCopy(args) {
        const input = required(args, "Copy request");
        if (!String(input.institutionId || "").trim()) throw new TypeError("An institution ID is required.");
        if (!String(input.sourceBankId || "").trim()) throw new TypeError("A shared source bank ID is required.");
        if (!content || typeof content.saveInstitutionCopy !== "function") {
          throw new Error("Institution content repository is unavailable.");
        }
        const source = await content.getSharedBank(String(input.sourceBankId));
        if (!source) throw new Error("Shared source bank was not found.");
        const copy = clone(source);
        copy.bankId = String(input.newBankId || ("inst-" + input.institutionId + "-" + input.sourceBankId));
        copy.ownership = "institution";
        copy.institutionId = String(input.institutionId);
        copy.provenance = {
          sourceType: "platform-shared",
          sourceBankId: String(source.bankId || input.sourceBankId),
          sourceVersion: String(source.bankVersion || source.version || "unspecified"),
          copiedAt: new Date().toISOString()
        };
        copy.status = "draft";
        await content.saveInstitutionCopy(String(input.institutionId), clone(copy));
        return clone(copy);
      }
    });

    const callAssessment = (name, args) => {
      if (!manager || typeof manager[name] !== "function") throw new Error("Assessment operation is unavailable: " + name);
      return manager[name](...(args || []));
    };
    const assessmentService = Object.freeze({
      available: !!manager,
      listForStudent: id => callAssessment("listForStudent", [id]),
      listForParent: (id, studentId) => callAssessment("listForParent", [id, studentId]),
      get: id => callAssessment("get", [id]),
      createMcqAssignment: args => callAssessment("createMcqAssignment", [clone(args)]),
      createPaperAssignment: args => callAssessment("createPaperAssignment", [clone(args)]),
      start: (id, studentId) => callAssessment("start", [id, studentId]),
      submit: (id, studentId, answers) => callAssessment("submit", [id, studentId, clone(answers)]),
      startPaper: (id, studentId) => callAssessment("startPaper", [id, studentId]),
      submitPaper: (id, studentId, answers) => callAssessment("submitPaper", [id, studentId, clone(answers)]),
      recordPaperEvaluation: (id, parentId, score, feedback) => callAssessment("recordPaperEvaluation", [id, parentId, score, feedback]),
      analyticsAttemptsForStudent: id => callAssessment("analyticsAttemptsForStudent", [id])
    });
    return Object.freeze({ academic, curriculum: curriculumService, content: contentService, assessments: assessmentService });
  }
  globalThis.ExamGuruLmsApplicationServices = Object.freeze({ createLmsServices });
  if (typeof module !== "undefined" && module.exports) module.exports = globalThis.ExamGuruLmsApplicationServices;
})();