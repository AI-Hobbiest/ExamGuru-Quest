"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const engine = require("../js/clat-engine.js");
const nums = n => String(n).padStart(3,"0");
const legacy = [1,2,3,4,5].map(n => JSON.parse(fs.readFileSync("data/clat/drafts/clat-ug27-full-"+nums(n)+".json","utf8")));
const rebuilds0610 = [6,7,8,9,10].map(n => JSON.parse(fs.readFileSync("data/clat/rebuilds/clat-ug27-full-"+nums(n)+"-r2.json","utf8")));
const rebuilds1115 = [11,12,13,14,15].map(n => JSON.parse(fs.readFileSync("data/clat/rebuilds/clat-ug27-full-"+nums(n)+"-r1.json","utf8")));
const rebuilds = [16,17,18,19,20].map(n => JSON.parse(fs.readFileSync("data/clat/rebuilds/clat-ug27-full-"+nums(n)+"-r1.json","utf8")));
const batch = JSON.parse(fs.readFileSync("data/clat/model-papers-batch-04.json","utf8"));
assert.equal(batch.kind,"clat-model-paper-batch");
assert.equal(batch.batchNumber,4);
assert.equal(batch.releaseType,"practice-pilot");
assert.deepEqual(batch.papers.map(p=>p.paperNumber),[16,17,18,19,20]);
const sectionCounts={english:24,"current-affairs":30,legal:30,logical:24,quantitative:12};
const expectedQT={
16:["32 GWh","32.6%","5 GWh","₹157.6 crore approximately","60 kilotonnes","₹420 crore","₹780 crore","₹2,400 crore","16 surveys","37.2%","11.8 surveys","47 surveys"],
17:["952 km","4.84 times","46.2 km","21 cities","11.14 million tonnes","8.32%","4.68 million tonnes","152.32 million tonnes","610 samples","31.7%","33.1 samples","100%"],
18:["₹3,788.04 crore","62.1%","₹757.61 crore approximately","71 courts","7 working days","8 days","4 working days","46.7%","1.31 lakh","2.882 lakh","65,500","13,100"],
19:["92 airports","2.24","27.5 rules","6 schedules","1,93,471","5.48 times","6.5 crore","2,747 articles","191.973 GW","61.6% approximately","About 3.47 years","4.6075 GW per month"],
20:["16 hours 10 minutes","15 hours 50 minutes","20 minutes","32 hours","₹56 lakh","₹13.7 lakh","24.5%","₹3.525 lakh","0.80 crore","65.2%","11,500 certificates","150 lakh"]
};
const sectionPassages={english:4,"current-affairs":6,legal:6,logical:4,quantitative:3};
for(const [i,p] of rebuilds.entries()){
 const no=i+16;
 assert.equal(p.status,"draft-unpublished");
 assert.equal(p.paperId,"clat-ug27-full-"+nums(no));
 assert.equal(p.durationMinutes,120);
 assert.equal(p.questions.length,120);
 assert.equal(p.passages.length,23);
 const v=engine.validatePaper(p,{strictCLAT:true});
 assert.equal(v.valid,true,"Paper "+no+": "+v.errors.join(" | "));
 assert.deepEqual(v.counts,sectionCounts);
 const pc=Object.fromEntries(Object.keys(sectionPassages).map(s=>[s,p.passages.filter(x=>x.sectionId===s).length]));
 assert.deepEqual(pc,sectionPassages);
 const key={o1:0,o2:0,o3:0,o4:0},display=[0,0,0,0],diff={easy:0,moderate:0,challenging:0};
 let run=1,maxRun=1,prev=-1;
 const stems=new Set();
 for(const q of p.questions){
  assert.ok(q.prompt&&q.explanation&&q.competency,q.questionId);
  assert.equal(q.options.length,4,q.questionId);
  assert.equal(new Set(q.options.map(o=>o.text.trim().toLowerCase().replace(/\s+/g," "))).size,4,q.questionId+" duplicate options");
  const pos=q.options.findIndex(o=>o.optionId===q.correctOptionId);
  assert.ok(pos>=0,q.questionId);
  assert.equal(q.answer,q.options[pos].text,q.questionId+" answer field mismatch");
  key[q.correctOptionId]++;display[pos]++;run=pos===prev?run+1:1;maxRun=Math.max(maxRun,run);prev=pos;diff[q.difficulty]++;
  const stem=q.prompt.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  assert.ok(!stems.has(stem),"duplicate stem inside paper "+no+": "+q.prompt);stems.add(stem);
 }
 assert.deepEqual(key,{o1:30,o2:30,o3:30,o4:30});
 assert.deepEqual(display,[30,30,30,30]);
 assert.ok(maxRun<=4);
 assert.deepEqual(diff,{easy:24,moderate:72,challenging:24});
 const domains=new Set(p.passages.filter(x=>x.sectionId==="current-affairs").map(x=>x.domain));
 assert.ok(domains.size>=4,"Paper "+no+" needs four current-affairs domains");
 for(const passage of p.passages){
  const w=passage.text.trim().split(/\s+/).filter(Boolean).length;
  const band=passage.sectionId==="current-affairs"?[350,450]:passage.sectionId==="quantitative"?[70,320]:[380,520];
  assert.ok(w>=band[0]&&w<=band[1],passage.passageId+" word count "+w);
  if(passage.sectionId==="current-affairs"){
   assert.ok(passage.asOf&&passage.sources&&passage.sources.length,passage.passageId);
   for(const src of passage.sources){assert.ok(src.title&&src.publisher&&src.date,passage.passageId);assert.match(src.url,/^https:\/\//,passage.passageId);}
  }
 }
 const qt=p.questions.filter(q=>q.sectionId==="quantitative");
 assert.equal(qt.length,12);
 assert.deepEqual(qt.map(q=>q.options.find(o=>o.optionId===q.correctOptionId).text),expectedQT[no],"Paper "+no+" independently recalculated QT keys");
}
for(const [i,p] of batch.papers.entries()){
 assert.equal(p.paperNumber,i+16);
 assert.equal(p.status,"practice-pilot");
 const check=engine.validatePaper(p,{strictCLAT:true});
 assert.equal(check.valid,true,"Release paper "+p.paperNumber+": "+check.errors.join(" | "));
 const raw=JSON.parse(JSON.stringify(rebuilds[i]));delete raw.status;
 const released=JSON.parse(JSON.stringify(p));delete released.status;
 assert.deepEqual(released,raw,"Published data differs from audited rebuild for paper "+p.paperNumber);
}
const integrity=engine.validateLibrary({papers:[...legacy,...rebuilds0610,...rebuilds1115,...rebuilds]},{expectedPaperCount:20});
assert.equal(integrity.valid,true,integrity.errors.join(" | "));
assert.equal(integrity.paperCount,20);
assert.equal(integrity.questionCount,2400);
assert.equal(integrity.uniqueQuestionStems,2400);
assert.equal(integrity.uniquePassages,459);
console.log("CLAT batch 04 passed: Papers 016–020; 600 questions; strict 120-question blueprint, sourced current affairs, passage bands, balanced answer keys, difficulty and 60 independently recalculated QT answers. Exact cross-paper uniqueness verified for 2,400 questions and 459 passages across papers 001–020.");
