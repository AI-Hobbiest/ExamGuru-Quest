"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const context={window:{},JSON,Object,Array,String,Set,RegExp};
context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync("js/knowledge-assistant-model.js","utf8"),context);
const model=context.window.ExamGuruKnowledgeAssistantModel;
const visual={schemaVersion:1,kind:"visual-revision-manifest",boards:[
 {classId:"6",subject:"science",subjectLabel:"Science",chapters:[{chapterNo:5,chapterKey:"food",title:"Food",cards:[
  {id:"food-1",title:"Nutrients",type:"concept",content:"Carbohydrates provide energy.",tags:["nutrition"]},
  {id:"food-2",title:"Balanced diet",type:"fact",facts:[["Protein","Growth and repair"]]}
 ]}]},
 {classId:"10",subject:"science",chapters:[{chapterNo:1,chapterKey:"life",title:"Life Processes",cards:[{id:"life-1",title:"Photosynthesis",type:"concept",content:"Plants make food using sunlight."}]}]}
]};
const manifest={schemaVersion:1,kind:"knowledge-base-manifest",resources:[
 {resourceId:"c6-notes",title:"Food notes",summary:"Class 6 nutrition notes",subject:"science",chapter:"Food",path:"knowledge/food.pdf",status:"published",classIds:["6"],audienceRoles:["student"]},
 {resourceId:"draft",title:"Private draft",summary:"not published",path:"draft.pdf",status:"draft",classIds:["6"],audienceRoles:["student"]},
 {resourceId:"c10",title:"Class 10 notes",summary:"Class 10",path:"knowledge/c10.pdf",status:"published",classIds:["10"],audienceRoles:["student"]},
 {resourceId:"teacher-guide",title:"Teacher assessment guide",summary:"Assigned class assessment guidance",path:"knowledge/teacher.pdf",status:"published",audienceRoles:["teacher"]},
 {resourceId:"teacher-class",title:"Class-specific teacher plan",summary:"Class-specific assessment",path:"knowledge/teacher-class.pdf",status:"published",audienceRoles:["teacher"],institutionId:"INST-1",classIds:["6"]},
 {resourceId:"hod-report",title:"Department workload guide",summary:"HOD workload and department reports",path:"knowledge/hod.pdf",status:"published",audienceRoles:["hod"],institutionId:"INST-1",departmentIds:["SCI"]},
 {resourceId:"viewer-report",title:"Institution report guide",summary:"Read-only institution report access",path:"knowledge/viewer.pdf",status:"published",audienceRoles:["institution_viewer"],institutionId:"INST-1"}
]};
const student={role:"student",classId:"6"};
const studentIndex=model.buildIndex(visual,manifest,student);
assert.equal(studentIndex.length,3,"student index includes matching class cards and published class resources");
assert.ok(model.search(studentIndex,"carbohydrates energy").some(item=>item.id==="food-1"));
assert.ok(model.search(studentIndex,"balanced diet").some(item=>item.id==="food-2"));
assert.ok(model.search(studentIndex,"nutrition notes").some(item=>item.id==="c6-notes"));
assert.equal(model.search(studentIndex,"photosynthesis").length,0,"other-class content must not leak into the class index");
assert.equal(model.search(studentIndex,"teacher assessment").length,0,"teacher resources must not leak to students");
const teacherIndex=model.buildIndex(visual,manifest,{role:"institution",institutionRole:"teacher",institutionId:"INST-1"});
assert.equal(teacherIndex.length,1,"teacher receives general teacher-audience resources only when assignment scope is unavailable");
assert.equal(model.buildIndex(visual,manifest,{role:"institution",institutionRole:"teacher",institutionId:"INST-1",assignedClassIds:["6"]}).length,2,"teacher receives class-scoped material only for assigned classes");
assert.equal(teacherIndex[0].id,"teacher-guide");
const hodIndex=model.buildIndex(visual,manifest,{role:"institution",institutionRole:"hod",institutionId:"INST-1",departmentIds:["SCI"]});
assert.equal(hodIndex.length,1,"HOD receives only matching institution and department material");
const otherHodIndex=model.buildIndex(visual,manifest,{role:"institution",institutionRole:"hod",institutionId:"INST-2",departmentIds:["SCI"]});
assert.equal(otherHodIndex.length,0,"institution-scoped resources must not cross institution boundaries");
assert.equal(model.buildIndex(visual,manifest,{role:"institution",institutionRole:"hod",institutionId:"INST-1"}).length,0,"department resources are hidden when department scope is unavailable");
const viewerIndex=model.buildIndex(visual,manifest,{role:"institution",institutionRole:"institution_viewer",institutionId:"INST-1"});
assert.equal(viewerIndex.length,1,"viewer can retrieve only explicitly viewer-audience content");
const adminProfile=model.resolveProfile({role:"admin"});
assert.equal(adminProfile.role,"platform_admin");
assert.equal(model.resolveProfile({role:"guest"}),null);
assert.equal(model.search(studentIndex,"unrelated").length,0);
assert.equal(model.answer([],"unknown").sources.length,0);
assert.equal(model.answer(model.search(studentIndex,"carbohydrates"),"carbohydrates",model.resolveProfile(student)).sources[0].title,"Nutrients");
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("Ask ExamGuru"));
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("egKnowledgeAssistantFallback"));
const shell=fs.readFileSync("js/app-shell.js","utf8");
assert.ok(shell.includes('roles.push(...studentOptions)'),"local role preview must always offer student class options");
assert.ok(shell.includes('loadKnowledgeAssistant(auth)'),"assistant loader must run independently of prior script element presence");
assert.ok(shell.includes("assistantAssetBase"),"assistant assets must resolve from the shared app-shell location");
assert.ok(!shell.includes("new URL(path,document.baseURI)"),"assistant assets must not depend on a page-level base URL");
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("ExamGuruKnowledgeAssistant=Object.freeze"),"assistant must expose an explicit mount API for deterministic initialisation");
assert.ok(fs.readFileSync("css/knowledge-assistant.css","utf8").includes(".eg-ka-panel"));
const launcherRoutes=["admin.html","institution-operations.html","teacher-workspace.html","parent.html","dashboard.html","practice.html","study.html","help.html","user-management.html"];
launcherRoutes.forEach(path=>{
  const html=fs.readFileSync(path,"utf8");
  assert.match(html,/app-shell\.js\?v=20261122-m8-assistant-launcher-v1/,path+" must load the current assistant-aware app shell without stale browser cache");
});
console.log("M8 role-aware assistant tests passed: student class isolation, role audiences, institution/department filters, viewer scope, source links, empty results and fallback hooks.");
// Launcher diagnostics remain visible on mobile and update an existing fallback rather than hiding the cause.
assert.ok(fs.readFileSync("js/app-shell.js","utf8").includes('link.textContent="Ask ExamGuru unavailable · "+stage'));
assert.ok(fs.readFileSync("js/app-shell.js","utf8").includes('window.__egKnowledgeAssistantDiagnostic={stage,message:detail||null,role:auth.role||"unknown"}'));
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes('window.__examGuruKnowledgeAssistantLoaded&&window.ExamGuruKnowledgeAssistant'),"a partial earlier load must not block API recovery");
