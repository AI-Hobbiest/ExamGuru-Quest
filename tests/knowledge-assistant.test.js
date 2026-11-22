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
 {resourceId:"c6-notes",title:"Food notes",summary:"Class 6 nutrition notes",subject:"science",chapter:"Food",path:"knowledge/food.pdf",status:"published",classIds:["6"]},
 {resourceId:"draft",title:"Private draft",summary:"not published",path:"draft.pdf",status:"draft",classIds:["6"]},
 {resourceId:"c10",title:"Class 10 notes",summary:"Class 10",path:"knowledge/c10.pdf",status:"published",classIds:["10"]}
]};
const index=model.buildIndex(visual,manifest,"6");
assert.equal(index.length,3,"index includes only matching class cards and published resources");
assert.ok(model.search(index,"carbohydrates energy").some(item=>item.id==="food-1"));
assert.ok(model.search(index,"balanced diet").some(item=>item.id==="food-2"));
assert.ok(model.search(index,"nutrition notes").some(item=>item.id==="c6-notes"));
assert.equal(model.search(index,"photosynthesis").length,0,"other-class content must not leak into the class index");
assert.equal(model.search(index,"unrelated").length,0);
assert.equal(model.answer([],"unknown").sources.length,0);
assert.equal(model.answer(model.search(index,"carbohydrates"),"carbohydrates").sources[0].title,"Nutrients");
assert.ok(fs.readFileSync("js/knowledge-assistant.js","utf8").includes("examguru-auth-state-ready"));
assert.ok(fs.readFileSync("css/knowledge-assistant.css","utf8").includes(".eg-ka-panel"));
console.log("M8 Knowledge Assistant tests passed: class-scoped retrieval, publication filtering, ranking, source links and empty-result behavior.");