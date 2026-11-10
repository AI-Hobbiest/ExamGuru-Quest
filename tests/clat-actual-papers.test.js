"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const catalog=JSON.parse(fs.readFileSync("data/clat/actual-papers.json","utf8"));
const html=fs.readFileSync("clat.html","utf8");
const controller=fs.readFileSync("js/clat-practice.js","utf8");
assert.equal(catalog.kind,"clat-actual-papers-catalog");
assert.deepEqual(catalog.papers.map(p=>p.examYear).sort(),[2022,2023,2024,2025,2026]);
const expected={2022:[150,150],2023:[150,149],2024:[120,118],2025:[120,113],2026:[120,119]};
for(const paper of catalog.papers){
 const [questions,marks]=expected[paper.examYear];
 assert.equal(paper.questionCount,questions,"Question count for "+paper.examYear);
 assert.equal(paper.evaluatedOutOf,marks,"Final evaluated marks for "+paper.examYear);
 assert.equal(paper.durationMinutes,120);
 for(const field of ["title","examDate","formatNote","setNote","scoringNote","questionUrl","answerKeyUrl","sourceArchiveUrl"])assert.ok(paper[field],"Missing "+field+" for "+paper.examYear);
 for(const field of ["questionUrl","answerKeyUrl","sourceArchiveUrl"])assert.match(paper[field],/^https:\/\//);
 assert.match(paper.sourceArchiveUrl,/web\.archive\.org\/web\//);
}
assert.match(catalog.papers.find(p=>p.examYear===2025).scoringNote,/113 marks/);
assert.match(catalog.papers.find(p=>p.examYear===2025).scoringNote,/Seven questions were withdrawn/);
assert.match(catalog.papers.find(p=>p.examYear===2026).examDate,/2025/);
assert.ok(html.includes('id="actualPaperList"')&&html.includes('id="pyqStatus"'),"Actual-paper section is not mounted in CLAT page");
assert.ok(controller.includes("./data/clat/actual-papers.json")&&controller.includes("renderActualPapers"),"CLAT practice controller does not load the actual-paper catalogue");
console.log("CLAT actual PYQ catalogue passed: latest five completed editions, Consortium archive source links, final-key links and corrected evaluation totals (150/150, 150/149, 120/118, 120/113, 120/119).");
