/* Central, provider-neutral, default-deny authorization policy.
 * This is a domain decision engine, NOT an authentication provider or API security boundary.
 * Trusted servers must call it after authenticating the actor and resolving resource ownership.
 */
(() => {
  "use strict";
  const ACTIVE = "active";
  const ROLE_PERMISSIONS = Object.freeze({
    school_admin: new Set([
      "institution.read","institution.update","institution.manage",
      "branch.create","branch.update","branch.manage",
      "membership.invite","membership.update","membership.disable",
      "class.manage","teacher.assign","student.enrol","parent.link",
      "question_bank.platform.read","question_bank.institution.manage","question_bank.copy_from_platform",
      "assessment.create","assessment.assign","assessment.review",
      "report.institution.read","report.class.read","report.student.read","report.export"
    ]),
    teacher: new Set([
      "institution.read","question_bank.platform.read",
      "assessment.create","assessment.assign","assessment.review",
      "report.class.read","report.student.read"
    ]),
    parent: new Set(["institution.read","report.student.read"]),
    student: new Set(["institution.read","question_bank.platform.read","report.student.read"]),
    institution_viewer: new Set(["institution.read","question_bank.platform.read","report.institution.read"])
  });
  const READ_PERMISSIONS = new Set([
    "institution.read","question_bank.platform.read","report.institution.read",
    "report.class.read","report.student.read"
  ]);
  const deny = reason => Object.freeze({ allowed:false, reason });
  const allow = (reason, membershipId, platformRole) => Object.freeze({
    allowed:true, reason, membershipId:membershipId || null, platformRole:platformRole || null
  });
  const active = row => row && row.status === ACTIVE;
  async function authorize(repositories, actor, permission, context) {
    const c = context || {};
    if (!actor || typeof actor.userId !== "string" || !actor.userId) return deny("unauthenticated");
    if (typeof permission !== "string" || !permission) return deny("invalid-permission");
    let repos;
    try {
      repos = globalThis.ExamGuruRepositoryContracts
        ? globalThis.ExamGuruRepositoryContracts.assertRepositories(repositories)
        : repositories;
      if (!repos || !repos.identity || !repos.institution || !repos.academic) return deny("repositories-unavailable");
    } catch (_) { return deny("repositories-unavailable"); }
    try {
      const user = await repos.identity.getUserById(actor.userId);
      if (!user || user.status === "disabled") return deny("identity-inactive");
      const platformRoles = await repos.identity.listPlatformRoles(actor.userId);
      if (platformRoles.some(r => r && r.role === "platform_admin" && !r.revokedAt)) {
        return allow("platform-admin", null, "platform_admin");
      }
      if (!c.institutionId || typeof c.institutionId !== "string") return deny("institution-scope-required");
      const institution = await repos.institution.getInstitution(c.institutionId);
      if (!institution || institution.status !== ACTIVE) return deny("institution-inactive-or-missing");
      const memberships = (await repos.identity.listMemberships(actor.userId)) || [];
      const membership = memberships.find(m => active(m) && m.institutionId === c.institutionId &&
        ROLE_PERMISSIONS[m.role] && ROLE_PERMISSIONS[m.role].has(permission));
      if (!membership) return deny("no-active-membership-or-permission");
      const role = membership.role;
      if (membership.allBranches !== true) {
        const scopes = await repos.institution.listMembershipBranchScopes(membership.membershipId);
        const allowedBranches = new Set((scopes || []).map(s => s.branchId));
        if (!c.branchId || !allowedBranches.has(c.branchId)) return deny("branch-scope-denied");
      }
      if (c.branchId) {
        const branch = await repos.institution.getBranch(c.branchId);
        if (!branch || branch.institutionId !== c.institutionId || branch.status !== ACTIVE) return deny("branch-tenant-mismatch");
      }
      if (c.institutionClassId) {
        const classGroup = await repos.institution.getInstitutionClass(c.institutionClassId);
        if (!classGroup || classGroup.institutionId !== c.institutionId || (c.branchId && classGroup.branchId !== c.branchId)) return deny("class-tenant-or-branch-mismatch");
      }
      if (role === "teacher") {
        if (!c.institutionClassId) return deny("teacher-class-scope-required");
        const assignments = await repos.academic.listTeacherAssignments(membership.membershipId);
        const assigned = (assignments || []).some(a => active(a) &&
          a.institutionId === c.institutionId &&
          a.institutionClassId === c.institutionClassId &&
          (!c.subjectId || a.subjectId === c.subjectId) &&
          (!c.branchId || a.branchId === c.branchId));
        if (!assigned) return deny("teacher-assignment-required");
      }
      if (role === "student") {
        if (permission !== "institution.read" && permission !== "question_bank.platform.read") {
          if (!c.studentMembershipId || c.studentMembershipId !== membership.membershipId) return deny("student-self-scope-required");
        }
        if (c.studentMembershipId && c.studentMembershipId !== membership.membershipId) return deny("student-self-scope-denied");
        if (c.institutionClassId) {
          const enrollments = await repos.academic.listStudentEnrollments(membership.membershipId);
          if (!(enrollments || []).some(e => active(e) && e.institutionId === c.institutionId &&
            e.institutionClassId === c.institutionClassId)) return deny("student-enrollment-required");
        }
      }
      if (role === "parent" && permission === "report.student.read") {
        if (!c.studentMembershipId) return deny("parent-child-scope-required");
        const links = await repos.academic.listParentStudentLinks(membership.membershipId);
        if (!(links || []).some(l => active(l) && l.institutionId === c.institutionId &&
          l.studentMembershipId === c.studentMembershipId)) return deny("parent-child-link-required");
      }
      if (role === "institution_viewer" && !READ_PERMISSIONS.has(permission)) return deny("viewer-read-only");
      if (permission === "question_bank.institution.manage" || permission === "question_bank.copy_from_platform") {
        if (role !== "school_admin") return deny("institution-bank-delegation-required");
      }
      if (permission === "report.student.read" && role === "teacher" && !c.institutionClassId) {
        return deny("teacher-class-scope-required");
      }
      return allow("institution-membership", membership.membershipId);
    } catch (_) {
      return deny("authorization-evaluation-failed");
    }
  }
  const api = Object.freeze({ authorize, ROLE_PERMISSIONS });
  globalThis.ExamGuruAuthorization = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
