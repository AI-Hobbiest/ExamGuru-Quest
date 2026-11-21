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
const physics=manifest.subjects.find(s=>s.id==="physics");
assert.ok(physics.chapters.every(c=>c.items.some(i=>i.type==="FORMULA_IDENTITY"||i.type==="KEY_RESULT")));
assert.ok(physics.chapters.every(c=>c.items.some(i=>i.asset)),"each Physics chapter should include a visual asset");
assert.ok(physics.chapters.find(c=>c.chapterKey==="electricity").items.some(i=>i.type==="DERIVATION"),"Physics must include derivations, not only formula lists");
const page=fs.readFileSync("study.html","utf8"),script=fs.readFileSync("js/chapter-reference-hub.js","utf8");
assert.ok(page.includes('id="chapterReferenceHub"')&&page.includes("chapter-reference-hub.js"));
assert.ok(page.includes("chapter-reference-hub.css"));
assert.ok(script.includes('img.loading="lazy"')&&script.includes("chapter-reference.json"));
assert.ok(script.includes('viewerClass!=="10"'),"Class 10 reference hub must not appear for other classes");
assert.ok(script.includes("await window.C10StudyAccessReady"),"Reference hub must wait for role/session restoration before class gating");
assert.ok(page.includes('id="visualLibraryTab"')&&page.includes('id="referencesHubTab"'),"Study Library must expose both top-level tabs");
assert.ok(page.includes('data-study-tab="visualRevisionBoard"')&&page.includes('data-study-tab="chapterReferenceHub"'),"Study Library tabs must target their content sections");
assert.ok(page.includes('id="chapterReferenceHub" aria-labelledby="crhTitle" hidden'),"References Hub must start hidden behind its tab");
assert.ok(fs.readFileSync("js/study-library.js","utf8").includes("initStudyLibraryTabs"),"Study Library tab navigation must be wired");
new Function(script);
console.log("Chapter Reference Hub checks passed: 14 Mathematics, 5 Biology, 4 Chemistry, 4 Physics chapters; SVG integrity, subject-specific content, lazy loading and class gating.");
