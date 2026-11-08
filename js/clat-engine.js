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
  if(!q.explanation||typeof q.explanation!=="string")errors.push(at+" needs an explanation.");
  const passage=passages.find(p=>p.passageId===q.passageId);
  if(passage&&passage.sectionId!==q.sectionId)errors.push(at+" section does not match its passage.");
 });
 passages.forEach((p,i)=>{
  if(!knownSections.has(p.sectionId))errors.push("Passage "+(i+1)+" has an unknown section.");
  if(!p.title||!p.text)errors.push("Passage "+(i+1)+" needs a title and text.");
 });
 const counts=Object.fromEntries(SECTIONS.map(s=>[s.id,questions.filter(q=>q.sectionId===s.id).length]));
 const fullLength=questions.length===120;
 if(opts.requireFullLength&& !fullLength)errors.push("A full-length CLAT paper must contain exactly 120 questions.");
 if(fullLength&&SECTIONS.some(s=>counts[s.id]<s.min||counts[s.id]>s.max))errors.push("Section counts must remain within the official CLAT 2027 ranges.");
 return{valid:errors.length===0,errors,counts,totalQuestions:questions.length,totalMarks:questions.length,fullLength};
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
 return{schemaVersion:1,kind:"clat-attempt",attemptId:"clat-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),paperId:paper.paperId,paperTitle:paper.title,studentId:String(student&&student.studentId||student&&student.username||"local-student"),startedAt:new Date().toISOString(),durationSeconds:DURATION_MINUTES*60,remainingSeconds:DURATION_MINUTES*60,answers:{},reviewFlags:[],status:"in-progress",paperSnapshot:clone(paper)};
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
const api=Object.freeze({sections:SECTIONS,durationMinutes:DURATION_MINUTES,maxMarks:MAX_MARKS,negativeMark:NEGATIVE_MARK,validatePaper,score,sectionScores,createAttempt,finalizeAttempt,formatDuration});
root.C10ClatEngine=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
