/* Provider-neutral repository contracts for ExamGuru's domain layer.
 * Implementations may be in-memory, static prototype, D1, PostgreSQL, etc.
 * All methods are asynchronous so callers do not depend on adapter latency.
 */
(() => {
  "use strict";
  const METHODS = Object.freeze({
    identity: ["getUserById", "listMemberships", "listPlatformRoles"],
    institution: ["getInstitution", "getBranch", "getInstitutionClass", "listBranches", "listMembershipBranchScopes"],
    academic: ["listTeacherAssignments", "listStudentEnrollments", "listParentStudentLinks"]
  });
  function assertRepository(name, repository) {
    const required = METHODS[name];
    if (!required) throw new TypeError("Unknown repository contract: " + name);
    if (!repository || required.some(method => typeof repository[method] !== "function")) {
      throw new TypeError("Repository does not implement the " + name + " contract.");
    }
    return repository;
  }
  function assertRepositories(repositories) {
    if (!repositories || typeof repositories !== "object") throw new TypeError("Repositories are required.");
    for (const name of Object.keys(METHODS)) assertRepository(name, repositories[name]);
    return Object.freeze({
      identity: repositories.identity,
      institution: repositories.institution,
      academic: repositories.academic,
      assurance: String(repositories.assurance || "unverified")
    });
  }
  const api = Object.freeze({ METHODS, assertRepository, assertRepositories });
  globalThis.ExamGuruRepositoryContracts = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
