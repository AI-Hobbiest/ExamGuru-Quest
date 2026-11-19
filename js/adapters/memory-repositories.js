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
    const curriculumItems = rows(data.curriculumItems), sharedBanks = rows(data.sharedBanks);
    const institutionContent = rows(data.institutionContent);
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
    const curriculum = Object.freeze({
      async listCurriculumItems() { return clone(curriculumItems); },
      async getCurriculumItem(id) { return clone(curriculumItems.find(x => x.curriculumId === id) || null); }
    });
    const content = Object.freeze({
      async listSharedBanks(filters) {
        const f = filters || {};
        return clone(sharedBanks.filter(x => (!f.classId || String(x.classId) === String(f.classId)) &&
          (!f.subjectId || String(x.subjectId) === String(f.subjectId))));
      },
      async getSharedBank(id) { return clone(sharedBanks.find(x => x.bankId === id) || null); },
      async listInstitutionContent(institutionId) { return clone(institutionContent.filter(x => x.institutionId === institutionId)); },
      async saveInstitutionCopy(institutionId, copy) {
        if (!copy || copy.ownership !== "institution" || copy.institutionId !== institutionId ||
            !copy.provenance || copy.provenance.sourceType !== "platform-shared") {
          throw new TypeError("Institution copy must retain tenant ownership and source provenance.");
        }
        if (institutionContent.some(x => x.bankId === copy.bankId)) throw new Error("Institution content ID already exists.");
        institutionContent.push(clone(copy));
        return clone(copy);
      }
    });
    return Object.freeze({ identity, institution, academic, curriculum, content, assurance:"test-only" });
  }
  const api = Object.freeze({ createMemoryRepositories });
  globalThis.ExamGuruMemoryRepositories = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();