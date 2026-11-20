"use strict";
const assert = require("node:assert/strict");
const { createMemoryRepositories } = require("../js/adapters/memory-repositories.js");
const { authorize } = require("../js/domain/authorization.js");

const seed = {
  users: [
    { userId: "independent-student-a", status: "active" },
    { userId: "independent-student-b", status: "active" },
    { userId: "independent-parent", status: "active" }
  ],
  institutions: [{ institutionId: "INST-DIRECT-001", status: "active", institutionType: "direct" }],
  branches: [], institutionClasses: [], teacherAssignments: [], studentEnrollments: [],
  memberships: [
    { membershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-A", userId: "independent-student-a", institutionId: "INST-DIRECT-001", role: "student", status: "active", allBranches: true, learningContext: { classId: "6", contentClassId: "6" } },
    { membershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-B", userId: "independent-student-b", institutionId: "INST-DIRECT-001", role: "student", status: "active", allBranches: true, learningContext: { classId: "CLAT", contentClassId: "CLAT" } },
    { membershipId: "MEM-INDEPENDENT-PARENT-PARENT-A", userId: "independent-parent", institutionId: "INST-DIRECT-001", role: "parent", status: "active", allBranches: true }
  ],
  platformRoles: [], branchScopes: [],
  parentStudentLinks: [
    { linkId: "LINK-A", institutionId: "INST-DIRECT-001", parentMembershipId: "MEM-INDEPENDENT-PARENT-PARENT-A", studentMembershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-A", status: "active" }
  ]
};
(async () => {
  const repos = createMemoryRepositories(seed);
  assert.equal((await authorize(repos, { userId: "independent-student-a" }, "question_bank.platform.read", { institutionId: "INST-DIRECT-001" })).allowed, true, "direct learner needs no school branch");
  assert.equal((await authorize(repos, { userId: "independent-student-a" }, "report.student.read", { institutionId: "INST-DIRECT-001", studentMembershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-A" })).allowed, true);
  assert.equal((await authorize(repos, { userId: "independent-student-a" }, "report.student.read", { institutionId: "INST-DIRECT-001", studentMembershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-B" })).allowed, false, "learner cannot read another learner's record");
  assert.equal((await authorize(repos, { userId: "independent-parent" }, "report.student.read", { institutionId: "INST-DIRECT-001", studentMembershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-A" })).allowed, true, "parent can read linked child");
  assert.equal((await authorize(repos, { userId: "independent-parent" }, "report.student.read", { institutionId: "INST-DIRECT-001", studentMembershipId: "MEM-INDEPENDENT-STUDENT-STUDENT-B" })).allowed, false, "parent cannot read unlinked child");
  assert.equal((await authorize(repos, { userId: "independent-student-a" }, "membership.invite", { institutionId: "INST-DIRECT-001" })).allowed, false, "direct learner cannot administer the tenant");
  assert.equal((await authorize(repos, { userId: "independent-student-a" }, "question_bank.platform.read", { institutionId: "SOME-OTHER-TENANT" })).allowed, false, "direct learner context cannot cross tenant boundary");
  console.log("Independent Learner authorization tests passed: branchless access, self scope, parent-child scope, deny-by-default and tenant isolation.");
})().catch(error => { console.error(error); process.exitCode = 1; });
