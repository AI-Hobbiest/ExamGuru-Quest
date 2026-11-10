"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const engine = require("../js/clat-engine.js");
const nums = n => String(n).padStart(3,"0");
const legacy = [1,2,3,4,5].map(n => JSON.parse(fs.readFileSync("data/clat/drafts/clat-ug27-full-"+nums(n)+".json","utf8")));
const rebuilds = [6,7,8,9,10].map(n => JSON.parse(fs.readFileSync("data/clat/rebuilds/clat-ug27-full-"+nums(n)+"-r2.json","utf8")));
const next = [11,12,13,14,15].map(n => JSON.parse(fs.readFileSync("data/clat/rebuilds/clat-ug27-full-"+nums(n)+"-r1.json","utf8")));
const batch = JSON.parse(fs.readFileSync("data/clat/model-papers-batch-03.json","utf8"));
assert.equal(batch.kind,"clat-model-paper-batch"); assert.equal(batch.batchNumber,3); assert.equal(batch.releaseType,"practice-pilot");
assert.deepEqual(batch.papers.map(p=>p.paperNumber),[11,12,13,14,15]);
const sectionCounts={english:24,"current-affairs":30,legal:30,logical:24,quantitative:12};
const expectedQT={
11:["456 tonnes","1,347.6 tonnes","1,307.6 tonnes","₹8.4 lakh","4,500 kilolitres","11,700 kilolitres","585 kilolitres","3,149.25 kilolitres","₹1.152 crore","₹40.32 lakh","₹74.88 lakh","₹6.42 lakh"],
12:["₹4.1 lakh crore","₹32,800 crore","18%","₹3.362 lakh crore","₹0.08 lakh crore","3.26%","₹5.3352 lakh crore","₹0.1252 lakh crore surplus","₹24 crore","₹16.8 crore","₹18 crore","₹58.8 crore"],
13:["162 hours","126 hours","36 hours","16 stations","₹90 crore","₹36 crore","₹60 crore","29.41% approximately","21,170 objects","1,500,000 objects","144.9% approximately","1,568,450 objects"],
14:["2.96 goals","65,490 spectators","6.5 matches","50%","84.6% approximately","2 venues","About 454,545 students","66 initiatives","₹14.4 crore","₹9 crore","₹12.6 crore","₹10.8 crore"],
15:["102.90","105.47 approximately","108.43 approximately","8.43 points","80 units","100 units","20 units","25%","₹36 crore","₹48 crore","₹36 crore","₹45 crore"]
};
for(const [i,p] of next.entries()){
 const no=i+11; assert.equal(p.status,"draft-unpublished"); assert.equal(p.paperId,"clat-ug27-full-"+nums(no));
 assert.equal(p.durationMinutes,120); assert.equal(p.questions.length,120); assert.equal(p.passages.length,23);
 const v=engine.validatePaper(p,{strictCLAT:true}); assert.equal(v.valid,true,"Paper "+no+": "+v.errors.join(" | "));
 assert.deepEqual(v.counts,sectionCounts);
 const pc=Object.fromEntries(["english","current-affairs","legal","logical","quantitative"].map(s=>[s,p.passages.filter(x=>x.sectionId===s).length]));
 assert.deepEqual(pc,{english:4,"current-affairs":6,legal:6,logical:4,quantitative:3});
 const key={o1:0,o2:0,o3:0,o4:0},display=[0,0,0,0],diff={easy:0,moderate:0,challenging:0}; let run=1,maxRun=1,prev=-1;
 for(const q of p.questions){assert.equal(q.options.length,4,q.questionId);assert.equal(new Set(q.options.map(o=>o.text.trim().toLowerCase())).size,4,q.questionId);
  const pos=q.options.findIndex(o=>o.optionId===q.correctOptionId);assert.ok(pos>=0,q.questionId);key[q.correctOptionId]++;display[pos]++;run=pos===prev?run+1:1;maxRun=Math.max(maxRun,run);prev=pos;diff[q.difficulty]++;}
 assert.deepEqual(key,{o1:30,o2:30,o3:30,o4:30}); assert.deepEqual(display,[30,30,30,30]); assert.ok(maxRun<=4);
 assert.deepEqual(diff,{easy:24,moderate:72,challenging:24});
 assert.ok(new Set(p.passages.filter(x=>x.sectionId==="current-affairs").map(x=>x.domain)).size>=4);
 for(const passage of p.passages){const w=passage.text.trim().split(/\s+/).filter(Boolean).length;const band=passage.sectionId==="current-affairs"?[350,450]:passage.sectionId==="quantitative"?[70,320]:[380,520];assert.ok(w>=band[0]&&w<=band[1],passage.passageId+" "+w);
  if(passage.sectionId==="current-affairs"){assert.ok(passage.asOf&&passage.sources&&passage.sources.length,passage.passageId);for(const src of passage.sources){assert.ok(src.title&&src.publisher&&src.date,passage.passageId);assert.match(src.url,/^https:\/\//,passage.passageId);}}}
 const qt=p.questions.filter(q=>q.sectionId==="quantitative");assert.equal(qt.length,12);
 assert.deepEqual(qt.map(q=>q.options.find(o=>o.optionId===q.correctOptionId).text),expectedQT[no],"Paper "+no+" independently checked QT keys");
}
for(const [i,p] of batch.papers.entries()){assert.equal(p.paperNumber,i+11);assert.equal(p.status,"practice-pilot");assert.equal(p.questions.length,120);const v=engine.validatePaper(p,{strictCLAT:true});assert.equal(v.valid,true,"Release paper "+p.paperNumber+": "+v.errors.join(" | "));}
const integrity=engine.validateLibrary({papers:[...legacy,...rebuilds,...next]},{expectedPaperCount:15});
assert.equal(integrity.valid,true,integrity.errors.join(" | "));assert.equal(integrity.paperCount,15);assert.equal(integrity.questionCount,1800);
assert.equal(integrity.uniqueQuestionStems,1800);assert.equal(integrity.uniquePassages,344);
console.log("CLAT batch 03 passed: Papers 011–015; 600 questions; strict blueprint, source metadata, passage bands, balanced displayed keys, difficulty, 60 QT answer keys and cross-paper exact uniqueness for all 1,800 questions / 344 passages.");
