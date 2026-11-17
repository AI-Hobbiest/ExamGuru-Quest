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
const theme=read("css/theme-soft-spectrum.css");
assert.ok(page.includes('class="study-summary eg-metric-grid"'),"Study Library metric wrapper must use the shared grid component");
assert.ok(page.includes('class="study-stat eg-metric-card"'),"Study Library metric tiles must use the shared metric card component");
assert.ok(page.includes('class="eg-preview-banner"')&&!page.includes('id="studyPreviewNotice" hidden style='),"Admin preview banner must use the shared banner component without inline theme styles");
assert.ok(theme.includes("body.c10-shell-ready .eg-metric-grid{")&&theme.includes("background:transparent!important"),"shared metric grid wrapper must remain transparent");
assert.ok(theme.includes("body.eg-theme-dark.c10-shell-ready .eg-metric-grid > .eg-metric-card"),"shared metric cards must have a dark-mode surface");
assert.ok(theme.includes("body.eg-theme-dark.c10-shell-ready .eg-preview-banner"),"Admin preview banner must have a dark-mode surface");
assert.ok(theme.includes("body.eg-theme-dark.c10-shell-ready .study-panel"),"Study Library panels must use dark-mode surfaces");
assert.ok(theme.includes("body.eg-theme-dark.c10-shell-ready .study-card"),"Study Library resource cards must use dark-mode surfaces");
assert.ok(script.includes('card.className="study-card eg-surface-card"'),"resource cards must use the shared surface component");
assert.ok(page.includes('class="study-panel eg-surface-panel"'),"resource browser panel must use the shared surface component");
assert.ok(theme.includes("body.eg-theme-dark.c10-shell-ready .eg-surface-card"),"shared surface cards must have a dark-mode surface");
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
  assert.ok(matches[0].chapters.every(ch=>ch.cards.length>=8),"Each Class 10 chapter needs a complete multi-card quick reference");
}
assert.equal(class10Boards.reduce((n,b)=>n+b.chapters.length,0),119,"Class 10 board must contain all chapter/topic and map-work boards");
assert.equal(class10Boards.reduce((n,b)=>n+b.chapters.reduce((m,ch)=>m+ch.cards.length,0),0),952,"Class 10 must contain eight revision cards per chapter/topic board");
const class10CardIds=class10Boards.flatMap(board=>board.chapters.flatMap(ch=>ch.cards.map(card=>card.id)));
assert.equal(new Set(class10CardIds).size,class10CardIds.length,"Class 10 revision card IDs must be globally unique");
for(const board of class10Boards)for(const chapter of board.chapters){
  const types=chapter.cards.map(card=>card.type);
  assert.ok(types.includes("fact")&&types.includes("steps")&&types.includes("compare"),"Every Class 10 board must include key facts, a method and a comparison: "+chapter.title);
  assert.ok(types.filter(type=>type==="recall").length>=2,"Every Class 10 topic must include at least two active-recall checks: "+chapter.title);
  assert.ok(types.filter(type=>type==="exam-alert").length>=1,"Every Class 10 topic must include exam guidance: "+chapter.title);
  const recalls=chapter.cards.filter(card=>card.type==="recall");
  assert.equal(new Set(recalls.map(card=>card.question)).size,recalls.length,"Recall questions must be unique within "+chapter.title);
  assert.ok(chapter.cards.find(card=>card.type==="fact").facts.length>=3,"Key-fact cards must include at least three points: "+chapter.title);
  assert.ok(chapter.cards.find(card=>card.type==="steps").steps.length>=3,"Method cards must include at least three steps: "+chapter.title);
}
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
  assert.ok(cards.filter(card=>/c10-(hia|hib)-/.test(card.id)).every(card=>!["Key points at a glance","Build a strong answer","Think one step further","Board-answer checkpoint"].includes(card.title)),"New Hindi quick-reference cards must use Hindi titles");
}
assert.ok(!class10Boards.find(b=>b.subject==="hindi-course-a").chapters.some(ch=>/जॉर्ज पंचम की नाक|एही ठैयाँ|छाया मत छूना|कन्यादान|स्त्री-शिक्षा|मानवीय करुणा/.test(ch.title)),"Hindi A excluded texts must not appear");
assert.ok(!class10Boards.find(b=>b.subject==="hindi-course-b").chapters.some(ch=>/गिरगिट|बिहारी|मधुर-मधुर/.test(ch.title)),"Hindi B excluded texts must not appear");

