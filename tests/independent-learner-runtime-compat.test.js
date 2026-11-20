"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    values
  };
}

// Existing local IAM records retain their IDs and memberships while the reserved
// direct tenant receives its canonical display name and CLAT cohort entitlement.
const existingUser = { userId: "USR-EXISTING-01", username: "legacy-admin", status: "active", roles: [{ role: "platform_admin", institutionId: null }] };
const localState = {
  schemaVersion: 3, users: [existingUser],
  institutions: [
    { institutionId: "INST-DIRECT-001", name: "ExamGuru Direct Learning", institutionType: "direct", status: "active", virtual: true, entitlements: { curriculum: { enabled: true, classIds: ["3", "6", "10"] }, competitiveExams: { enabled: false, examIds: [] } } },
    { institutionId: "SCHOOL-EXISTING-01", name: "Existing School", institutionType: "school", status: "active", entitlements: { curriculum: { enabled: true, classIds: ["10"] }, competitiveExams: { enabled: false, examIds: [] } } }
  ]
};
const localStorage = storage({ examguru_iam_local_v1: JSON.stringify(localState) });
const iamContext = { localStorage, sessionStorage: storage(), window: {} };
vm.runInNewContext(fs.readFileSync("js/iam-local-store.js", "utf8"), iamContext);
const iam = iamContext.window.ExamGuruLocalIAM;
const migrated = iam.getState();
assert.equal(iam.directInstitutionId, "INST-DIRECT-001");
assert.equal(iam.findInstitution("INST-DIRECT-001").name, "Independent Learner");
assert.equal(iam.findInstitution("INST-DIRECT-001").legacyName, "ExamGuru Direct Learning");
assert.ok(iam.getEntitlements("INST-DIRECT-001").curriculum.classIds.includes("CLAT"));
assert.equal(iam.getEntitlements("INST-DIRECT-001").competitiveExams.enabled, true);
assert.ok(iam.getEntitlements("INST-DIRECT-001").competitiveExams.examIds.includes("CLAT"));
assert.equal(iam.findInstitution("SCHOOL-EXISTING-01").name, "Existing School");
assert.equal(iam.findUser("USR-EXISTING-01").username, "legacy-admin");
assert.equal(migrated.users.length, 1);

// Existing browser sessions gain additive tenant context without requiring a
// new login or changing their student/parent IDs and class information.
function authContext(session) {
  const sessionStorage = storage({ c10playground_static_student_v1: JSON.stringify(session) });
  const context = { sessionStorage, window: {}, fetch: async () => { throw new Error("fetch must not be called for currentUser"); } };
  vm.runInNewContext(fs.readFileSync("js/student-auth.js", "utf8"), context);
  return context.window.C10StudentAuth.currentUser();
}
const student = authContext({ username: "learner-a", role: "student", studentId: "student-a", classId: "6", displayName: "Learner A" });
assert.equal(student.studentId, "student-a");
assert.equal(student.classId, "6");
assert.equal(student.institutionId, "INST-DIRECT-001");
assert.equal(student.institutionType, "direct");
assert.equal(student.membershipId, "MEM-INDEPENDENT-STUDENT-STUDENT-A");
const parent = authContext({ username: "parent-a", role: "parent", parentId: "parent-a", displayName: "Parent A" });
assert.equal(parent.parentId, "parent-a");
assert.equal(parent.institutionId, "INST-DIRECT-001");
assert.equal(parent.membershipId, "MEM-INDEPENDENT-PARENT-PARENT-A");
console.log("Independent Learner runtime compatibility: all checks passed.");
