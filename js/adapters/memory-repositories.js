/* Deterministic in-memory repositories for tests and local domain development. */
(() => {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const rows = value => Array.isArray(value) ? clone(value) : [];
  function createMemoryRepositories(seed) {
    const data = seed || {};
    const users = rows(data.users), memberships = rows(data.memberships), platformRoles = rows(data.platformRoles);
    const institutions = rows(data.institutions), branches = rows(data.branches), institutionClasses = rows(data.institutionClasses);
    const branchScopes = rows(data.branchScopes), teacherAssignments = rows(data.teacherAssignments);
    const studentEnrollments = rows(data.studentEnrollments), parentStudentLinks = rows(data.parentStudentLinks);
    const identity = Object.freeze({
      async getUserById(id) { return clone(users.find(x => x.userId === id) || null); },
      async listMemberships(userId) { return clone(memberships.filter(x => x.userId === userId)); },
      async listPlatformRoles(userId) { return clone(platformRoles.filter(x => x.userId === userId)); }
    });
    const institution = Object.freeze({
      async getInstitution(id) { return clone(institutions.find(x => x.institutionId === id) || null); },
      async getBranch(id) { return clone(branches.find(x => x.branchId === id) || null); },
      async getInstitutionClass(id) { return clone(institutionClasses.find(x => x.institutionClassId === id) || null); },
      async listBranches(institutionId) { return clone(branches.filter(x => x.institutionId === institutionId)); },
      async listMembershipBranchScopes(membershipId) { return clone(branchScopes.filter(x => x.membershipId === membershipId)); }
    });
    const academic = Object.freeze({
      async listTeacherAssignments(membershipId) { return clone(teacherAssignments.filter(x => x.teacherMembershipId === membershipId)); },
      async listStudentEnrollments(membershipId) { return clone(studentEnrollments.filter(x => x.studentMembershipId === membershipId)); },
      async listParentStudentLinks(membershipId) { return clone(parentStudentLinks.filter(x => x.parentMembershipId === membershipId)); }
    });
    return Object.freeze({ identity, institution, academic, assurance:"test-only" });
  }
  const api = Object.freeze({ createMemoryRepositories });
  globalThis.ExamGuruMemoryRepositories = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
