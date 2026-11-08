/* CLAT UG 2027 exam model engine. Independent of CBSE profiles and Cloud DB. */
(function(root){
"use strict";
const SECTIONS=Object.freeze([
 {id:"english",title:"English Language",min:22,max:26,target:24},
 {id:"current-affairs",title:"Current Affairs & General Knowledge",min:28,max:32,target:30},
 {id:"legal",title:"Legal Reasoning",min:28,max:32,target:30},
 {id:"logical",title:"Logical Reasoning",min:22,max:26,target:24},
 {id:"quantitative",title:"Quantitative Techniques",min:10,max:14,target:12}
]);
const DURATION_MINUTES=120,MAX_MARKS=120,NEGATIVE_MARK=-0.25;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
function validatePaper(paper,options){
 const errors=[],opts=options||{};
 if(!paper||typeof paper!=="object")return{valid:false,errors:["Paper must be an object."]};
 if(paper.kind!=="clat-model-paper")errors.push("kind must be clat-model-paper.");
 if(!paper.paperId||!paper.title)errors.push("paperId and title are required.");
 if(!Array.isArray(paper.passages)||!Array.isArray(paper.questions))errors.push("passages and questions arrays are required.");
 const passages=paper.passages||[],questions=paper.questions||[];
 const passageIds=passages.map(p=>String(p&&p.passageId||""));
 if(passageIds.some(id=>!id)||new Set(passageIds).size!==passageIds.length)errors.push("Passage IDs must be present and unique.");
 const questionIds=questions.map(q=>String(q&&q.questionId||""));
 if(questionIds.some(id=>!id)||new Set(questionIds).size!==questionIds.length)errors.push("Question IDs must be present and unique.");
 const knownPassages=new Set(passageIds),knownSections=new Set(SECTIONS.map(s=>s.id));
 questions.forEach((q,i)=>{
  const at="Question "+(i+1);
  if(!knownSections.has(q.sectionId))errors.push(at+" has an unknown section.");
  if(!knownPassages.has(q.passageId))errors.push(at+" references a missing passage.");
  if(!q.prompt||typeof q.prompt!=="string")errors.push(at+" needs a prompt.");
  if(!Array.isArray(q.options)||q.options.length!==4)errors.push(at+" must have exactly four options.");
  else{
   const ids=q.options.map(o=>String(o&&o.optionId||""));
   if(ids.some(id=>!id)||new Set(ids).size!==ids.length||!q.options.every(o=>o&&typeof o.text==="string"&&o.text.trim()))errors.push(at+" options need unique IDs and text.");
   if(!ids.includes(String(q.correctOptionId||"")))errors.push(at+" correctOptionId must match an option.");
  }
  if(!q.explanation||typeof q.explanation!=="string"||q.explanation.trim().length<30)errors.push(at+" needs a useful explanation (at least 30 characters).");
  const passage=passages.find(p=>p.passageId===q.passageId);
  if(passage&&passage.sectionId!==q.sectionId)errors.push(at+" section does not match its passage.");
 });
 passages.forEach((p,i)=>{
  if(!knownSections.has(p.sectionId))errors.push("Passage "+(i+1)+" has an unknown section.");
  if(!p.title||!p.text)errors.push("Passage "+(i+1)+" needs a title and text.");
 });
 const counts=Object.fromEntries(SECTIONS.map(s=>[s.id,questions.filter(q=>q.sectionId===s.id).length]));
 const fullLength=questions.length===120;
 if(opts.requireFullLength&&!fullLength)errors.push("A full-length CLAT paper must contain exactly 120 questions.");
 if(fullLength&&SECTIONS.some(s=>counts[s.id]<s.min||counts[s.id]>s.max))errors.push("Section counts must remain within the official CLAT 2027 ranges.");
 if(opts.strictCLAT){
  if(!fullLength)errors.push("Strict CLAT papers must contain exactly 120 questions.");
  if(Number(paper.durationMinutes)!==120)errors.push("Strict CLAT papers must have a 120-minute duration.");
  SECTIONS.forEach(s=>{if(counts[s.id]!==s.target)errors.push(s.title+" must contain exactly "+s.target+" questions in the standard blueprint.");});
  const passageQuestionCounts=Object.fromEntries(passages.map(p=>[p.passageId,questions.filter(q=>q.passageId===p.passageId).length]));
  passages.forEach((p,i)=>{
   const words=String(p.text||"").trim().split(/\s+/).filter(Boolean).length;
   const n=passageQuestionCounts[p.passageId]||0;
   if(p.sectionId==="quantitative"){
    if(words<70||words>320)errors.push("Quantitative data set "+(i+1)+" should be a concise, self-contained numerical set (70–320 words).");
    if(n<3||n>4)errors.push("Each Quantitative data set must support 3–4 questions.");
   }else if(p.sectionId==="current-affairs"){
    if(words<350||words>450)errors.push("Current Affairs passages must stay within the official up-to-450-word format (internal acceptance band 350–450 words).");
    if(n<4||n>6)errors.push("Each passage must support 4–6 questions.");
    if(!p.asOf||!Array.isArray(p.sources)||p.sources.length<1)errors.push("Every Current Affairs passage must include an as-of date and source metadata.");
    (p.sources||[]).forEach((source,j)=>{
     if(!source.title||!source.publisher||!source.date||!/^https:\/\//.test(String(source.url||"")))errors.push("Current Affairs passage "+(i+1)+" source "+(j+1)+" needs title, publisher, date and an HTTPS URL.");
    });
   }else{
    if(words<380||words>520)errors.push("English, Legal and Logical passages must be approximately 450 words (380–520 words).");
    if(n<4||n>6)errors.push("Each passage must support 4–6 questions.");
   }
  });
  const passageCounts=Object.fromEntries(SECTIONS.map(s=>[s.id,passages.filter(p=>p.sectionId===s.id).length]));
  const passageRanges={english:[4,6],"current-affairs":[5,7],legal:[5,7],logical:[4,6],quantitative:[3,4]};
  Object.entries(passageRanges).forEach(([id,range])=>{if(passageCounts[id]<range[0]||passageCounts[id]>range[1])errors.push(id+" must use "+range[0]+"–"+range[1]+" passage/data sets.");});
  questions.forEach((q,i)=>{
   if(!["easy","moderate","challenging"].includes(q.difficulty))errors.push("Question "+(i+1)+" needs a calibrated difficulty label.");
   if(!q.competency)errors.push("Question "+(i+1)+" needs a CLAT competency tag.");
  });
  const stems=questions.map(q=>String(q.prompt||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim());
  if(new Set(stems).size!==stems.length)errors.push("Question stems must be unique within each paper.");
  const keyCounts={o1:0,o2:0,o3:0,o4:0};
  questions.forEach(q=>{if(Object.prototype.hasOwnProperty.call(keyCounts,q.correctOptionId))keyCounts[q.correctOptionId]++;});
  if(Object.values(keyCounts).some(n=>n<24||n>36))errors.push("Correct-answer positions must be balanced (24–36 keys per option across 120 questions).");
  let keyRun=1;
  for(let i=1;i<questions.length;i++){if(questions[i].correctOptionId===questions[i-1].correctOptionId)keyRun++;else keyRun=1;if(keyRun>4){errors.push("Correct-answer positions must not repeat the same option more than four times consecutively.");break;}}
  const difficultyCounts={easy:0,moderate:0,challenging:0};
  questions.forEach(q=>{if(Object.prototype.hasOwnProperty.call(difficultyCounts,q.difficulty))difficultyCounts[q.difficulty]++;});
  if(difficultyCounts.easy<18||difficultyCounts.easy>36||difficultyCounts.moderate<48||difficultyCounts.moderate>78||difficultyCounts.challenging<18||difficultyCounts.challenging>36)errors.push("Difficulty mix must be balanced across easy, moderate and challenging questions.");
  if(!paper.blueprintVersion||!paper.paperNumber)errors.push("Strict CLAT papers need blueprintVersion and paperNumber metadata.");
 }
 return{valid:errors.length===0,errors,counts,totalQuestions:questions.length,totalMarks:questions.length,fullLength};
}
function validateLibrary(library,options){
 const errors=[],papers=library&&Array.isArray(library.papers)?library.papers:[];
 if(papers.length!==(options&&options.expectedPaperCount||50))errors.push("Library must contain exactly "+((options&&options.expectedPaperCount)||50)+" full-length papers.");
 const ids=new Set(),questionFingerprints=new Set(),passageFingerprints=new Set();
 papers.forEach((paper,index)=>{
  const result=validatePaper(paper,{strictCLAT:true});
  if(!result.valid)errors.push("Paper "+(index+1)+" ("+(paper.paperId||"unnamed")+"): "+result.errors.join(" | "));
  if(ids.has(paper.paperId))errors.push("Duplicate paperId: "+paper.paperId);ids.add(paper.paperId);
  (paper.questions||[]).forEach(q=>{
   const key=String(q.prompt||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
   if(questionFingerprints.has(key))errors.push("Repeated question stem across papers: "+q.questionId);
   questionFingerprints.add(key);
  });
  (paper.passages||[]).forEach(p=>{
   const key=String(p.text||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
   if(passageFingerprints.has(key))errors.push("Repeated passage across papers: "+p.passageId);
   passageFingerprints.add(key);
  });
 });
 return{valid:errors.length===0,errors,paperCount:papers.length,questionCount:papers.reduce((n,p)=>n+(p.questions||[]).length,0),uniqueQuestionStems:questionFingerprints.size,uniquePassages:passageFingerprints.size};
}
function score(questions,answers){
 let correct=0,wrong=0,unanswered=0;
 (questions||[]).forEach(q=>{
  const answer=answers&&answers[q.questionId];
  if(answer==null||answer==="")unanswered++;
  else if(answer===q.correctOptionId)correct++;
  else wrong++;
 });
 return{correct,wrong,unanswered,attempted:correct+wrong,marks:Math.round((correct+wrong*NEGATIVE_MARK)*100)/100,maxMarks:(questions||[]).length,accuracy:correct+wrong?Math.round(correct/(correct+wrong)*1000)/10:0};
}
function sectionScores(paper,answers){
 return SECTIONS.map(section=>{
  const items=(paper.questions||[]).filter(q=>q.sectionId===section.id);
  return{sectionId:section.id,title:section.title,...score(items,answers)};
 });
}
function createAttempt(paper,student){
 const validation=validatePaper(paper);
 if(!validation.valid)throw new Error("Cannot start an invalid CLAT paper: "+validation.errors.slice(0,3).join(" "));
 const durationMinutes=Math.max(1,Number(paper.durationMinutes)||DURATION_MINUTES);
 return{schemaVersion:1,kind:"clat-attempt",attemptId:"clat-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),paperId:paper.paperId,paperTitle:paper.title,studentId:String(student&&student.studentId||student&&student.username||"local-student"),startedAt:new Date().toISOString(),durationSeconds:durationMinutes*60,remainingSeconds:durationMinutes*60,answers:{},reviewFlags:[],status:"in-progress",paperSnapshot:clone(paper)};
}
function finalizeAttempt(attempt,submittedAt){
 const paper=attempt&&attempt.paperSnapshot;
 if(!paper)throw new Error("Attempt has no frozen paper snapshot.");
 const overall=score(paper.questions,attempt.answers||{});
 return{...clone(attempt),status:"submitted",submittedAt:submittedAt||new Date().toISOString(),remainingSeconds:0,score:overall,sectionScores:sectionScores(paper,attempt.answers||{})};
}
function formatDuration(seconds){
 const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;
 return[h,m,r].map(n=>String(n).padStart(2,"0")).join(":");
}
const api=Object.freeze({sections:SECTIONS,durationMinutes:DURATION_MINUTES,maxMarks:MAX_MARKS,negativeMark:NEGATIVE_MARK,validatePaper,validateLibrary,score,sectionScores,createAttempt,finalizeAttempt,formatDuration});
root.C10ClatEngine=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
