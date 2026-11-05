/* Subject-neutral student/parent-facing timed exam practice. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
let profile=null,profileId="",defaultProfileId="",blueprint=null,bank=null,paper=null,answers={},remaining=0,tick=null,submitted=false,paperHistory=[],assignedPaper=null,currentStudent=null,resumeAttempt=null,savedSelfStudyPaper=null;
async function resolveStudentSession(){
 if(window.C10StudentAuth&&typeof window.C10StudentAuth.restoreSession==="function"){
  try{
   const restored=await window.C10StudentAuth.restoreSession();
   if(restored&&restored.role==="student")return restored;
  }catch(_){}
  try{
   const current=window.C10StudentAuth.currentUser&&window.C10StudentAuth.currentUser();
   if(current&&current.role==="student")return current;
  }catch(_){}
 }
 try{
  const saved=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");
  if(saved&&typeof saved.username==="string"&&saved.role!=="parent"){
   return{...saved,role:"student",classId:String(saved.classId||"")};
  }
 }catch(_){}
 return null;
}

const HISTORY_KEY="eg_exam_paper_history_v1",HISTORY_LIMIT=50,PROFILE_REGISTRY_URL="./data/exam-papers/profile-registry.json";
function storageKey(base){
 if(!profileId||profileId===defaultProfileId)return base;
 return base+"_"+profileId.replace(/[^a-z0-9_-]/gi,"_");
}
function subjectTitle(){
 return String(profile&&profile.subjectTitle||blueprint&&(blueprint.subjectTitle||blueprint.subjectName)||blueprint&&blueprint.subjectId||"");
}
function paperDisplayTitle(){
 return String(profile&&profile.title||("Class "+blueprint.classId+" · "+subjectTitle()+(blueprint.subjectCode?" ("+blueprint.subjectCode+")":"")));
}
function readPaperHistory(){
 try{
  const parsed=JSON.parse(localStorage.getItem(storageKey(HISTORY_KEY))||"[]");
  if(!Array.isArray(parsed))return[];
  return parsed.map(item=>{
   const questionIds=Array.isArray(item&&item.questionIds)?item.questionIds.map(String).filter(Boolean):[];
   const mcqQuestionIds=Array.isArray(item&&item.mcqQuestionIds)?item.mcqQuestionIds.map(String).filter(Boolean):[];
   return{paperId:String(item&&item.paperId||""),generatedAt:String(item&&item.generatedAt||""),questionIds,mcqQuestionIds,fingerprint:String(item&&item.fingerprint||JSON.stringify(questionIds))};
  }).filter(item=>item.questionIds.length&&item.fingerprint!=="[]").slice(-HISTORY_LIMIT);
 }catch(_){return[];}
}
function savePaperHistory(){try{localStorage.setItem(storageKey(HISTORY_KEY),JSON.stringify(paperHistory));return true;}catch(_){return false;}}
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function status(s){$("loadStatus").textContent=s;}
function populateProfileSelector(profiles){
 const wrap=$("profileSelectWrap"),select=$("profileSelect");
 if(!wrap||!select)return;
 const available=profiles.filter(item=>item&&item.enabled!==false);
 if(available.length<2){wrap.hidden=true;return;}
 select.innerHTML="";
 available.forEach(item=>{
  const option=document.createElement("option");
  option.value=String(item.profileId);
  option.textContent=String(item.title||("Class "+item.classId+" · "+(item.subjectTitle||item.subjectId)));
  select.appendChild(option);
 });
 select.value=profileId;
 wrap.hidden=false;
 select.addEventListener("change",()=>{
  const next=new URL(window.location.href);
  next.searchParams.set("profile",select.value);
  window.location.href=next.toString();
 },{once:true});
}
function renderProfileMeta(){
 $("profileTitle").textContent=paperDisplayTitle();
 $("profileDescription").textContent=String(profile.description||"Timed CBSE-style examination practice with a profile-specific blueprint and approved question pool.");
 const meta=$("profileMeta");meta.innerHTML="";
 const hours=blueprint.durationMinutes/60;
 const duration=Number.isInteger(hours)?hours+" hour"+(hours===1?"":"s"):blueprint.durationMinutes+" minutes";
 [blueprint.totalMarks+" marks",duration,blueprint.totalQuestions+" questions",blueprint.academicYear].forEach(value=>{
  const span=document.createElement("span");span.textContent=value;meta.appendChild(span);
 });
 $("progress").textContent="0 / "+blueprint.totalQuestions+" answered";
 const totalSeconds=blueprint.durationMinutes*60,h=String(Math.floor(totalSeconds/3600)).padStart(2,"0"),m=String(Math.floor(totalSeconds%3600/60)).padStart(2,"0"),s=String(totalSeconds%60).padStart(2,"0");
 $("timer").textContent=h+":"+m+":"+s;
}
async function load(){
 try{
  currentStudent=await resolveStudentSession();
  if(!currentStudent||currentStudent.role!=="student")throw Error("Sign in with your student account to open exam practice.");
  const studentClassId=String(currentStudent.classId||"").trim();
  if(!studentClassId)throw Error("Your student profile is missing its class. Sign out and sign in again, or ask your Parent/Teacher to correct the account.");
  const registryResponse=await fetch(PROFILE_REGISTRY_URL,{cache:"no-store"});
  if(!registryResponse.ok)throw Error("The exam profile registry is unavailable.");
  const registry=await registryResponse.json();
  if(!registry||registry.schemaVersion!==1||registry.kind!=="exam-paper-profile-registry"||!Array.isArray(registry.profiles))throw Error("The exam profile registry is invalid.");
  defaultProfileId=String(registry.defaultProfileId||"");
  const available=registry.profiles.filter(item=>item&&item.enabled!==false&&String(item.classId)===studentClassId);
  if(!available.length){
   throw Error("Full-paper exam mode is not configured for Class "+studentClassId+". Open a subject from your student dashboard and choose the exam mode available for that subject.");
  }
  const requested=new URLSearchParams(location.search).get("profile");
  profile=requested
   ?available.find(item=>String(item.profileId)===requested)
   :(available.find(item=>String(item.profileId)===defaultProfileId)||available[0]);
  if(!profile)throw Error("The requested exam profile does not belong to your Class "+studentClassId+" account.");
  profileId=String(profile.profileId);
  populateProfileSelector(available);
  const safePath=value=>typeof value==="string"&&value.startsWith("./data/")&&!value.split("/").includes("..");
  if(!safePath(profile.blueprintUrl)||!safePath(profile.questionBankUrl)||(profile.practiceBankUrl&&!safePath(profile.practiceBankUrl)))throw Error("The selected profile contains an unsafe data path.");
  const [b,q,practice]=await Promise.all([
   fetch(profile.blueprintUrl,{cache:"no-store"}),
   fetch(profile.questionBankUrl,{cache:"no-store"}),
   profile.practiceBankUrl?fetch(profile.practiceBankUrl,{cache:"no-store"}):Promise.resolve(null)
  ]);
  if(!b.ok||!q.ok||(practice&&!practice.ok))throw Error("The selected profile's blueprint or question bank is unavailable.");
  blueprint=await b.json();
  blueprint.subjectTitle=blueprint.subjectTitle||profile.subjectTitle||blueprint.subjectName||blueprint.subjectId;
  const baseBank=await q.json(),practiceChapters=practice?await practice.json():null;
  if(String(blueprint.classId)!==String(profile.classId)||String(blueprint.subjectId)!==String(profile.subjectId))throw Error("The selected profile does not match its blueprint class and subject.");
  if(profile.subjectCode&&String(blueprint.subjectCode||"")!==String(profile.subjectCode))throw Error("The selected profile subject code does not match its blueprint.");
  if(profile.academicYear&&String(blueprint.academicYear)!==String(profile.academicYear))throw Error("The selected profile academic year does not match its blueprint.");
  const bc=ExamPaperGenerator.validateBlueprint(blueprint),qc=ExamPaperGenerator.validateQuestionBank(baseBank,{classId:blueprint.classId,subjectId:blueprint.subjectId,academicYear:blueprint.academicYear});
  if(!bc.valid||!bc.readyForGeneration)throw Error("The exam blueprint is not approved for generation: "+bc.errors.slice(0,4).join(" "));
  if(!qc.valid)throw Error(qc.errors.slice(0,4).join(" "));
  const minimum=Number.isInteger(profile.minimumCandidatesPerSlot)?profile.minimumCandidatesPerSlot:20;
  const integrated=ExamPaperGenerator.mergeQuestionBanks(baseBank,practiceChapters,blueprint,{minimumCandidatesPerSlot:minimum});
  bank=integrated.bank;
  const coverage=integrated.stats.coverage;
  if(!coverage.valid)throw Error("The selected question pool is not ready: "+coverage.errors.slice(0,5).join(" "));
  renderProfileMeta();
  paperHistory=readPaperHistory();
  const assignmentId=new URLSearchParams(location.search).get("assignment");
  if(assignmentId){
   if(!currentStudent||currentStudent.role!=="student")throw Error("Sign in with the assigned student account to open this examination.");
   assignedPaper=window.C10AssessmentManager.get(assignmentId);
   if(!assignedPaper||assignedPaper.kind!=="paper-assessment"||assignedPaper.studentId!==currentStudent.studentId)throw Error("This paper is not assigned to the signed-in student.");
   if(assignedPaper.deliveryMode==="printable")throw Error("This assignment is for handwritten completion. Open it from Assigned Tests to print the paper and answer booklet.");
   const frozen=ExamPaperGenerator.validatePaper(assignedPaper.paperSnapshot,blueprint);
   if(!frozen.valid)throw Error("Assigned paper validation failed: "+frozen.errors.slice(0,3).join(" "));
   try{const saved=JSON.parse(localStorage.getItem(storageKey("eg_exam_attempt_v1"))||"null");if(saved&&saved.paperId===assignedPaper.paperSnapshot.paperId)resumeAttempt=saved;}catch(_){}
   $("startBtn").textContent="Start assigned examination";
  }
  const assignment=!!assignmentId,preparedDelivery=new URLSearchParams(location.search).get("delivery")==="latest";
  if(!assignment&&!preparedDelivery){
   try{
    const savedPaper=JSON.parse(localStorage.getItem(storageKey("eg_exam_active_paper_v1"))||"null");
    const savedState=JSON.parse(localStorage.getItem(storageKey("eg_exam_attempt_v1"))||"null");
    if(savedPaper&&savedState&&savedPaper.paperId===savedState.paperId&&ExamPaperGenerator.validatePaper(savedPaper,blueprint).valid){savedSelfStudyPaper=savedPaper;resumeAttempt=savedState;}
   }catch(_){savedSelfStudyPaper=null;resumeAttempt=null;}
  }
  if(assignment){$("startBtn").textContent="Start assigned examination";$("startBtn").disabled=false;status("Assigned to you by your Parent/Teacher. The paper snapshot is frozen; the timer starts when you begin.");}
  else if(preparedDelivery){$("startBtn").textContent="Start prepared paper";$("startBtn").disabled=false;status("Prepared paper loaded. Start when ready.");}
  else if(savedSelfStudyPaper){$("startBtn").textContent="Resume saved attempt";$("startBtn").disabled=false;status("An unfinished exam attempt was found in this browser. Resume to restore your saved answers and remaining time.");}
  else{
   $("startBtn").textContent="Generate & start paper";
   $("startBtn").disabled=false;
   status("Ready: "+blueprint.totalQuestions+" questions · "+blueprint.totalMarks+" marks. Your paper is ready when you are.");
  }
 }catch(e){status("Unable to prepare the paper: "+e.message);}
}
function makePaper(){
 const previousHistory=paperHistory;
 const wantsDelivered=new URLSearchParams(location.search).get("delivery")==="latest";
 const resumingSelfStudy=!assignedPaper&&!wantsDelivered&&!!savedSelfStudyPaper&&!!resumeAttempt;
 let delivered=false;
 if(resumingSelfStudy){paper=savedSelfStudyPaper;remaining=Math.max(0,Number(resumeAttempt.remaining)||paper.durationMinutes*60);}
 if(assignedPaper){
  if(assignedPaper.deadlineAt&&new Date(assignedPaper.deadlineAt).getTime()<Date.now())throw Error("The deadline for this examination has passed.");
  assignedPaper=window.C10AssessmentManager.startPaper(assignedPaper.assignmentId,currentStudent.studentId);
  paper=assignedPaper.paperSnapshot;
  const active=assignedPaper.attempts.find(item=>item.attemptId===assignedPaper.activeAttemptId);
  if(active&&active.startedAt){const deadline=new Date(active.startedAt).getTime()+paper.durationMinutes*60000;remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));}
  if(resumeAttempt&&Number.isFinite(Number(resumeAttempt.remaining)))remaining=Math.min(remaining,Number(resumeAttempt.remaining));
  delivered=true;
 }
 if(!assignedPaper&&wantsDelivered){
  try{
   const saved=JSON.parse(localStorage.getItem(storageKey("eg_exam_paper_delivery_v1"))||"null");
   const check=saved&&ExamPaperGenerator.validatePaper(saved,blueprint);
   if(!saved||!check||!check.valid)throw Error("The prepared paper is missing or no longer matches the selected approved blueprint. Ask the Parent/Teacher to prepare it again.");
   paper=saved;delivered=true;
  }catch(e){throw new Error(e.message||"Unable to load the prepared paper.");}
 }
 if(!delivered&&!resumingSelfStudy){
  const recentPaperFingerprints=paperHistory.map(item=>item.fingerprint||JSON.stringify(item.questionIds||[]));
  const recentQuestionIdSets=paperHistory.slice(-5).map(item=>item.questionIds||[]);
  const seed="self-study-"+profileId+"-"+Date.now()+"-"+Math.random().toString(36).slice(2);
  paper=ExamPaperGenerator.generateUniquePaper(blueprint,bank,{seed,title:"CBSE "+paperDisplayTitle()+" · Self-study Paper",recentPaperFingerprints,recentQuestionIdSets,uniqueSearchAttempts:500});
 }
 const assignedRemaining=assignedPaper||resumingSelfStudy?remaining:paper.durationMinutes*60;
 answers=resumeAttempt&&resumeAttempt.paperId===paper.paperId?JSON.parse(JSON.stringify(resumeAttempt.answers||{})):{};
 submitted=false;remaining=assignedRemaining;
 const questionIds=paper.questions.flatMap(q=>ExamPaperGenerator.questionContentIds(q));
 const fingerprint=paper.paperFingerprint||ExamPaperGenerator.paperFingerprint(paper);
 const alreadyRecorded=paperHistory.some(item=>item.paperId===paper.paperId||item.fingerprint===fingerprint);
 if(!alreadyRecorded)paperHistory=[...paperHistory,{paperId:paper.paperId,generatedAt:paper.generatedAt,questionIds,fingerprint,mcqQuestionIds:paper.questions.filter(q=>q.type==="mcq").map(q=>String(q.questionId))}].slice(-HISTORY_LIMIT);
 if(!savePaperHistory()){
  paperHistory=previousHistory;
  throw Error("This browser could not save the 50-paper repeat history for this profile. Enable site storage and try again; no paper was started.");
 }
 if(!assignedPaper&&!delivered){try{localStorage.setItem(storageKey("eg_exam_active_paper_v1"),JSON.stringify(paper));}catch(_){throw Error("This browser could not save the active paper for reload recovery. Enable site storage and try again.");}}
 render();$("setup").classList.add("exam-hidden");$("review").classList.add("exam-hidden");$("attempt").classList.remove("exam-hidden");
 $("historyStatus").textContent=(delivered?"This is the frozen paper prepared by your Parent/Teacher. ":resumingSelfStudy?"Resuming your saved attempt. ":"")+"50-paper repeat protection is active for this profile on this browser. This exact "+paper.totalQuestions+"-question combination will not repeat within the latest 50 generated papers; All question formats from the previous five papers are held out wherever the eligible pool supports it. History is profile-specific and does not sync to other devices.";
 saveAnswers();startTimer();window.scrollTo(0,0);
}
function responseContent(item,i){
 let html="";
 if(item.stimulus)html+='<p>'+esc(item.stimulus)+'</p>';
 (item.images||[]).forEach(im=>{const src=esc(im.src);html+='<img src="./'+(src.startsWith("./")?src.slice(2):src)+'" alt="'+esc(im.alt)+'">';});
 if(Array.isArray(item.parts)&&item.parts.length){
  if(Number.isInteger(item.attemptAny))html+='<p class="attempt-any-note"><strong>Attempt any '+item.attemptAny+' of the '+item.parts.length+' items.</strong> Select the items you will answer; you may change your selection while the exam is open.</p>';
  item.parts.forEach((part,j)=>{
   const selectedByDefault=!Number.isInteger(item.attemptAny)||j<item.attemptAny;
   const heading='<p><strong>('+String.fromCharCode(97+j)+')</strong> '+esc(part.prompt)+' ('+part.marks+' marks)</p>';
   const alt=Array.isArray(part.alternatives)&&part.alternatives.length?part.alternatives[0]:null;
   html+='<div class="exam-subquestion">';
   if(Number.isInteger(item.attemptAny))html+='<label class="exam-option attempt-any-select"><input type="checkbox" data-part-attempt="'+j+'" '+(selectedByDefault?'checked':'')+'><span>Attempt this item</span></label>';
   html+='<div data-attempt-part-panel="'+j+'">'+heading;
   if(Array.isArray(part.options)&&part.options.length){
    html+='<div class="exam-options">'+part.options.map(o=>'<label class="exam-option"><input type="radio" name="part-option-'+i+'-'+j+'" data-part-option="'+j+'" value="'+esc(o.optionId)+'"><span>'+esc(o.text)+'</span></label>').join("")+'</div>';
   }else if(alt){
    html+='<fieldset class="exam-choice"><legend>Choose one version of this subpart</legend>'+
     '<label class="exam-option"><input type="radio" name="subpart-choice-'+i+'-'+j+'" data-subpart-choice="'+j+'" value="main" checked><span>Answer the main subpart</span></label>'+
     '<label class="exam-option"><input type="radio" name="subpart-choice-'+i+'-'+j+'" data-subpart-choice="'+j+'" value="alternative"><span>Answer the alternative subpart</span></label></fieldset>'+
     '<div class="exam-choice-panel" data-subpart-panel="'+j+'" data-subpart-variant="main"><textarea data-part="'+j+'" data-subpart-answer="'+j+'" aria-label="Answer for question '+(i+1)+' part '+(j+1)+'" placeholder="Your answer here…"></textarea></div>'+
     '<div class="exam-choice-panel" data-subpart-panel="'+j+'" data-subpart-variant="alternative" hidden><h4>'+esc(alt.prompt)+'</h4><textarea data-part="'+j+'" data-subpart-answer="'+j+'" aria-label="Answer for question '+(i+1)+' part '+(j+1)+' alternative" placeholder="Your answer here…"></textarea></div>';
   }else html+='<textarea aria-label="Answer for question '+(i+1)+' part '+(j+1)+'" data-part="'+j+'" placeholder="Your answer here…"></textarea>';
   html+='</div></div>';
  });
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
 const active=article.querySelector('[data-choice-panel="'+selected+'"]')||article;
 active.querySelectorAll("input[data-part-attempt]").forEach(box=>{const part=box.getAttribute("data-part-attempt");active.querySelectorAll('[data-attempt-part-panel="'+part+'"]').forEach(panel=>{panel.hidden=!box.checked;});});
 active.querySelectorAll("input[data-subpart-choice]:checked").forEach(radio=>{
  const part=radio.getAttribute("data-subpart-choice");
  active.querySelectorAll('[data-subpart-panel="'+part+'"]').forEach(panel=>{panel.hidden=panel.getAttribute("data-subpart-variant")!==radio.value;});
 });
}

function render(){
 $("paperTitle").textContent=paper.title;
 $("questions").innerHTML=paper.questions.map(questionMarkup).join("");
 $("questions").querySelectorAll(".exam-question").forEach(article=>{
  const index=Number(article.dataset.q),saved=answers[index];
  if(saved){
   if(saved.optionId){const option=[...article.querySelectorAll('input[type="radio"]:not([data-choice]):not([data-subpart-choice]):not([data-part-option])')].find(el=>el.value===saved.optionId);if(option)option.checked=true;}
   if(saved.choice==="alternative"){const alternative=article.querySelector('input[data-choice][value="alternative"]');if(alternative)alternative.checked=true;}
   syncChoicePanels(article);
   const activePanel=article.querySelector('[data-choice-panel="'+(saved.choice==="alternative"?"alternative":"main")+'"]')||article;
   if(Array.isArray(saved.parts))saved.parts.forEach((part,j)=>{
    const attempt=activePanel.querySelector('input[data-part-attempt="'+j+'"]');if(attempt)attempt.checked=part.attempted!==false;
    if(part.optionId){const option=activePanel.querySelector('input[data-part-option="'+j+'"][value="'+part.optionId+'"]');if(option)option.checked=true;}
    const choice=part.choice||"main";
    const radio=activePanel.querySelector('input[data-subpart-choice="'+j+'"][value="'+choice+'"]');if(radio)radio.checked=true;
   });
   syncChoicePanels(article);
   if(Array.isArray(saved.parts))saved.parts.forEach((part,j)=>{
    const choice=part.choice||"main";
    const panel=activePanel.querySelector('[data-subpart-panel="'+j+'"][data-subpart-variant="'+choice+'"]');
    const textarea=panel?.querySelector("textarea")||activePanel.querySelector('textarea[data-part="'+j+'"]');
    if(textarea)textarea.value=part.text||"";
   });
   else [...activePanel.querySelectorAll("textarea")].forEach((el,i)=>{el.value=(saved.text||[])[i]||"";});
  }
  syncChoicePanels(article);
  article.querySelectorAll("input,textarea").forEach(el=>{
   el.addEventListener("change",()=>{
    if(el.matches("input[data-part-attempt]")&&el.checked){const group=article.querySelectorAll("input[data-part-attempt]"),max=Number((paper.questions[index]||{}).attemptAny)||group.length;if([...group].filter(node=>node.checked).length>max)el.checked=false;}
    if(el.matches("input[data-choice],input[data-subpart-choice],input[data-part-attempt]"))syncChoicePanels(article);saveAnswers();
   });
   el.addEventListener("input",saveAnswers);
  });
 });
 updateProgress();
}
function saveAnswers(){
 paper.questions.forEach((q,i)=>{
  const article=$("questions").querySelector('[data-q="'+i+'"]');if(!article)return;
  const radio=article.querySelector('input[type=radio]:checked:not([data-choice]):not([data-subpart-choice]):not([data-part-option])');
  const choice=article.querySelector("input[data-choice]:checked")?.value||"main";
  const panel=article.querySelector('[data-choice-panel="'+choice+'"]')||article;
  const selectedQuestion=choice==="alternative"&&q.alternatives?.length?q.alternatives[0]:q;
  const partAnswers=Array.isArray(selectedQuestion.parts)?selectedQuestion.parts.map((part,j)=>{
   const partChoice=panel.querySelector('input[data-subpart-choice="'+j+'"]:checked')?.value||"main";
   const partPanel=panel.querySelector('[data-subpart-panel="'+j+'"][data-subpart-variant="'+partChoice+'"]');
   const textarea=partPanel?.querySelector("textarea")||panel.querySelector('textarea[data-part="'+j+'"]');
   const attempt=panel.querySelector('input[data-part-attempt="'+j+'"]');
    const partOption=panel.querySelector('input[data-part-option="'+j+'"]:checked');
    return{choice:partChoice,text:textarea?.value||"",attempted:attempt?attempt.checked:true,optionId:partOption?.value||null};
  }):null;
  const textareas=partAnswers?partAnswers.map(part=>part.text):[...panel.querySelectorAll("textarea")].map(x=>x.value);
  answers[i]={optionId:radio?.value||null,text:textareas,choice,alternative:choice==="alternative"?0:null,parts:partAnswers};
 });
 updateProgress();
 try{localStorage.setItem(storageKey("eg_exam_attempt_v1"),JSON.stringify({paperId:paper.paperId,answers,remaining}));}catch(_){}
}
function updateProgress(){const count=Object.values(answers).filter(a=>a&&(a.optionId||a.parts?.some(p=>p.attempted!==false&&(p.optionId||p.text?.trim()))||a.text?.some(t=>t.trim()))).length;$("progress").textContent=count+" / "+paper.questions.length+" answered";}
function startTimer(){clearInterval(tick);tick=setInterval(()=>{remaining--;const h=String(Math.floor(remaining/3600)).padStart(2,"0"),m=String(Math.floor(remaining%3600/60)).padStart(2,"0"),s=String(remaining%60).padStart(2,"0");$("timer").textContent=h+":"+m+":"+s;try{const saved=JSON.parse(localStorage.getItem(storageKey("eg_exam_attempt_v1"))||"null");if(saved&&saved.paperId===paper.paperId){saved.remaining=remaining;localStorage.setItem(storageKey("eg_exam_attempt_v1"),JSON.stringify(saved));}}catch(_){}if(remaining<=0){clearInterval(tick);submit(true);}},1000);}
function submit(auto=false){if(submitted)return;saveAnswers();submitted=true;clearInterval(tick);let mcq=0,correct=0,answered=0;paper.questions.forEach((q,i)=>{const a=answers[i];if(a&&(a.optionId||a.parts?.some(p=>p.attempted!==false&&(p.optionId||p.text?.trim()))||a.text?.some(t=>t.trim())))answered++;if(q.type==="mcq"||q.type==="assertion-reason"){mcq++;if(a?.optionId===q.correctOptionId)correct++;}if(Array.isArray(q.parts))q.parts.forEach((part,j)=>{const response=a?.parts?.[j];if(Array.isArray(part.options)){mcq++;if(response?.optionId===part.correctOptionId)correct++;}});});$("attempt").classList.add("exam-hidden");$("review").classList.remove("exam-hidden");$("score").textContent=(auto?"Time is up. ":"")+"Submitted "+answered+" of "+paper.questions.length+" questions. MCQ score: "+correct+" / "+mcq+". Written answers require self-review.";const box=$("reviewAnswers");box.innerHTML="";paper.questions.forEach((q,i)=>{const d=document.createElement("div");d.className="exam-question";const selected=answers[i]?.choice==="alternative"&&q.alternatives?.length?q.alternatives[0]:q;const partReview=Array.isArray(selected.parts)?selected.parts.map((part,j)=>{const response=answers[i]?.parts?.[j]||{},chosen=response.choice==="alternative"&&part.alternatives?.length?part.alternatives[0]:part;const user=response.optionId||response.text||"Not attempted";const key=chosen.answerKey?.modelAnswer||chosen.answerKey||"Refer to the marking points.";const optionKey=chosen.options&&response.optionId?String(chosen.correctOptionId||"")+" — "+(chosen.options.find(o=>o.optionId===chosen.correctOptionId)?.text||""):"";return"("+String.fromCharCode(97+j)+(response.attempted===false?" · not selected":response.choice==="alternative"?" · alternative":"")+") "+(chosen.prompt||part.prompt)+"\nYour answer: "+user+"\nModel answer: "+(optionKey||key);}).join("\n\n"):"";const key=partReview||selected.answerKey?.modelAnswer||selected.answerKey?.answer||selected.answerKey?.correctAnswer||"Refer to your textbook and marking points.";const userResponse=Array.isArray(selected.parts)?"See selected response for each case-study subpart.":(answers[i]?.optionId||answers[i]?.text?.join(" / ")||"Not attempted");d.innerHTML='<h3>Q'+(i+1)+': '+esc(selected.prompt||q.prompt)+'</h3><p><strong>Your answer:</strong> '+esc(userResponse)+'</p><p><strong>Model answer / review:</strong><br>'+esc(key).replace(/\n/g,"<br>")+'</p>';box.appendChild(d);});try{localStorage.setItem(storageKey("eg_exam_last_result_v1"),JSON.stringify({paperId:paper.paperId,answers,submittedAt:new Date().toISOString(),mcqCorrect:correct,mcqTotal:mcq}));localStorage.removeItem(storageKey("eg_exam_attempt_v1"));localStorage.removeItem(storageKey("eg_exam_active_paper_v1"));savedSelfStudyPaper=null;resumeAttempt=null;const queued=JSON.parse(localStorage.getItem(storageKey("eg_exam_paper_delivery_v1"))||"null");if(queued&&queued.paperId===paper.paperId)localStorage.removeItem(storageKey("eg_exam_paper_delivery_v1"));if(assignedPaper&&currentStudent)window.C10AssessmentManager.submitPaper(assignedPaper.assignmentId,currentStudent.studentId,answers);}catch(e){status(e.message||"Answers were saved, but assignment submission needs attention.");}window.scrollTo(0,0);}
$("startBtn").addEventListener("click",()=>{try{makePaper();}catch(e){status("Cannot generate this paper: "+e.message);}});
$("submitBtn").addEventListener("click",()=>{if(confirm("Submit your paper now? You cannot change answers after submission."))submit(false);});
$("printBtn").addEventListener("click",()=>window.print());
$("newBtn").addEventListener("click",()=>{$("review").classList.add("exam-hidden");$("setup").classList.remove("exam-hidden");status("Ready for another attempt.");window.scrollTo(0,0);});
load();
})();