const class6Boards=visual.boards.filter(board=>String(board.classId)==="6");
const expectedClass6=["mathematics","science","social-science","english","hindi"];
for(const subject of expectedClass6){
 const matches=class6Boards.filter(board=>board.subject===subject);
 assert.equal(matches.length,1,"Class 6 must have exactly one board for "+subject);
 assert.ok(matches[0].chapters.every(ch=>ch.cards.length>=8),"Every Class 6 topic needs a complete multi-card quick reference");
}
assert.deepEqual(class6Boards.map(board=>board.subject).sort(),expectedClass6.slice().sort(),"Class 6 core subjects must be complete");
assert.equal(class6Boards.reduce((n,b)=>n+b.chapters.length,0),65,"Class 6 must cover all 65 core subject topics and reading texts");
assert.equal(class6Boards.reduce((n,b)=>n+b.chapters.reduce((m,ch)=>m+ch.cards.length,0),0),644,"Class 6 must contain comprehensive chapter quick-reference cards");
const class6CardIds=class6Boards.flatMap(board=>board.chapters.flatMap(ch=>ch.cards.map(card=>card.id)));
assert.equal(new Set(class6CardIds).size,class6CardIds.length,"Class 6 revision card IDs must be globally unique");

for(const board of class6Boards)for(const chapter of board.chapters){
 const types=chapter.cards.map(card=>card.type);
 assert.ok(types.filter(type=>type==="recall").length>=2,"Each Class 6 chapter must include multiple active-recall checks: "+chapter.title);
 assert.ok(types.includes("concept")&&types.includes("fact"),"Each Class 6 chapter must include core concepts and key facts: "+chapter.title);
}
const everyCardId=visual.boards.flatMap(board=>board.chapters.flatMap(ch=>ch.cards.map(card=>card.id)));
assert.equal(new Set(everyCardId).size,everyCardId.length,"Revision card IDs must be unique across all classes and subjects");

const class6Science=class6Boards.find(board=>board.subject==="science");
assert.equal(class6Science.chapters.length,12,"Curiosity Science must cover all 12 chapters");
assert.ok(class6Science.chapters.find(ch=>ch.title==="The Wonderful World of Science").cards.some(card=>(card.note||"").includes("non-evaluative")),"The opening Science chapter must be labelled non-evaluative");
assert.equal(class6Boards.find(board=>board.subject==="mathematics").chapters.length,10,"Ganita Prakash 2026-27 must cover all 10 Class 6 chapters");
assert.deepEqual(class6Boards.find(board=>board.subject==="mathematics").chapters.map(ch=>ch.title),["Patterns in Mathematics","Lines and Angles","Number Play","Data Handling and Presentation","Prime Time","Perimeter and Area","Fractions","Playing with Constructions","Symmetry","The Other Side of Zero"],"Ganita Prakash chapters must match the 2026-27 NCERT contents");
assert.equal(class6Boards.find(board=>board.subject==="social-science").chapters.length,14,"Exploring Society must cover all 14 chapters");
assert.equal(class6Boards.find(board=>board.subject==="english").chapters.length,16,"Poorvi must cover all 16 reading texts");
assert.equal(class6Boards.find(board=>board.subject==="hindi").chapters.length,13,"Malhar must cover all 13 chapters");
const hindi6Cards=class6Boards.find(board=>board.subject==="hindi").chapters.flatMap(ch=>ch.cards);
assert.ok(hindi6Cards.every(card=>card.typeLabel&&(card.type!=="recall"||(card.revealLabel&&card.hideLabel))),"Class 6 Hindi cards must use Hindi labels");

