/* Provider-neutral repository contracts for ExamGuru's domain layer. */
(() => {
  "use strict";
  const METHODS = Object.freeze({
    identity: ["getUserById", "listMemberships", "listPlatformRoles"],
    institution: ["getInstitution", "getBranch", "getInstitutionClass", "listBranches", "listMembershipBranchScopes"],
    academic: ["listTeacherAssignments", "listStudentEnrollments", "listParentStudentLinks"]
  });
  const OPTIONAL_METHODS = Object.freeze({
    curriculum: ["listCurriculumItems", "getCurriculumItem"],
    content: ["listSharedBanks", "getSharedBank", "listInstitutionContent", "saveInstitutionCopy"],
    catalog: ["listPlans", "getPlan"],
    subscriptions: ["getCurrent", "save"],
    entitlements: ["listCurrent", "save"],
    onboarding: ["getById", "getByIdempotencyKey", "list", "save"]
  });
  function assertRepository(name, repository) {
    const required = METHODS[name] || OPTIONAL_METHODS[name];
    if (!required) throw new TypeError("Unknown repository contract: " + name);
    if (!repository || required.some(method => typeof repository[method] !== "function")) {
      throw new TypeError("Repository does not implement the " + name + " contract.");
    }
    return repository;
  }
  function assertRepositories(repositories) {
    if (!repositories || typeof repositories !== "object") throw new TypeError("Repositories are required.");
    for (const name of Object.keys(METHODS)) assertRepository(name, repositories[name]);
    const result = {
      identity: repositories.identity,
      institution: repositories.institution,
      academic: repositories.academic,
      assurance: String(repositories.assurance || "unverified")
    };
    for (const name of Object.keys(OPTIONAL_METHODS)) {
      if (repositories[name] != null) result[name] = assertRepository(name, repositories[name]);
    }
    return Object.freeze(result);
  }
  const api = Object.freeze({ METHODS, OPTIONAL_METHODS, assertRepository, assertRepositories });
  globalThis.ExamGuruRepositoryContracts = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();