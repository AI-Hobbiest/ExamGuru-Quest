"use strict";
const assert = require("node:assert/strict");
const adapter = require("../js/domain/legacy-independent-learner-adapter.js");
const students = {
  schemaVersion: 1, kind: "c10-student-accounts", defaultIterations: 600000,
  accounts: [
    { username: "learner-a", studentId: "student-a", displayName: "Learner A", classId: "6", active: true, salt: "secret-salt", passwordHash: "secret-hash" },
    { username: "learner-b", studentId: "student-b", classId: "CLAT", active: true },
    { username: "inactive", studentId: "student-inactive", classId: "10", active: false }
  ]
};
const family = {
  schemaVersion: 1, kind: "c10-family-access",
  parents: [
    { username: "parent-a", parentId: "parent-a", displayName: "Parent A", active: true, salt: "parent-salt", passwordHash: "parent-hash" },
    { username: "inactive-parent", parentId: "parent-inactive", active: false }
  ],
  parentStudentLinks: [
    { parentId: "parent-a", studentId: "student-a", relationship: "parent/guardian", active: true },
    { parentId: "parent-a", studentId: "student-inactive", active: true },
    { parentId: "parent-inactive", studentId: "student-a", active: true }
  ]
};
const beforeStudents = JSON.stringify(students), beforeFamily = JSON.stringify(family);
const result = adapter.project({ studentDatabase: students, familyDatabase: family });
assert.equal(result.institution.institutionId, "INST-DIRECT-001");
assert.equal(result.institution.name, "Independent Learner");
assert.equal(result.institution.institutionType, "direct");
assert.deepEqual(result.institution.entitlements.curriculum.classIds, ["3", "6", "10", "CLAT"]);
assert.equal(result.users.length, 3, "only active student and parent identities are projected");
assert.equal(result.memberships.length, 3);
assert.equal(result.memberships.filter(x => x.role === "student").length, 2);
assert.equal(result.memberships.filter(x => x.role === "parent").length, 1);
assert.ok(result.memberships.every(x => x.institutionId === "INST-DIRECT-001" && x.branchScope.allBranches));
assert.equal(result.memberships.find(x => x.role === "student" && x.learningContext.classId === "CLAT").learningContext.contentClassId, "CLAT");
assert.equal(result.parentStudentLinks.length, 1, "only links with both active ends are projected");
assert.equal(result.parentStudentLinks[0].institutionId, "INST-DIRECT-001");
assert.ok(!JSON.stringify(result).includes("secret-hash"));
assert.ok(!JSON.stringify(result).includes("parent-hash"));
assert.ok(!JSON.stringify(result).includes("secret-salt"));
assert.equal(JSON.stringify(students), beforeStudents, "projection must not mutate legacy student accounts");
assert.equal(JSON.stringify(family), beforeFamily, "projection must not mutate family accounts");
const again = adapter.project({ studentDatabase: students, familyDatabase: family });
assert.deepEqual(result.memberships.map(x => x.membershipId), again.memberships.map(x => x.membershipId), "IDs must be stable across runs");
assert.throws(() => adapter.project({ studentDatabase: {}, familyDatabase: family }), /Invalid legacy/);
console.log("Legacy Independent Learner projection: all checks passed.");
