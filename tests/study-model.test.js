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


const visual=JSON.parse(fs.readFileSync("data/visual-revision.json","utf8"));
assert.equal(visual.schemaVersion,1);
assert.equal(visual.kind,"visual-revision-manifest");
assert.ok(Array.isArray(visual.boards)&&visual.boards.length>0);
for(const board of visual.boards){
  assert.ok(/^\d+$/.test(String(board.classId)));
  assert.ok(typeof board.subject==="string"&&Array.isArray(board.chapters));
  for(const chapter of board.chapters){
    assert.ok(chapter.title&&chapter.chapterKey&&Array.isArray(chapter.cards));
    const ids=new Set();
    for(const card of chapter.cards){
      assert.ok(card.id&&card.title&&["concept","steps","compare","exam-alert","fact","recall","mnemonic"].includes(card.type));
      assert.ok(!ids.has(card.id),"revision card IDs must be unique within a chapter");
      ids.add(card.id);
      if(card.type==="steps")assert.ok(Array.isArray(card.steps)&&card.steps.length>0);
      if(card.type==="compare")assert.ok(card.left&&card.right);
      if(card.type==="fact")assert.ok(Array.isArray(card.facts)&&card.facts.length>0);
      if(card.type==="recall")assert.ok(card.question&&card.answer);
    }
  }
}
assert.ok(page.includes('id="visualRevisionBoard"'));
assert.ok(page.includes('id="vrbGrid"')&&page.includes('id="vrbSubject"')&&page.includes('id="vrbChapter"'));
assert.ok(script.includes("visual-revision.json"));
assert.ok(!page.includes('id="studyStatus" class="study-meta"'),"study load status must not duplicate the progress filter ID");
assert.ok(script.includes("loadVisualRevision")&&script.includes("renderVisualCards"));
assert.ok(script.includes("card.typeLabel||type.label")&&script.includes("card.revealLabel||\"Reveal answer\""),"revision cards must support localised labels and answer controls");
assert.ok(script.includes('chapter.chapterLabel||("Chapter "+chapter.chapterNo)'),"revision board must display syllabus-aware chapter labels");

const pagesWorkflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert.ok(page.includes(".vrb-card::before")&&page.includes(".vrb-card::after"),"sticky revision notes must render a pushpin head and stem");
assert.ok(pagesWorkflow.includes("ordinary website deployments will not download ZIPs")&&pagesWorkflow.includes("Manually dispatch this Pages workflow with refresh_cbse=true"),"ordinary website deploys must not fall back to CBSE PDF extraction");
console.log("Visual Revision pin and CBSE deployment-isolation checks passed.");

const class10Boards=visual.boards.filter(board=>String(board.classId)==="10");
const expectedClass10=["mathematics","science","social-science","english","hindi-course-a","hindi-course-b"];
for(const subject of expectedClass10){
  const matches=class10Boards.filter(board=>board.subject===subject);
  assert.equal(matches.length,1,"Class 10 must have exactly one board for "+subject);
  assert.ok(matches[0].chapters.length>=10,"Class 10 "+subject+" must have broad chapter coverage");
  assert.ok(matches[0].chapters.every(ch=>ch.cards.length>=3),"Each Class 10 chapter needs at least three quick-reference cards");
}
assert.equal(class10Boards.reduce((n,b)=>n+b.chapters.length,0),119,"Class 10 board must contain all chapter/topic and map-work boards");
assert.equal(class10Boards.reduce((n,b)=>n+b.chapters.reduce((m,ch)=>m+ch.cards.length,0),0),357,"Class 10 must contain three revision cards per chapter/topic board");
const class10CardIds=class10Boards.flatMap(board=>board.chapters.flatMap(ch=>ch.cards.map(card=>card.id)));
assert.equal(new Set(class10CardIds).size,class10CardIds.length,"Class 10 revision card IDs must be globally unique");
for(const subject of ["mathematics","science","social-science"]){
  const recalls=class10Boards.find(b=>b.subject===subject).chapters.map(ch=>ch.cards.find(card=>card.type==="recall"));
  assert.ok(recalls.every(card=>card&&card.question&&card.answer&&!card.question.startsWith("What is the key idea to remember from")),"Core subject recall prompts must be chapter-specific for "+subject);
  assert.equal(new Set(recalls.map(card=>card.question)).size,recalls.length,"Recall prompts must be unique within "+subject);
}
const sst=class10Boards.find(b=>b.subject==="social-science");
assert.ok(sst.chapters.find(ch=>ch.title==="Lifelines of National Economy (Map Work)"),"Map-only Lifelines chapter must be represented");
assert.ok(sst.chapters.find(ch=>ch.title==="The Age of Industrialisation").cards.some(card=>(card.note||"").includes("Periodic Assessment only")),"Periodic-assessment-only History topic must be included and labelled");
assert.ok(sst.chapters.find(ch=>ch.title==="The Making of a Global World").cards.some(card=>(card.note||"").includes("Project-only scope")),"Global World project-only topics must be distinguished from board scope");
const science=class10Boards.find(b=>b.subject==="science");
assert.ok(science.chapters.find(ch=>ch.title==="Periodic Classification of Elements").cards.some(card=>(card.note||"").includes("formative/portfolio only")),"Periodic Classification must be marked formative-only");
assert.ok(science.chapters.find(ch=>ch.title.startsWith("Heredity (Evolution")).cards.some(card=>(card.note||"").includes("formative enrichment")),"Evolution must be marked formative-only");
assert.equal(science.chapters.find(ch=>ch.title==="Life Processes").chapterLabel,"Chapter 5","Science chapter numbering must follow the 2026-27 syllabus");
assert.equal(science.chapters.find(ch=>ch.title==="Our Environment").chapterLabel,"Chapter 13","Science chapter numbering must follow the 2026-27 syllabus");
assert.ok(sst.chapters.every(ch=>ch.chapterLabel),"Social Science topics must show their subject-specific textbook chapter labels");
for(const subject of ["hindi-course-a","hindi-course-b"]){
 const cards=class10Boards.find(b=>b.subject===subject).chapters.flatMap(ch=>ch.cards);
 assert.ok(cards.every(card=>!["Core idea","What to write in an answer","Quick self-check"].includes(card.title)),"Hindi card titles must be localised");
 assert.ok(cards.filter(card=>card.type==="recall").every(card=>card.revealLabel==="उत्तर देखें"&&card.hideLabel==="उत्तर छिपाएँ"),"Hindi answer controls must be localised");
}
assert.ok(!class10Boards.find(b=>b.subject==="hindi-course-a").chapters.some(ch=>/जॉर्ज पंचम की नाक|एही ठैयाँ|छाया मत छूना|कन्यादान|स्त्री-शिक्षा|मानवीय करुणा/.test(ch.title)),"Hindi A excluded texts must not appear");
assert.ok(!class10Boards.find(b=>b.subject==="hindi-course-b").chapters.some(ch=>/गिरगिट|बिहारी|मधुर-मधुर/.test(ch.title)),"Hindi B excluded texts must not appear");
