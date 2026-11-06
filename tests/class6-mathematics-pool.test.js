"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const g=ctx.window.ExamPaperGenerator;
const blueprint=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-6-mathematics-core-2026-27.json","utf8"));
const base=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-6-mathematics-core-2026-27-v1.json","utf8"));
const practice=JSON.parse(fs.readFileSync("data/class-6-mathematics.json","utf8"));
const bp={...blueprint,status:"ready"};
const bpCheck=g.validateBlueprint(bp);assert.equal(bpCheck.valid,true,bpCheck.errors.join(" | "));assert.equal(bpCheck.readyForGeneration,true);
const bankCheck=g.validateQuestionBank(base,{classId:"6",subjectId:"mathematics",academicYear:"2026-27"});assert.equal(bankCheck.valid,true,bankCheck.errors.slice(0,20).join(" | "));
assert.ok(base.questions.every(q=>q.approvalStatus==="review"),"new written questions must remain in review until independently checked");

const chapterUnit={"patterns-in-mathematics":"number-sense","number-play":"number-sense","prime-time":"number-sense","fractions":"number-sense","the-other-side-of-zero":"number-sense","lines-and-angles":"geometry-spatial","playing-with-constructions":"geometry-spatial","symmetry":"geometry-spatial","data-handling-and-presentation":"measurement-data","perimeter-and-area":"measurement-data"};
assert.deepEqual([...new Set(base.questions.map(q=>q.chapterId))].sort(),Object.keys(chapterUnit).sort(),"written candidates must map across all ten textbook chapters");
for(const q of base.questions){
 assert.equal(chapterUnit[q.chapterId],q.unitId,"chapter/unit mapping mismatch for "+q.questionId);
 assert.ok(q.answerKey&&q.answerKey.modelAnswer,"every review candidate must have a model answer");
 assert.equal(q.markingScheme.reduce((n,m)=>n+m.marks,0),q.marks,"marking scheme must total the question marks: "+q.questionId);
 if(q.type==="case-based"){
  assert.equal(q.parts.reduce((n,p)=>n+p.marks,0),q.marks,"case parts must total the case marks");
  assert.ok(q.parts.every(p=>p.answerKey&&p.answerKey.modelAnswer&&p.markingScheme.reduce((n,m)=>n+m.marks,0)===p.marks),"each case part needs its own answer key and marking scheme");
 }
}

assert.equal(base.questions.length,340,"written-response pool must contain 340 review candidates");
const contentKeys=base.questions.map(q=>[q.prompt,q.stimulus||"",...(q.parts||[]).map(p=>p.prompt)].join(" ").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim());
assert.equal(new Set(contentKeys).size,340,"all written prompts and case-study content combinations must be distinct");
const correctedCase=base.questions.find(q=>q.questionId==="C6M-CASE4-MD-AN-003");
assert.ok(correctedCase.answerKey.modelAnswer.includes("64 m²"),"the Garden B area answer key must be mathematically correct");
assert.deepEqual(base.questions.reduce((m,q)=>{m[q.type]=(m[q.type]||0)+1;return m;},{}),{"very-short-answer":100,"short-answer":100,"long-answer":80,"case-based":60});
assert.equal(practice.length,10);assert.equal(practice.reduce((n,c)=>n+c.questions.length,0),1043);
const reviewSimulation={...base,questions:base.questions.map(q=>({...q,approvalStatus:"approved"})),questionPoolStatus:"review-simulation-only"};
const integrated=g.mergeQuestionBanks(reviewSimulation,practice,bp,{minimumCandidatesPerSlot:20});
assert.equal(integrated.stats.coverage.valid,true,integrated.stats.coverage.errors.join(" | "));
assert.equal(integrated.stats.coverage.slotCount,38);
assert.ok(integrated.stats.coverage.coverage.every(slot=>slot.eligibleCount>=20),"every Class 6 Maths slot must have at least 20 eligible approved candidates");
assert.ok(integrated.stats.byChapter["playing-with-constructions"]>=20);
assert.ok(integrated.stats.byChapter.symmetry>=20);
assert.ok(integrated.stats.byChapter.fractions>=50);
const history=[],fingerprints=[];
const expectedTypes={"mcq":20,"very-short-answer":5,"short-answer":6,"long-answer":4,"case-based":3};
const countBy=(rows,key)=>rows.reduce((m,q)=>{m[q[key]]=(m[q[key]]||0)+1;return m;},{});
for(let attempt=1;attempt<=75;attempt++){
 const previous=history.slice(-5);
 const paper=g.generateUniquePaper(bp,integrated.bank,{
  seed:"class6-mathematics-75-paper-release-"+attempt,
  recentPaperFingerprints:fingerprints.slice(-75),
  recentQuestionIdSets:previous,
  uniqueSearchAttempts:1000,
  maxSearchAttempts:250000
 });
 const check=g.validatePaper(paper,bp);assert.equal(check.valid,true,"Paper "+attempt+": "+check.errors.join(" | "));
 assert.equal(paper.questions.length,38);assert.equal(paper.totalMarks,80);
 assert.equal(new Set(paper.questions.map(q=>q.questionId)).size,38,"no question may repeat within a paper");
 assert.deepEqual(countBy(paper.questions,"type"),expectedTypes);
 assert.deepEqual(countBy(paper.questions,"difficulty"),{easy:8,medium:24,hard:6});
 assert.deepEqual(countBy(paper.questions,"unitId"),{"number-sense":29,"geometry-spatial":25,"measurement-data":26});
 assert.deepEqual(countBy(paper.questions,"competency"),{"knowledge-understanding":38,"application":28,"analysis-evaluation-creation":14});
 const ids=paper.questions.flatMap(q=>g.questionContentIds(q));
 assert.equal(paper.repeatProtection.requestedWindow,5);
 assert.equal(paper.repeatProtection.appliedWindow,Math.min(5,history.length));
 for(const prior of previous){const priorIds=new Set(prior);assert.ok(!ids.some(id=>priorIds.has(id)),"No question or nested case part may repeat within the previous five papers.");}
 const fingerprint=g.paperFingerprint(paper);assert.ok(fingerprint);assert.ok(!fingerprints.includes(fingerprint),"full paper combination must be unique");
 fingerprints.push(fingerprint);history.push(ids);
}
assert.equal(fingerprints.length,75);assert.equal(new Set(fingerprints).size,75);
const bytes=Buffer.byteLength(JSON.stringify(base));assert.ok(bytes<400000,"minified written bank should remain compact");
const storedBytes=fs.statSync("data/exam-papers/question-banks/class-6-mathematics-core-2026-27-v1.json").size;
assert.ok(storedBytes<450000,"pretty-printed written bank must stay below the 450 KB storage guard");
console.log("Class 6 Mathematics pool release gate passed: 1,043 linked MCQs + 340 written review candidates (approval simulated only for generation QA); all 38 slots have 20+ eligible candidates; 75 distinct 38-question/80-mark papers generated with exact blueprint distributions and five-paper all-format repeat protection.");
