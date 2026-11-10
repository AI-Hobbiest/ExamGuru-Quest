/* CLAT UG 2027 student practice UI: local-first, passage-based and timed. */
(()=>{"use strict";
const $=id=>document.getElementById(id),engine=window.C10ClatEngine;
const HISTORY_KEY="eg_clat_attempt_history_v1",ACTIVE_KEY="eg_clat_active_attempt_v1";
function storageKey(base){const id=String(student&&(student.studentId||student.username)||"local-student").toLowerCase().replace(/[^a-z0-9_-]/g,"_");return base+"_"+id;}
let library=null,paper=null,attempt=null,index=0,tick=null,student=null,submitted=false;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sections=engine.sections,sectionName=id=>(sections.find(s=>s.id===id)||{}).title||id;
function getStudent(){try{const value=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");return value&&value.role==="student"?value:null;}catch(_){return null;}}
function availablePapers(){return String(student&&student.classId||"").toUpperCase()==="CLAT"?library.papers.filter(item=>item.questions.length===120):library.papers;}
function setStatus(value){$("loadStatus").textContent=value;}
function saveActive(){try{localStorage.setItem(storageKey(ACTIVE_KEY),JSON.stringify({paperId:paper.paperId,attempt,index}));}catch(_){setStatus("Browser storage is full. Please export or clear older data before continuing.");}}
function readHistory(){try{const value=JSON.parse(localStorage.getItem(storageKey(HISTORY_KEY))||"[]");return Array.isArray(value)?value:[];}catch(_){return[];}}
function saveHistory(record){const history=readHistory().filter(item=>item.attemptId!==record.attemptId);history.push(record);try{localStorage.setItem(storageKey(HISTORY_KEY),JSON.stringify(history.slice(-50)));}catch(_){setStatus("Attempt completed, but local history could not be saved. Please download or print your result.");}}
function renderLibrary(){
 const root=$("paperList");root.innerHTML="";
 availablePapers().forEach(item=>{
  const validation=engine.validatePaper(item),card=document.createElement("article");card.className="clat-paper";
  const title=document.createElement("h3");title.textContent=item.title;
  const desc=document.createElement("p");desc.className="clat-muted";desc.textContent=item.subtitle||"CLAT practice paper";
  const meta=document.createElement("div");meta.className="clat-meta";meta.textContent=item.questions.length+" questions · "+(item.durationMinutes||120)+" minutes";
  const actions=document.createElement("div");actions.className="clat-paper-actions";
  const btn=document.createElement("button");btn.type="button";btn.className="clat-btn";btn.textContent=item.questions.length===120?"Start full-length practice":"Start diagnostic";btn.disabled=!validation.valid;btn.addEventListener("click",()=>start(item));
  const pdfBtn=document.createElement("button");pdfBtn.type="button";pdfBtn.className="clat-btn secondary";pdfBtn.textContent="Download PDF";pdfBtn.disabled=!validation.valid||!window.C10ClatPdf;pdfBtn.addEventListener("click",()=>{const result=window.C10ClatPdf.printPaper(item);setStatus(result.message);});
  const keyBtn=document.createElement("button");keyBtn.type="button";keyBtn.className="clat-btn secondary";keyBtn.textContent="Download Answer Key";keyBtn.disabled=!validation.valid||!window.C10ClatPdf||typeof window.C10ClatPdf.printAnswerKey!=="function";keyBtn.addEventListener("click",()=>{const result=window.C10ClatPdf.printAnswerKey(item);setStatus(result.message);});
  actions.append(btn,pdfBtn,keyBtn);
  const note=document.createElement("p");note.className="clat-muted";note.textContent=validation.valid?(item.questions.length===120?"Full-length practice pilot · answer explanations included":"Diagnostic practice · answer explanations included"):validation.errors.slice(0,2).join(" ");
  card.append(title,desc,meta,actions,note);root.appendChild(card);
 });
}

function renderActualPapers(items){
 const root=$("actualPaperList");root.innerHTML="";
 items.slice().sort((a,b)=>Number(b.examYear)-Number(a.examYear)).forEach(item=>{
  const card=document.createElement("article");card.className="clat-paper";
  const title=document.createElement("h3");title.textContent=item.title;
  const meta=document.createElement("div");meta.className="clat-meta";
  meta.textContent=item.questionCount+" questions · "+item.durationMinutes+" minutes · evaluated out of "+item.evaluatedOutOf+" marks";
  const desc=document.createElement("p");desc.className="clat-muted";desc.textContent=item.formatNote;
  const scoring=document.createElement("p");scoring.className="clat-muted";scoring.textContent=item.scoringNote;
  const set=document.createElement("p");set.className="clat-muted";set.textContent=item.setNote;
  const actions=document.createElement("div");actions.className="clat-paper-actions";
  const paperLink=document.createElement("a");paperLink.className="clat-btn";paperLink.href=item.questionUrl;paperLink.target="_blank";paperLink.rel="noopener noreferrer";paperLink.textContent="Open Question Paper PDF";
  const keyLink=document.createElement("a");keyLink.className="clat-btn secondary";keyLink.href=item.answerKeyUrl;keyLink.target="_blank";keyLink.rel="noopener noreferrer";keyLink.textContent=item.answerKeyLabel||"Open Final Answer Key";
  actions.append(paperLink,keyLink);
  const source=document.createElement("a");source.className="clat-pyq-source";source.href=item.sourceArchiveUrl;source.target="_blank";source.rel="noopener noreferrer";source.textContent="Consortium source archive";
  card.append(title,meta,desc,scoring,set,actions,source);root.appendChild(card);
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
  const selected=availablePapers().find(p=>p.paperId===saved.paperId);if(!selected)return false;
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
  const batchResponse=await fetch("./data/clat/model-papers-batch-02.json",{cache:"no-store"});if(!batchResponse.ok)throw Error("CLAT practice batch 02 returned HTTP "+batchResponse.status);
  const batch=await batchResponse.json();if(batch.kind!=="clat-model-paper-batch"||batch.batchNumber!==2||!Array.isArray(batch.papers)||batch.papers.length!==4)throw Error("CLAT practice batch 02 is invalid.");
  const knownIds=new Set(library.papers.map(item=>item.paperId));
  const batchIds=new Set();
  batch.papers.forEach((item,index)=>{
   if(Number(item.paperNumber)!==index+7||item.status!=="practice-pilot")throw Error("CLAT practice batch 02 has an unexpected paper or release status.");
   if(knownIds.has(item.paperId)||batchIds.has(item.paperId))throw Error("Duplicate CLAT paper ID: "+item.paperId);
   const check=engine.validatePaper(item,{strictCLAT:true});if(!check.valid)throw Error("Paper "+item.paperNumber+" failed strict validation: "+check.errors.slice(0,3).join(" "));
   batchIds.add(item.paperId);
  });
  library.papers.push(...batch.papers);
  const batchThreeResponse=await fetch("./data/clat/model-papers-batch-03.json",{cache:"no-store"});
  if(!batchThreeResponse.ok)throw Error("CLAT practice batch 03 returned HTTP "+batchThreeResponse.status);
  const batchThree=await batchThreeResponse.json();
  if(batchThree.kind!=="clat-model-paper-batch"||batchThree.batchNumber!==3||!Array.isArray(batchThree.papers)||batchThree.papers.length!==5)throw Error("CLAT practice batch 03 is invalid.");
  const knownBatchThreeIds=new Set(library.papers.map(item=>item.paperId));
  const batchThreeIds=new Set();
  batchThree.papers.forEach((item,index)=>{
   if(Number(item.paperNumber)!==index+11||item.status!=="practice-pilot")throw Error("CLAT practice batch 03 has an unexpected paper or release status.");
   if(knownBatchThreeIds.has(item.paperId)||batchThreeIds.has(item.paperId))throw Error("Duplicate CLAT paper ID: "+item.paperId);
   const check=engine.validatePaper(item,{strictCLAT:true});if(!check.valid)throw Error("Paper "+item.paperNumber+" failed strict validation: "+check.errors.slice(0,3).join(" "));
   batchThreeIds.add(item.paperId);
  });
  library.papers.push(...batchThree.papers);
  const batchFourResponse=await fetch("./data/clat/model-papers-batch-04.json",{cache:"no-store"});
  if(!batchFourResponse.ok)throw Error("CLAT practice batch 04 returned HTTP "+batchFourResponse.status);
  const batchFour=await batchFourResponse.json();
  if(batchFour.kind!=="clat-model-paper-batch"||batchFour.batchNumber!==4||!Array.isArray(batchFour.papers)||batchFour.papers.length!==5)throw Error("CLAT practice batch 04 is invalid.");
  const knownBatchFourIds=new Set(library.papers.map(item=>item.paperId));
  const batchFourIds=new Set();
  batchFour.papers.forEach((item,index)=>{
   if(Number(item.paperNumber)!==index+16||item.status!=="practice-pilot")throw Error("CLAT practice batch 04 has an unexpected paper or release status.");
   if(knownBatchFourIds.has(item.paperId)||batchFourIds.has(item.paperId))throw Error("Duplicate CLAT paper ID: "+item.paperId);
   const check=engine.validatePaper(item,{strictCLAT:true});if(!check.valid)throw Error("Paper "+item.paperNumber+" failed strict validation: "+check.errors.slice(0,3).join(" "));
   batchFourIds.add(item.paperId);
  });
  library.papers.push(...batchFour.papers);
  renderLibrary();
  try{
   const pyqResponse=await fetch("./data/clat/actual-papers.json",{cache:"no-store"});
   if(!pyqResponse.ok)throw Error("Actual-paper catalogue returned HTTP "+pyqResponse.status);
   const pyqCatalog=await pyqResponse.json();
   if(pyqCatalog.kind!=="clat-actual-papers-catalog"||!Array.isArray(pyqCatalog.papers)||pyqCatalog.papers.length!==5)throw Error("Actual-paper catalogue is invalid.");
   const years=pyqCatalog.papers.map(item=>Number(item.examYear));
   if(![2022,2023,2024,2025,2026].every(year=>years.includes(year)))throw Error("Actual-paper catalogue is missing one of the five latest completed CLAT editions.");
   pyqCatalog.papers.forEach(item=>{
    if(!item.title||!item.examDate||!item.questionCount||!item.evaluatedOutOf||!/^https:\/\//.test(item.questionUrl)||!/^https:\/\//.test(item.answerKeyUrl)||!/^https:\/\//.test(item.sourceArchiveUrl))throw Error("Actual-paper record is incomplete for CLAT "+item.examYear);
   });
   renderActualPapers(pyqCatalog.papers);
   $("pyqStatus").textContent="Loaded five Consortium-issued UG papers. PDFs open in a new tab; external PDF attempts are not stored in the ExamGuru attempt history.";
  }catch(pyqError){$("pyqStatus").textContent="Actual previous-year papers could not be loaded: "+pyqError.message;}
  setStatus("Loaded "+availablePapers().length+" CLAT practice papers, including "+availablePapers().filter(p=>p.questions.length===120).length+" full-length practice pilots.");
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