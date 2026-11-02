"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const context={window:{},Date,Math,JSON,Object,Array,String,RegExp,Set};
context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync("js/study-model.js","utf8"),context);
const model=context.window.C10StudyModel;
const manifest={schemaVersion:1,kind:"knowledge-base-manifest",resources:[
 {resourceId:"sci6",title:"Class 6 Science notes",type:"notes",subject:"science",chapter:"Food",path:"knowledge/science/food-notes.pdf",status:"published",classIds:["6"],summary:"Notes on nutrition."},
 {resourceId:"math10",title:"Algebra guide",type:"textbook-pdf",subject:"mathematics",chapter:"Algebra",path:"knowledge/math/algebra.pdf",status:"published",classIds:["10"]},
 {resourceId:"draft",title:"Draft",type:"notes",path:"knowledge/draft.pdf",status:"draft"}
]};
assert.equal(model.isValidManifest(manifest),true);
assert.equal(model.visibleResources(manifest,"6").length,1,"only published resources for the active class are visible");
assert.equal(model.visibleResources(manifest,"10").length,1);
assert.equal(model.visibleResources(manifest,"3").length,0);
assert.equal(model.filterResources(model.visibleResources(manifest,"6"),{query:"nutrition"}).length,1);
assert.equal(model.filterResources(model.visibleResources(manifest,"6"),{subject:"mathematics"}).length,0);
assert.equal(JSON.stringify(model.toggleId(["a","b"],"a")),JSON.stringify(["b"]));
assert.equal(JSON.stringify(model.toggleId(["b"],"a")),JSON.stringify(["b","a"]));
assert.equal(model.safePath("../private.pdf"),false);
assert.equal(model.safePath("/root.pdf"),false);
assert.equal(model.safePath("https://example.com/file.pdf"),false);
assert.equal(model.safePath("knowledge/class-6/notes.pdf"),true);
assert.equal(model.isValidManifest({...manifest,resources:[{...manifest.resources[0],path:"../secret"}]}),false);
const normalized=model.normalizeProgress({completedResourceIds:["a","a"],bookmarkedResourceIds:["b"]});
assert.deepEqual(Array.from(normalized.completedResourceIds),["a"]);
assert.equal(normalized.kind,"study-library-progress");
const page=fs.readFileSync("study.html","utf8");
const script=fs.readFileSync("js/study-library.js","utf8");
assert.ok(page.includes('id="studyResourceList"')&&page.includes('id="studySearch"'));
assert.ok(page.includes("study-model.js")&&page.includes("study-library.js"));
assert.ok(script.includes('status==="published"')||script.includes("visibleResources"));
new Function(fs.readFileSync("js/study-library.js","utf8"));
console.log("Study Library tests passed: manifest validation, class visibility, publication filtering, search, safe relative paths and local progress.");
