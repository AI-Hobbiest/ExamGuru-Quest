/* Non-destructive bridge from legacy local learner accounts to the Independent Learner tenant.
 * It is a migration projection only: it never writes storage, authenticates users, or changes current app flows.
 */
(() => {
  "use strict";
  const DEFAULT_INSTITUTION_ID = "INST-DIRECT-001";
  const safe = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const stableMembershipId = (kind, id) => "MEM-INDEPENDENT-" + kind.toUpperCase() + "-" + safe(id).toUpperCase();
  const active = row => !!row && row.active !== false && row.status !== "disabled" && row.status !== "inactive";
  function assertDatabase(value, kind, key) {
    if (!value || value.schemaVersion !== 1 || value.kind !== kind || !Array.isArray(value[key])) {
      throw new TypeError("Invalid legacy " + kind + " account data.");
    }
  }
  function project(options) {
    const input = options || {};
    const students = input.studentDatabase;
    const family = input.familyDatabase;
    assertDatabase(students, "c10-student-accounts", "accounts");
    assertDatabase(family, "c10-family-access", "parents");
    if (!Array.isArray(family.parentStudentLinks)) throw new TypeError("Legacy family links are missing.");
    const institutionId = String(input.institutionId || DEFAULT_INSTITUTION_ID);
    const institution = Object.freeze({
      schemaVersion: 1,
      kind: "institution",
      institutionId,
      name: "Independent Learner",
      slug: "independent-learner",
      institutionType: "direct",
      status: "active",
      virtual: true,
      legacySource: "static-local-accounts-v1",
      entitlements: Object.freeze({
        curriculum: Object.freeze({ enabled: true, classIds: Object.freeze(["3", "6", "10", "CLAT"]) }),
        competitiveExams: Object.freeze({ enabled: true, examIds: Object.freeze(["CLAT"]) })
      })
    });
    const users = [];
    const memberships = [];
    const studentMembershipByLegacyId = new Map();
    const parentMembershipByLegacyId = new Map();
    const usernames = new Set();
    for (const row of students.accounts) {
      if (!active(row)) continue;
      const legacyId = String(row.studentId || ("student-" + safe(row.username)));
      const username = String(row.username || "").trim().toLowerCase();
      if (!username || usernames.has("student:" + username)) throw new TypeError("Duplicate or missing legacy student username.");
      usernames.add("student:" + username);
      const userId = "LEGACY-STUDENT-" + safe(legacyId).toUpperCase();
      const membershipId = stableMembershipId("student", legacyId);
      users.push({ userId, username, displayName: String(row.displayName || row.username), status: "active", legacyIdentity: { kind: "student", id: legacyId } });
      memberships.push({
        schemaVersion: 1, kind: "institution-membership", membershipId, userId, institutionId,
        role: "student", status: "active", branchScope: { allBranches: true, branchIds: [] },
        learningContext: { classId: String(row.classId || ""), contentClassId: String(row.classId || "") },
        legacySource: { kind: "c10-student-accounts", id: legacyId }
      });
      studentMembershipByLegacyId.set(legacyId, membershipId);
    }
    for (const row of family.parents) {
      if (!active(row)) continue;
      const legacyId = String(row.parentId || ("parent-" + safe(row.username)));
      const username = String(row.username || "").trim().toLowerCase();
      if (!username || usernames.has("parent:" + username)) throw new TypeError("Duplicate or missing legacy parent username.");
      usernames.add("parent:" + username);
      const userId = "LEGACY-PARENT-" + safe(legacyId).toUpperCase();
      const membershipId = stableMembershipId("parent", legacyId);
      users.push({ userId, username, displayName: String(row.displayName || row.username), status: "active", legacyIdentity: { kind: "parent", id: legacyId } });
      memberships.push({
        schemaVersion: 1, kind: "institution-membership", membershipId, userId, institutionId,
        role: "parent", status: "active", branchScope: { allBranches: true, branchIds: [] },
        legacySource: { kind: "c10-family-access", id: legacyId }
      });
      parentMembershipByLegacyId.set(legacyId, membershipId);
    }
    const parentStudentLinks = [];
    for (const link of family.parentStudentLinks) {
      if (!active(link)) continue;
      const parentId = String(link.parentId || "");
      const studentId = String(link.studentId || "");
      const parentMembershipId = parentMembershipByLegacyId.get(parentId);
      const studentMembershipId = studentMembershipByLegacyId.get(studentId);
      if (!parentMembershipId || !studentMembershipId) continue;
      parentStudentLinks.push({
        schemaVersion: 1, kind: "parent-student-link",
        linkId: "LINK-INDEPENDENT-" + safe(parentId + "-" + studentId).toUpperCase(),
        institutionId, parentMembershipId, studentMembershipId,
        relationship: String(link.relationship || "parent/guardian"),
        status: "active",
        legacySource: { parentId, studentId }
      });
    }
    return Object.freeze({
      institution,
      users: Object.freeze(users),
      memberships: Object.freeze(memberships),
      parentStudentLinks: Object.freeze(parentStudentLinks),
      migrationMode: "read-only-projection",
      sourceVersions: Object.freeze({ students: students.schemaVersion, family: family.schemaVersion })
    });
  }
  const api = Object.freeze({ DEFAULT_INSTITUTION_ID, project });
  globalThis.ExamGuruLegacyIndependentLearnerAdapter = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
