"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const manifest=JSON.parse(fs.readFileSync("data/chapter-reference.json","utf8"));
assert.equal(manifest.kind,"chapter-reference-manifest");
assert.equal(manifest.classId,"10");
assert.deepEqual(manifest.subjects.map(s=>s.id),["mathematics","biology","chemistry","physics"]);
const expected={mathematics:14,biology:5,chemistry:4,physics:4};
for(const [id,count] of Object.entries(expected)){
 const subject=manifest.subjects.find(s=>s.id===id);
 assert.ok(subject,"missing "+id);
 assert.equal(subject.chapters.length,count,"chapter coverage for "+id);
 assert.equal(new Set(subject.chapters.map(c=>c.chapterKey)).size,count,"duplicate chapter key in "+id);
 for(const chapter of subject.chapters){
  assert.ok(chapter.chapterTitle&&chapter.items.length>=1,chapter.chapterKey+" needs reference content");
  for(const item of chapter.items){
   assert.ok(item.title&&item.type,chapter.chapterKey+" has an invalid item");
   if(item.asset)assert.ok(fs.existsSync(item.asset),"missing SVG/image asset "+item.asset);
  }
 }
}
const math=manifest.subjects.find(s=>s.id==="mathematics");
assert.ok(math.chapters.every(c=>c.items.some(i=>["THEOREM_PROOF","FORMULA_IDENTITY","KEY_RESULT"].includes(i.type))));
const chemistry=manifest.subjects.find(s=>s.id==="chemistry");
assert.ok(chemistry.chapters.every(c=>c.items.some(i=>i.type==="CHEMICAL_EQUATION")));
const biology=manifest.subjects.find(s=>s.id==="biology");
assert.ok(biology.chapters.every(c=>c.items.some(i=>i.type==="KEY_DIAGRAM"||i.type==="KEY_RESULT")));
assert.ok(biology.chapters.every(c=>c.items.some(i=>i.asset)),"each Biology chapter should include a visual asset");
assert.ok(biology.chapters.find(c=>c.chapterKey==="life-processes").items.some(i=>i.title==="Human heart — chambers and double circulation"&&i.asset==="assets/study-library/science/human-heart.svg"),"Life Processes must include a labelled heart visual");
const alimentary=biology.chapters.find(c=>c.chapterKey==="life-processes").items.find(i=>i.title==="Human alimentary canal — NCERT Figure 5.6");
assert.ok(alimentary,"Life Processes must include NCERT Figure 5.6");
assert.equal(alimentary.sourcePage,85,"alimentary canal figure must retain NCERT page reference");
assert.equal(alimentary.sourceFigure,"Figure 5.6");
assert.equal(alimentary.relatedActivity,"Activity 5.3 (same page; starch and saliva experiment)");
assert.equal(alimentary.labels.length,13,"alimentary canal redraw must preserve all 13 textbook labels");
assert.ok(fs.existsSync(alimentary.asset),"alimentary canal SVG must exist");
const alimentarySvg=fs.readFileSync(alimentary.asset,"utf8");
for(const label of ["Tongue","Mouth (Buccal cavity)","Oesophagus","Diaphragm","Gall bladder","Bile duct","Liver","Pancreas","Stomach","Small intestine","Large intestine","Appendix","Anus"])assert.ok(alimentarySvg.includes(label),"alimentary canal SVG missing label "+label);

assert.ok(biology.chapters.find(c=>c.chapterKey==="control-and-coordination").items.some(i=>i.title==="Human brain — major regions"&&i.asset==="assets/study-library/science/human-brain.svg"),"Control and Coordination must include a labelled brain visual");
assert.ok(biology.chapters.find(c=>c.chapterKey==="control-and-coordination").items.some(i=>i.title==="Neuron — structure and impulse direction"&&i.asset==="assets/study-library/science/neuron.svg"),"Control and Coordination must include a labelled neuron visual");
for(const path of ["assets/study-library/science/human-heart.svg","assets/study-library/science/human-brain.svg","assets/study-library/science/neuron.svg"]){assert.ok(fs.existsSync(path),"missing original NCERT-aligned illustration "+path);}
assert.ok(biology.chapters.flatMap(c=>c.items).filter(i=>i.illustrationType).every(i=>i.source&&i.alt),"original illustrations must show source context and alt text");
const physics=manifest.subjects.find(s=>s.id==="physics");
assert.ok(physics.chapters.every(c=>c.items.some(i=>i.type==="FORMULA_IDENTITY"||i.type==="KEY_RESULT")));
assert.ok(physics.chapters.every(c=>c.items.some(i=>i.asset)),"each Physics chapter should include a visual asset");
assert.ok(physics.chapters.find(c=>c.chapterKey==="electricity").items.some(i=>i.type==="DERIVATION"),"Physics must include derivations, not only formula lists");
const page=fs.readFileSync("study.html","utf8"),script=fs.readFileSync("js/chapter-reference-hub.js","utf8");
assert.ok(page.includes('id="chapterReferenceHub"')&&page.includes("chapter-reference-hub.js"));
assert.ok(page.includes("chapter-reference-hub.css"));
assert.ok(script.includes('img.loading="lazy"')&&script.includes("chapter-reference.json"));
assert.ok(script.includes('viewerClass!=="10"'),"Class 10 reference hub must not appear for other classes");
assert.ok(script.includes("Connecting to the Class 10 reference catalogue"),"Reference hub must expose its initialization state");
const deployWorkflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert.ok(deployWorkflow.includes("cp js/chapter-reference-hub.js _site/js/chapter-reference-hub.js"),"GitHub Pages must package the References Hub controller");
assert.ok(deployWorkflow.includes("cp css/chapter-reference-hub.css _site/css/chapter-reference-hub.css"),"GitHub Pages must package the References Hub stylesheet");
assert.ok(deployWorkflow.includes("test -s _site/js/chapter-reference-hub.js")&&deployWorkflow.includes("test -s _site/css/chapter-reference-hub.css"),"Deployment must fail if either References Hub asset is missing");
const access=fs.readFileSync("js/page-access.js","utf8");
assert.ok(access.includes("C10StudyViewerClassId"),"Page access must publish the resolved viewer class");
assert.ok(script.includes("window.C10StudyViewerClassId"),"Reference hub must use the resolved viewer class");
assert.ok(!script.includes("await window.C10StudyAccessReady"),"Reference catalogue initialization must never block on session refresh");

assert.ok(page.includes('id="visualLibraryTab"')&&page.includes('id="referencesHubTab"'),"Study Library must expose both top-level tabs");
assert.ok(page.includes('data-study-tab="visualRevisionBoard"')&&page.includes('data-study-tab="chapterReferenceHub"'),"Study Library tabs must target their content sections");
assert.ok(/<section[^>]*id="chapterReferenceHub"[^>]*hidden/.test(page),"References Hub must start hidden behind its tab");
assert.ok(fs.readFileSync("js/study-library.js","utf8").includes("initStudyLibraryTabs"),"Study Library tab navigation must be wired");
new Function(script);
console.log("Chapter Reference Hub checks passed: 14 Mathematics, 5 Biology, 4 Chemistry, 4 Physics chapters; original heart/brain/neuron/alimentary canal visuals, source notes, SVG integrity, lazy loading and class gating.");
