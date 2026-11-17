/* Read-only static snapshot adapter. Prototype/demo data only; never a security boundary.
 * The loader is injected so this adapter has no dependency on GitHub Pages or fetch.
 */
(() => {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const rows = value => Array.isArray(value) ? value : [];
  function createStaticPrototypeRepositories(loadSnapshot) {
    if (typeof loadSnapshot !== "function") throw new TypeError("A static snapshot loader is required.");
    let cached = null;
    async function snapshot() {
      if (!cached) {
        const value = await loadSnapshot();
        if (!value || value.schemaVersion !== 1 || value.kind !== "examguru-rbac-prototype-snapshot") {
          throw new TypeError("Static prototype snapshot has an unsupported contract.");
        }
        cached = clone(value);
      }
      return cached;
    }
    const identity = Object.freeze({
      async getUserById(id) { const s=await snapshot(); return clone(rows(s.users).find(x=>x.userId===id)||null); },
      async listMemberships(userId) { const s=await snapshot(); return clone(rows(s.memberships).filter(x=>x.userId===userId)); },
      async listPlatformRoles(userId) { const s=await snapshot(); return clone(rows(s.platformRoles).filter(x=>x.userId===userId)); }
    });
    const institution = Object.freeze({
      async getInstitution(id) { const s=await snapshot(); return clone(rows(s.institutions).find(x=>x.institutionId===id)||null); },
      async getBranch(id) { const s=await snapshot(); return clone(rows(s.branches).find(x=>x.branchId===id)||null); },
      async listBranches(id) { const s=await snapshot(); return clone(rows(s.branches).filter(x=>x.institutionId===id)); },
      async listMembershipBranchScopes(id) { const s=await snapshot(); return clone(rows(s.branchScopes).filter(x=>x.membershipId===id)); }
    });
    const academic = Object.freeze({
      async listTeacherAssignments(id) { const s=await snapshot(); return clone(rows(s.teacherAssignments).filter(x=>x.teacherMembershipId===id)); },
      async listStudentEnrollments(id) { const s=await snapshot(); return clone(rows(s.studentEnrollments).filter(x=>x.studentMembershipId===id)); },
      async listParentStudentLinks(id) { const s=await snapshot(); return clone(rows(s.parentStudentLinks).filter(x=>x.parentMembershipId===id)); }
    });
    return Object.freeze({ identity, institution, academic, assurance:"prototype-only-read-only" });
  }
  const api = Object.freeze({ createStaticPrototypeRepositories });
  globalThis.ExamGuruStaticPrototypeRepositories = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
