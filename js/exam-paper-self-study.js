/* Student/parent-facing timed exam practice. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
let blueprint=null,bank=null,paper=null,answers={},remaining=10800,tick=null,submitted=false,paperHistory=[],assignedPaper=null,currentStudent=null;
const HISTORY_KEY="eg_exam_paper_history_v1",HISTORY_LIMIT=50;
function readPaperHistory(){
 try{
  const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
  if(!Array.isArray(parsed))return[];
  return parsed.map(item=>{
   const questionIds=Array.isArray(item&&item.questionIds)?item.questionIds.map(String).filter(Boolean):[];
   const mcqQuestionIds=Array.isArray(item&&item.mcqQuestionIds)?item.mcqQuestionIds.map(String).filter(Boolean):[];
   return{paperId:String(item&&item.paperId||""),generatedAt:String(item&&item.generatedAt||""),questionIds,mcqQuestionIds,fingerprint:String(item&&item.fingerprint||JSON.stringify(questionIds))};
  }).filter(item=>item.questionIds.length&&item.fingerprint!=="[]").slice(-HISTORY_LIMIT);
 }catch(_){return[];}
}
function savePaperHistory(){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(paperHistory));return true;}catch(_){return false;}}
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function status(s){$("loadStatus").textContent=s;}
async function load(){
 try{
  const [b,q,practice]=await Promise.all([
   fetch("./data/exam-papers/blueprints/class-10-science-2026-27.json",{cache:"no-store"}),
   fetch("./data/exam-papers/question-banks/class-10-science-2026-27-v1.json",{cache:"no-store"}),
   fetch("./data/science.json",{cache:"no-store"})
  ]);
  if(!b.ok||!q.ok||!practice.ok)throw Error("The published CBSE blueprint, mixed-question pool or shared chapter-wise Science MCQ bank is unavailable.");
  blueprint=await b.json();
  const baseBank=await q.json(),practiceChapters=await practice.json();
  const bc=C10ExamPaperGenerator.validateBlueprint(blueprint),qc=C10ExamPaperGenerator.validateQuestionBank(baseBank,{academicYear:"2026-27"});
  if(!bc.valid||!bc.readyForGeneration)throw Error("The exam blueprint is not approved for generation.");
  if(!qc.valid)throw Error(qc.errors.slice(0,4).join(" "));
  const integrated=C10ExamPaperGenerator.mergeQuestionBanks(baseBank,practiceChapters,blueprint);
  bank=integrated.bank;
  const coverage=integrated.stats.coverage;
  if(!coverage.valid)throw Error("Integrated question pool is not ready: "+coverage.errors.slice(0,5).join(" "));
  paperHistory=readPaperHistory();
  currentStudent=window.C10StudentAuth?await window.C10StudentAuth.restoreSession():null;
  const assignmentId=new URLSearchParams(location.search).get("assignment");
  if(assignmentId){
   if(!currentStudent||currentStudent.role!=="student")throw Error("Sign in with the assigned student account to open this examination.");
   assignedPaper=window.C10AssessmentManager.get(assignmentId);
   if(!assignedPaper||assignedPaper.kind!=="paper-assessment"||assignedPaper.studentId!==currentStudent.studentId)throw Error("This paper is not assigned to the signed-in student.");
   if(assignedPaper.deliveryMode==="printable")throw Error("This assignment is for handwritten completion. Open it from Assigned Tests to print the paper and answer booklet.");
   const frozen=window.C10ExamPaperGenerator.validatePaper(assignedPaper.paperSnapshot,blueprint);
   if(!frozen.valid)throw Error("Assigned paper validation failed: "+frozen.errors.slice(0,3).join(" "));
   $("startBtn").textContent="Start assigned examination";
  }

  const preparedDelivery=new URLSearchParams(location.search).get("delivery")==="latest";
  if(preparedDelivery){$("startBtn").textContent="Start prepared paper";$("startBtn").disabled=false;status("Prepared paper loaded. Sign in as the intended student and start when ready.");}
  else{$("startBtn").disabled=false;status("Ready: "+integrated.stats.appended.toLocaleString()+" existing chapter-wise MCQs are integrated with the mixed-question pool. "+coverage.coverage.filter(s=>s.eligibleCount>=3).length+" of 39 slots are covered; 50 distinct complete papers are supported.");}
 }catch(e){status("Unable to prepare the paper: "+e.message);}
}
function makePaper(){
 const previousHistory=paperHistory;
 const wantsDelivered=new URLSearchParams(location.search).get("delivery")==="latest";
 let delivered=false;
 if(assignedPaper){
  if(assignedPaper.deadlineAt&&new Date(assignedPaper.deadlineAt).getTime()<Date.now())throw Error("The deadline for this examination has passed.");
  assignedPaper=window.C10AssessmentManager.startPaper(assignedPaper.assignmentId,currentStudent.studentId);
  paper=assignedPaper.paperSnapshot;delivered=true;
 }
 if(!assignedPaper&&wantsDelivered){
  try{
   const saved=JSON.parse(localStorage.getItem("eg_exam_paper_delivery_v1")||"null");
   const check=saved&&C10ExamPaperGenerator.validatePaper(saved,blueprint);
   if(!saved||!check||!check.valid)throw Error("The prepared paper is missing or no longer matches the approved blueprint. Ask the Parent/Teacher to prepare it again.");
   paper=saved;delivered=true;
  }catch(e){throw new Error(e.message||"Unable to load the prepared paper.");}
 }
 if(!delivered){
  const recentPaperFingerprints=paperHistory.map(item=>item.fingerprint||JSON.stringify(item.questionIds||[]));
  const recentMcqQuestionIds=paperHistory.slice(-2).flatMap(item=>item.mcqQuestionIds||[]);
  const seed="self-study-"+Date.now()+"-"+Math.random().toString(36).slice(2);
  paper=C10ExamPaperGenerator.generateUniquePaper(blueprint,bank,{seed,title:"CBSE Class 10 Science · Self-study Paper",recentPaperFingerprints,recentQuestionIds:recentMcqQuestionIds,uniqueSearchAttempts:500});
 }
 answers={};submitted=false;remaining=blueprint.durationMinutes*60;
 const questionIds=paper.questions.map(q=>String(q.questionId));
 const fingerprint=paper.paperFingerprint||C10ExamPaperGenerator.paperFingerprint(paper);
 const alreadyRecorded=paperHistory.some(item=>item.paperId===paper.paperId||item.fingerprint===fingerprint);
 if(!alreadyRecorded)paperHistory=[...paperHistory,{paperId:paper.paperId,generatedAt:paper.generatedAt,questionIds,fingerprint,mcqQuestionIds:paper.questions.filter(q=>q.type==="mcq").map(q=>String(q.questionId))}].slice(-HISTORY_LIMIT);
 if(!savePaperHistory()){
  paperHistory=previousHistory;
  throw Error("This browser could not save the 50-paper repeat history. Enable site storage and try again; no paper was started.");
 }
 render();$("setup").classList.add("exam-hidden");$("review").classList.add("exam-hidden");$("attempt").classList.remove("exam-hidden");
 $("historyStatus").textContent=(delivered?"This is the frozen paper prepared by your Parent/Teacher. ":"")+"50-paper protection is active on this browser: this exact 39-question combination will not repeat within the latest 50 generated papers, and MCQs from the previous two papers are held out. Descriptive questions may recur because their approved pool is smaller. History does not sync to other devices.";
 startTimer();window.scrollTo(0,0);
}
function responseContent(item,i){
 let html="";
 if(item.stimulus)html+='<p>'+esc(item.stimulus)+'</p>';
 (item.images||[]).forEach(im=>{const src=esc(im.src);html+='<img src="./'+(src.startsWith("./")?src.slice(2):src)+'" alt="'+esc(im.alt)+'">';});
 if(Array.isArray(item.parts)&&item.parts.length){
  item.parts.forEach((part,j)=>html+='<p><strong>('+String.fromCharCode(97+j)+')</strong> '+esc(part.prompt)+' ('+part.marks+' marks)</p><textarea aria-label="Answer for question '+(i+1)+' part '+(j+1)+'" data-part="'+j+'" placeholder="Your answer here…"></textarea>');
 }else{
  html+='<textarea aria-label="Answer for question '+(i+1)+'" placeholder="Write your answer here…"></textarea>';
 }
 return html;
}
function questionMarkup(q,i){
 let html='<article class="exam-question" data-q="'+i+'"><h3>Q'+(q.paperQuestionNumber||i+1)+'. '+esc(q.prompt)+' <span class="exam-muted">['+q.marks+' marks]</span></h3>';
 if(q.type==="mcq"||q.type==="assertion-reason"){
  html+='<div class="exam-options">'+(q.options||[]).map(o=>'<label class="exam-option"><input type="radio" name="q'+i+'" value="'+esc(o.optionId)+'"><span>'+esc(o.text)+'</span></label>').join("")+'</div>';
 }else if(q.alternatives?.length){
  const alternative=q.alternatives[0];
  html+='<fieldset class="exam-choice"><legend>Choose one question to answer</legend>'+
   '<label class="exam-option"><input type="radio" name="choice'+i+'" data-choice value="main" checked><span>Answer the main question</span></label>'+
   '<label class="exam-option"><input type="radio" name="choice'+i+'" data-choice value="alternative"><span>Answer the internal-choice question</span></label></fieldset>'+
   '<div class="exam-choice-panel" data-choice-panel="main">'+responseContent(q,i)+'</div>'+
   '<div class="exam-choice-panel" data-choice-panel="alternative" hidden><h4>'+esc(alternative.prompt)+'</h4>'+responseContent(alternative,i)+'</div>';
 }else{
  html+=responseContent(q,i);
 }
 return html+'</article>';
}
function syncChoicePanels(article){
 const selected=article.querySelector('input[data-choice]:checked')?.value||"main";
 article.querySelectorAll("[data-choice-panel]").forEach(panel=>{panel.hidden=panel.dataset.choicePanel!==selected;});
}
function render(){
 $("paperTitle").textContent=paper.title;
 $("questions").innerHTML=paper.questions.map(questionMarkup).join("");
 $("questions").querySelectorAll(".exam-question").forEach(article=>{
  syncChoicePanels(article);
  article.querySelectorAll("input,textarea").forEach(el=>{
   el.addEventListener("change",()=>{if(el.matches("input[data-choice]"))syncChoicePanels(article);saveAnswers();});
   el.addEventListener("input",saveAnswers);
  });
 });
 updateProgress();
}
function saveAnswers(){
 paper.questions.forEach((q,i)=>{
  const article=$("questions").querySelector('[data-q="'+i+'"]');if(!article)return;
  const radio=article.querySelector('input[type=radio]:checked:not([data-choice])');
  const choice=article.querySelector("input[data-choice]:checked")?.value||"main";
  const panel=article.querySelector('[data-choice-panel="'+choice+'"]');
  const textareas=[...(panel||article).querySelectorAll("textarea")].map(x=>x.value);
  answers[i]={optionId:radio?.value||null,text:textareas,choice,alternative:choice==="alternative"?0:null};
 });
 updateProgress();
 try{localStorage.setItem("eg_exam_attempt_v1",JSON.stringify({paperId:paper.paperId,answers,remaining}));}catch(_){}
}
function updateProgress(){const count=Object.values(answers).filter(a=>a&&(a.optionId||a.text?.some(t=>t.trim()))).length;$("progress").textContent=count+" / "+paper.questions.length+" answered";}
function startTimer(){clearInterval(tick);tick=setInterval(()=>{remaining--;const h=String(Math.floor(remaining/3600)).padStart(2,"0"),m=String(Math.floor(remaining%3600/60)).padStart(2,"0"),s=String(remaining%60).padStart(2,"0");$("timer").textContent=h+":"+m+":"+s;if(remaining<=0){clearInterval(tick);submit(true);}},1000);}
function submit(auto=false){if(submitted)return;saveAnswers();submitted=true;clearInterval(tick);let mcq=0,correct=0,answered=0;paper.questions.forEach((q,i)=>{const a=answers[i];if(a&&(a.optionId||a.text?.some(t=>t.trim())))answered++;if(q.type==="mcq"||q.type==="assertion-reason"){mcq++;if(a?.optionId===q.correctOptionId)correct++;}});$("attempt").classList.add("exam-hidden");$("review").classList.remove("exam-hidden");$("score").textContent=(auto?"Time is up. ":"")+"Submitted "+answered+" of "+paper.questions.length+" questions. MCQ score: "+correct+" / "+mcq+". Written answers require self-review.";const box=$("reviewAnswers");box.innerHTML="";paper.questions.forEach((q,i)=>{const d=document.createElement("div");d.className="exam-question";const selected=answers[i]?.choice==="alternative"&&q.alternatives?.length?q.alternatives[0]:q;const key=selected.answerKey?.modelAnswer||selected.answerKey?.answer||selected.answerKey?.correctAnswer||"Refer to your textbook and marking points.";d.innerHTML='<h3>Q'+(i+1)+': '+esc(selected.prompt||q.prompt)+'</h3><p><strong>Your answer:</strong> '+esc(answers[i]?.optionId||answers[i]?.text?.join(" / ")||"Not attempted")+'</p><p><strong>Model answer / review:</strong> '+esc(key)+'</p>';box.appendChild(d);});try{localStorage.setItem("eg_exam_last_result_v1",JSON.stringify({paperId:paper.paperId,answers,submittedAt:new Date().toISOString(),mcqCorrect:correct,mcqTotal:mcq}));localStorage.removeItem("eg_exam_attempt_v1");const queued=JSON.parse(localStorage.getItem("eg_exam_paper_delivery_v1")||"null");if(queued&&queued.paperId===paper.paperId)localStorage.removeItem("eg_exam_paper_delivery_v1");if(assignedPaper&&currentStudent)window.C10AssessmentManager.submitPaper(assignedPaper.assignmentId,currentStudent.studentId,answers);}catch(e){status(e.message||"Answers were saved, but assignment submission needs attention.");}window.scrollTo(0,0);}
$("startBtn").addEventListener("click",()=>{try{makePaper();}catch(e){status("Cannot generate this paper: "+e.message);}});
$("submitBtn").addEventListener("click",()=>{if(confirm("Submit your paper now? You cannot change answers after submission."))submit(false);});
$("printBtn").addEventListener("click",()=>window.print());
$("newBtn").addEventListener("click",()=>{$("review").classList.add("exam-hidden");$("setup").classList.remove("exam-hidden");status("Ready for another attempt.");window.scrollTo(0,0);});
load();
})();