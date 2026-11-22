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
const classCatalog={classes:[
 {classId:"3",label:"Class 3",active:true,subjects:["mathematics","mathematics-sof","english"]},
 {classId:"6",label:"Class 6",active:true,subjects:["science","mathematics","english","social-science","mathematics-sof","science-sof","english-sof"]},
 {classId:"10",label:"Class 10",active:true,subjects:["science","mathematics","english","social-science","hindi"]}
]};
assert.deepEqual(model.bankSources(classCatalog,"How many questions in Class 6 Science").map(x=>x.bankType).sort(),["Curriculum","SOF / Olympiad"]);
assert.equal(model.bankSources(classCatalog,"Class 3 Maths").length,2,"Class 3 Mathematics should include curriculum and SOF banks");
assert.equal(model.bankSources(classCatalog,"Class 6 English SOF").length,1,"SOF filter should select only the Olympiad bank");
assert.equal(model.bankSources(classCatalog,"Class 10").length,5,"Class 10 inventory should include its four exam-paper banks and Hindi source");
assert.equal(model.bankSources(classCatalog,"Class 6 Science")[0].path,"data/class-6-science.json");
assert.equal(model.countBankQuestions([{questions:[{id:1},{id:2}]},{questions:[{id:3}]}]),3);
assert.equal(model.countBankQuestions({questions:[{id:1},{id:2}]}),2);
const adminHelp=model.answer([],"How can u help me",adminProfile);
assert.match(adminHelp.text,/platform documentation, question-bank material and operational guidance/i);
assert.match(adminHelp.text,/cannot access private institution records/i);
assert.equal(model.answer([],"hello",adminProfile).text.startsWith("Hello!"),true);
assert.match(model.answer([],"How can you help me",model.resolveProfile(student)).text,/class curriculum/i);
assert.equal(model.answer([],"unknown").sources.length,0);
assert.equal(model.answer(model.search(studentIndex,"carbohydrates"),"carbohydrates",model.resolveProfile(student)).sources[0].title,"Nutrients");
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("Ask ExamGuru"));
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("egKnowledgeAssistantFallback"));
const shell=fs.readFileSync("js/app-shell.js","utf8");
assert.ok(shell.includes('roles.push(...studentOptions)'),"local role preview must always offer student class options");
assert.ok(shell.includes('loadKnowledgeAssistant(auth)'),"assistant loader must run independently of prior script element presence");
assert.ok(shell.includes("assistantAssetBase"),"assistant assets must resolve from the shared app-shell location");
assert.ok(shell.includes("knowledge-assistant-model.js?v=20261122-m8-loader-v7")&&shell.includes("knowledge-assistant.js?v=20261122-m8-loader-v7")&&shell.includes("knowledge-assistant.css?v=20261122-m8-loader-v7"),"all assistant runtime assets use a new cache key when the floater implementation changes");
assert.ok(!shell.includes("new URL(path,document.baseURI)"),"assistant assets must not depend on a page-level base URL");
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("ExamGuruKnowledgeAssistant=Object.freeze"),"assistant must expose an explicit mount API for deterministic initialisation");
assert.ok(fs.readFileSync("css/knowledge-assistant.css","utf8").includes(".eg-ka-panel"));
const launcherRoutes=["admin.html","institution-operations.html","teacher-workspace.html","parent.html","dashboard.html","practice.html","study.html","help.html","user-management.html","index.html","profile.html","learning.html","exam-practice.html","assigned-paper.html","assigned-test.html","clat.html","clat-dashboard.html","clat-login.html","competitive-exams-admin.html","institution-academics.html","institution-assignments.html","institution-branches.html","institution-competitive-exams.html","institution-content.html","institution-departments.html","institution-enrolments.html","institution-learning.html","platform-entitlements.html","pyq-library.html"];
launcherRoutes.forEach(path=>{
  const html=fs.readFileSync(path,"utf8");
  assert.match(html,/app-shell\.js\?v=m8-loader-v[78]/,path+" must load the current assistant-aware app shell without stale browser cache");
});
console.log("M8 role-aware assistant tests passed: student class isolation, role audiences, institution/department filters, viewer scope, source links, empty results and fallback hooks.");
// Launcher diagnostics remain visible on mobile and update an existing fallback rather than hiding the cause.
assert.ok(fs.readFileSync("js/app-shell.js","utf8").includes('link.textContent="Ask ExamGuru unavailable · "+stage'));
assert.ok(fs.readFileSync("js/app-shell.js","utf8").includes('window.__egKnowledgeAssistantDiagnostic={stage,message:detail||null,role:auth.role||"unknown"}'));
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes('window.__examGuruKnowledgeAssistantLoaded&&window.ExamGuruKnowledgeAssistant'),"a partial earlier load must not block API recovery");

const assistantSource=fs.readFileSync("js/knowledge-assistant.js","utf8");
assert.ok(assistantSource.includes('readJson("data/visual-revision.json")'),"assistant must retrieve the published Visual Revision catalogue from GitHub Pages");
assert.ok(assistantSource.includes('readJson("data/knowledge-base.json")'),"assistant must retrieve the published Knowledge Base manifest from GitHub Pages");
assert.ok(assistantSource.includes("model.bankSources(catalog,query)"),"question-bank discovery must be driven by the published class catalogue");
assert.ok(assistantSource.includes("answerBankCount(query)"),"question-bank counts must use the generic multi-bank count path");
assert.ok(assistantSource.includes("readJson('data/classes.json')"),"the assistant must load the published class and subject catalogue");
assert.ok(assistantSource.includes("bankQuestionItems(bank)"),"question counts must support both chapter-grouped and flat exam-paper bank formats");
assert.ok(assistantSource.includes("GitHub-hosted published files"),"assistant must disclose the GitHub-only retrieval boundary");
assert.ok(assistantSource.includes("NOT an authorization boundary")||assistantSource.includes("not available in this GitHub-only version"),"assistant must disclose that private institution and cross-user data are unavailable");
assert.ok(!assistantSource.includes("C10Api"),"assistant must not depend on the external API client");
assert.ok(!assistantSource.includes("/api/assistant/query"),"assistant must not call a server endpoint");
assert.ok(!assistantSource.includes("localStorage"),"assistant must not persist retrieved platform or learner data in browser storage");
assert.ok(assistantSource.includes("friendlyError")===false,"the old server-only error handler must not remain");
const worker=fs.readFileSync("cloudflare/worker.js","utf8");
assert.ok(!worker.includes("async function assistantQuery"),"M8 must not add an Ask ExamGuru Worker endpoint");
assert.ok(assistantSource.includes("fetch(asset(path)"),"published source files must be fetched directly from GitHub Pages");
assert.ok(assistantSource.includes("model.search(index,query,5)"),"repository content must be searched through the role-aware retrieval model");
assert.ok(assistantSource.includes("sourceType:'question-bank'"),"published question-bank content must be indexed for topic search");
assert.ok(assistantSource.includes("loadIndex(auth,query)"),"retrieval must scope published bank loading to the user's query");
console.log("M8 GitHub-only assistant tests passed: repository-backed retrieval, source links, no external API and no Cloudflare assistant endpoint.");
