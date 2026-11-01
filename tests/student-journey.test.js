"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto, pbkdf2Sync, randomBytes } = require("node:crypto");

const username = "learner.demo";
const password = "ClassroomOnly-42!";
const iterations = 10000;
const salt = randomBytes(16);
const passwordHash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");
const parentUsername = "parent.demo";
const parentPassword = "ParentOnly-42!";
const parentSalt = randomBytes(16);
const parentHash = pbkdf2Sync(parentPassword, parentSalt, iterations, 32, "sha256").toString("base64");
const database = {
  schemaVersion: 1,
  kind: "c10-student-accounts",
  kdf: "PBKDF2-SHA-256",
  defaultIterations: iterations,
  accounts: [
    { username, studentId: "student-learner.demo", classId: "10", active: true, salt: salt.toString("base64"), passwordHash, iterations },
    { username: "learner.second", studentId: "student-second-kid", classId: "6", active: true, salt: salt.toString("base64"), passwordHash, iterations },
    { username: "inactive.demo", classId: "9", active: false, salt: salt.toString("base64"), passwordHash, iterations }
  ]
};
const familyDatabase = {
  schemaVersion: 1,
  kind: "c10-family-access",
  defaultIterations: iterations,
  parents: [
    { parentId: "parent-a", username: parentUsername, displayName: "Parent Demo", active: true, salt: parentSalt.toString("base64"), passwordHash: parentHash, iterations },
    { parentId: "parent-b", username: "parent.second", displayName: "Second Parent", active: true, salt: parentSalt.toString("base64"), passwordHash: parentHash, iterations }
  ],
  parentStudentLinks: [
    { parentId: "parent-a", studentId: "student-learner.demo", active: true },
    { parentId: "parent-a", studentId: "student-second-kid", active: true },
    { parentId: "parent-a", studentId: "student-inactive.demo", active: true },
    { parentId: "parent-b", studentId: "student-learner.demo", active: true },
    { parentId: "parent-b", studentId: "student-second-kid", active: true }
  ]
};
const sessionValues = new Map();
const sessionStorage = {
  getItem: key => sessionValues.has(key) ? sessionValues.get(key) : null,
  setItem: (key, value) => sessionValues.set(key, String(value)),
  removeItem: key => sessionValues.delete(key)
};
const context = {
  window: { crypto: webcrypto },
  crypto: webcrypto,
  sessionStorage,
  fetch: async path => {
    if (path === "./data/student-accounts.json") return { ok: true, json: async () => database };
    if (path === "./data/family-access.json") return { ok: true, json: async () => familyDatabase };
    throw new Error("Unexpected account data request: " + path);
  },
  atob, btoa, TextEncoder, Uint8Array, JSON, Object, Array, String, Number, Math, TypeError,
  console
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/student-auth.js", "utf8"), context);
const auth = context.window.C10StudentAuth;

(async () => {
  const loggedIn = await auth.login("  LEARNER.DEMO  ", password);
  assert.deepEqual(JSON.parse(JSON.stringify(loggedIn.account)), {
    username, role: "student", studentId: "student-learner.demo", classId: "10", displayName: username
  }, "student can sign in case-insensitively and sees their stable identity and assigned class");
  assert.ok(sessionStorage.getItem("c10playground_static_student_v1"), "login persists a same-browser session");
  assert.equal((await auth.restoreSession()).username, username, "refresh restores the published student account");
  await assert.rejects(() => auth.login(username, "wrong-password"), /Invalid username or password/);
  await assert.rejects(() => auth.login("inactive.demo", password), /Invalid username or password/);
  auth.logout();
  assert.equal(auth.currentUser(), null, "sign-out clears the session");
  assert.equal(await auth.restoreSession(), null, "a signed-out student cannot restore a session");

  const parentLogin = await auth.login(parentUsername, parentPassword);
  assert.equal(parentLogin.account.role, "parent", "parent account signs in with a distinct parent role");
  assert.equal(parentLogin.account.parentId, "parent-a", "parent session has a stable parent ID");
  const linked = await auth.getLinkedChildren();
  assert.deepEqual(JSON.parse(JSON.stringify(linked.map(item => item.studentId))), ["student-learner.demo","student-second-kid"],
    "one parent can see multiple active linked students, excluding inactive students");
  auth.logout();
  const secondParentLogin = await auth.login("parent.second", parentPassword);
  assert.equal(secondParentLogin.account.role, "parent");
  assert.deepEqual(JSON.parse(JSON.stringify((await auth.getLinkedChildren()).map(item => item.studentId))), ["student-learner.demo","student-second-kid"],
    "two parents can both be linked to the same two children");
  auth.logout();
  console.log("Student and Family journey checks passed: student sign-in, PBKDF2 verification, stable student ID, session restore, wrong-password and inactive-account rejection, parent sign-in, parent role, linked-child filtering, many-to-many access and sign-out. Quiz completion, refresh recovery and result persistence are covered by quiz-engine.test.js.");
})().catch(error => { console.error(error); process.exitCode = 1; });
