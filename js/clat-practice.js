/* CLAT UG 2027 student practice UI: local-first, passage-based and timed. */
(()=>{"use strict";
const $=id=>document.getElementById(id),engine=window.C10ClatEngine;
const HISTORY_KEY="eg_clat_attempt_history_v1",ACTIVE_KEY="eg_clat_active_attempt_v1";
function storageKey(base){const id=String(student&&(student.studentId||student.username)||"local-student").toLowerCase().replace(/[^a-z0-9_-]/g,"_");return base+"_"+id;}
let library=null,paper=null,attempt=null,index=0,tick=null,student=null,submitted=false;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sections=engine.sections,sectionName=id=>(sections.find(s=>s.id===id)||{}).title||id;
function getStudent(){try{const value=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");return value&&value.role==="student"?value:null;}catch(_){return null;}}
function setStatus(value){$("loadStatus").textContent=value;}
function saveActive(){try{localStorage.setItem(storageKey(ACTIVE_KEY),JSON.stringify({paperId:paper.paperId,attempt,index}));}catch(_){setStatus("Browser storage is full. Please export or clear older data before continuing.");}}
function readHistory(){try{const value=JSON.parse(localStorage.getItem(storageKey(HISTORY_KEY))||"[]");return Array.isArray(value)?value:[];}catch(_){return[];}}
function saveHistory(record){const history=readHistory().filter(item=>item.attemptId!==record.attemptId);history.push(record);try{localStorage.setItem(storageKey(HISTORY_KEY),JSON.stringify(history.slice(-50)));}catch(_){setStatus("Attempt completed, but local history could not be saved. Please download or print your result.");}}
function renderLibrary(){
 const root=$("paperList");root.innerHTML="";
 library.papers.forEach(item=>{
  const validation=engine.validatePaper(item),card=document.createElement("article");card.className="clat-paper";
  const title=document.createElement("h3");title.textContent=item.title;
  const desc=document.createElement("p");desc.className="clat-muted";desc.textContent=item.subtitle||"CLAT practice paper";
  const meta=document.createElement("div");meta.className="clat-meta";meta.textContent=item.questions.length+" questions · "+(item.durationMinutes||120)+" minutes";
  const btn=document.createElement("button");btn.className="clat-btn";btn.textContent="Start diagnostic";btn.disabled=!validation.valid;btn.addEventListener("click",()=>start(item));
  const note=document.createElement("p");note.className="clat-muted";note.textContent=validation.valid?"Original practice material · answer explanations included":validation.errors.slice(0,2).join(" ");
  card.append(title,desc,meta,btn,note);root.appendChild(card);
 });
}
function start(selected){
 if(tick)clearInterval(tick);
 paper=selected;attempt=engine.createAttempt(paper,student);index=0;submitted=false;
 $("library").classList.add("clat-hidden");$("resultPanel").classList.add("clat-hidden");$("attemptPanel").classList.remove("clat-hidden");
 $("attemptTitle").textContent=paper.title;$("timer").textContent=engine.formatDuration(attempt.remainingSeconds);
 saveActive();renderQuestion();tick=setInterval(()=>{attempt.remainingSeconds=Math.max(0,attempt.remainingSeconds-1);$("timer").textContent=engine.formatDuration(attempt.remainingSeconds);if(attempt.remainingSeconds%10===0)saveActive();if(attempt.remainingSeconds<=0)finish(true);},1000);
}
function passageFor(question){return paper.passages.find(p=>p.passageId===question.passageId);}
function renderQuestion(){
 const q=paper.questions[index],passage=passageFor(q),answered=Object.keys(attempt.answers).filter(k=>attempt.answers[k]).length;
 $("attemptCount").textContent="Question "+(index+1)+" of "+paper.questions.length;
 $("progressBar").style.width=(answered/paper.questions.length*100)+"%";
 $("passageTitle").textContent=passage.title;$("passageText").textContent=passage.text;
 $("questionSection").textContent=sectionName(q.sectionId);
 $("questionPrompt").textContent=(index+1)+". "+q.prompt;
 $("options").innerHTML="";
 q.options.forEach(option=>{
  const label=document.createElement("label");label.className="clat-option";
  const input=document.createElement("input");input.type="radio";input.name="clatAnswer";input.value=option.optionId;input.checked=attempt.answers[q.questionId]===option.optionId;
  input.addEventListener("change",()=>{attempt.answers[q.questionId]=option.optionId;saveActive();renderPalette();});
  const text=document.createElement("span");text.textContent=option.text;label.append(input,text);$("options").appendChild(label);
 });
 const flagged=attempt.reviewFlags.includes(q.questionId);$("flagBtn").textContent=flagged?"★ Remove review flag":"☆ Mark for review";
 $("previousBtn").disabled=index===0;$("nextBtn").textContent=index===paper.questions.length-1?"Review answers →":"Save & Next →";
 renderPalette();$("paletteSummary").textContent=answered+" answered · "+attempt.reviewFlags.length+" flagged";
}
function renderPalette(){
 const root=$("palette");root.innerHTML="";
 paper.questions.forEach((q,i)=>{
  const b=document.createElement("button");b.type="button";b.textContent=String(i+1);
  if(i===index)b.classList.add("current");if(attempt.answers[q.questionId])b.classList.add("answered");if(attempt.reviewFlags.includes(q.questionId))b.classList.add("flagged");
  b.setAttribute("aria-label","Question "+(i+1)+(attempt.answers[q.questionId]?", answered":"")+(attempt.reviewFlags.includes(q.questionId)?", marked for review":""));
  b.addEventListener("click",()=>{index=i;saveActive();renderQuestion();});root.appendChild(b);
 });
 const answered=Object.keys(attempt.answers).filter(key=>attempt.answers[key]).length;
 $("paletteSummary").textContent=answered+" answered · "+attempt.reviewFlags.length+" flagged";
}
function toggleFlag(){const id=paper.questions[index].questionId,at=attempt.reviewFlags.indexOf(id);if(at>=0)attempt.reviewFlags.splice(at,1);else attempt.reviewFlags.push(id);saveActive();renderQuestion();}
function showResult(record){
 $("attemptPanel").classList.add("clat-hidden");$("library").classList.add("clat-hidden");$("resultPanel").classList.remove("clat-hidden");
 $("resultTitle").textContent=record.paperTitle+" · Submitted "+new Date(record.submittedAt).toLocaleString();
 const score=record.score,stats=[["Score",score.marks+" / "+score.maxMarks],["Correct",score.correct],["Incorrect",score.wrong],["Unanswered",score.unanswered],["Accuracy",score.accuracy+"%"]];
 $("resultStats").innerHTML=stats.map(x=>'<div class="clat-stat"><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'</span></div>').join("");
 $("sectionResults").innerHTML='<table class="clat-table"><thead><tr><th>Section</th><th>Correct</th><th>Wrong</th><th>Unanswered</th><th>Score</th></tr></thead><tbody>'+record.sectionScores.map(s=>'<tr><td>'+esc(s.title)+'</td><td>'+s.correct+'</td><td>'+s.wrong+'</td><td>'+s.unanswered+'</td><td>'+s.marks+'</td></tr>').join("")+'</tbody></table>';
 $("answerReview").innerHTML=paper.questions.map((q,i)=>{
  const chosen=record.answers[q.questionId],correct=q.correctOptionId,chosenText=q.options.find(o=>o.optionId===chosen)?.text||"Not answered",correctText=q.options.find(o=>o.optionId===correct)?.text||"";
  return'<article class="clat-review-item"><strong>Q'+(i+1)+' · '+esc(sectionName(q.sectionId))+'</strong><p>'+esc(q.prompt)+'</p><p><b>Your answer:</b> '+esc(chosenText)+'<br><b>Correct answer:</b> '+esc(correctText)+'</p><p class="clat-muted">'+esc(q.explanation)+'</p></article>';
 }).join("");
}
function finish(auto){
 if(submitted||!attempt)return;
 if(!auto&&!window.confirm("Submit this CLAT paper now? You will not be able to change answers after submission."))return;
 submitted=true;if(tick)clearInterval(tick);
 const record=engine.finalizeAttempt(attempt);record.submittedAt=new Date().toISOString();saveHistory(record);
 try{localStorage.removeItem(storageKey(ACTIVE_KEY));}catch(_){}
 showResult(record);
}
function loadResume(){
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey(ACTIVE_KEY))||"null");if(!saved||!saved.attempt)return false;
  const selected=library.papers.find(p=>p.paperId===saved.paperId);if(!selected)return false;
  const frozen=saved.attempt.paperSnapshot||selected,check=engine.validatePaper(frozen);if(!check.valid)return false;
  if(!window.confirm("An unfinished CLAT attempt was found. Resume it? Choose Cancel to start a new paper.")){localStorage.removeItem(storageKey(ACTIVE_KEY));return false;}
  paper=frozen;attempt=saved.attempt;index=Math.max(0,Math.min(paper.questions.length-1,Number(saved.index)||0));
  $("library").classList.add("clat-hidden");$("attemptPanel").classList.remove("clat-hidden");
  $("attemptTitle").textContent=paper.title;$("timer").textContent=engine.formatDuration(attempt.remainingSeconds);renderQuestion();
  tick=setInterval(()=>{attempt.remainingSeconds=Math.max(0,attempt.remainingSeconds-1);$("timer").textContent=engine.formatDuration(attempt.remainingSeconds);if(attempt.remainingSeconds%10===0)saveActive();if(attempt.remainingSeconds<=0)finish(true);},1000);return true;
 }catch(_){return false;}
}
async function init(){
 student=getStudent();if(!student){setStatus("Please sign in with a student account to access CLAT practice.");return;}
 try{
  const response=await fetch("./data/clat/model-papers.json",{cache:"no-store"});if(!response.ok)throw Error("Model paper library returned HTTP "+response.status);
  library=await response.json();if(library.kind!=="clat-model-paper-library"||!Array.isArray(library.papers))throw Error("CLAT model paper library is invalid.");
  renderLibrary();setStatus("Loaded "+library.papers.length+" diagnostic papers. Full-length CLAT mocks will use the same 120-question engine.");
  loadResume();
 }catch(error){setStatus("Unable to load CLAT practice: "+error.message);}
}
$("previousBtn").addEventListener("click",()=>{index=Math.max(0,index-1);saveActive();renderQuestion();});
$("nextBtn").addEventListener("click",()=>{if(index<paper.questions.length-1){index++;saveActive();renderQuestion();}else{saveActive();$("paletteSummary").textContent="Review your answers and flagged questions before submitting.";window.scrollTo({top:0,behavior:"smooth"});}});
$("flagBtn").addEventListener("click",toggleFlag);
$("submitBtn").addEventListener("click",()=>finish(false));
$("printResultBtn").addEventListener("click",()=>window.print());
$("backLibraryBtn").addEventListener("click",()=>{if(tick)clearInterval(tick);$("resultPanel").classList.add("clat-hidden");$("library").classList.remove("clat-hidden");});
init();
})();