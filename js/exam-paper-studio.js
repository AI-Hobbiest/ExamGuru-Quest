/* Registry-driven Admin Exam Paper Studio. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
let profile=null,profileId="",defaultProfileId="",registry=null,blueprint=null,bank=null,paper=null,bankStore=null,draftStore=null;
let sourceBank=null,practiceChapters=null,bankIntegrationStats=null;
const PAPER_HISTORY_KEY="eg_exam_paper_history_v1",PAPER_HISTORY_LIMIT=50,REGISTRY_URL="./data/exam-papers/profile-registry.json";
const safePath=value=>typeof value==="string"&&value.startsWith("./data/")&&!value.split("/").includes("..");
const generator=()=>window.ExamPaperGenerator||window.C10ExamPaperGenerator;
const renderer=()=>window.ExamPaperRenderer||window.C10ExamPaperRenderer;
function subjectTitle(){return String(profile?.subjectTitle||blueprint?.subjectTitle||blueprint?.subjectId||"");}
function profileTitle(){return String(profile?.title||("Class "+blueprint?.classId+" · "+subjectTitle()+(blueprint?.subjectCode?" ("+blueprint.subjectCode+")":"")));}
function scopedKey(base){return !profileId||profileId===defaultProfileId?base:base+"_"+profileId.replace(/[^a-z0-9_-]/gi,"_");}
function setStatus(message,tone){const n=$("paperStudioStatus");if(n){n.textContent=message;n.className="admin-status"+(tone?" "+tone:"");}}
function setLoadStage(message){
 const state=$("paperBlueprintState"),summary=$("paperTotalSummary"),meta=$("paperProfileMeta");
 if(state)state.value=message;
 if(summary)summary.textContent=message;
 if(meta)meta.textContent="";
}
function setLoadFailure(error){
 const message=String(error&&error.message||error||"Unknown profile-loading error");
 const state=$("paperBlueprintState"),summary=$("paperTotalSummary");
 if(state)state.value="Load failed";
 if(summary)summary.textContent=message;
 setStatus("Unable to load Admin Exam Studio: "+message,"error");
}
async function fetchProfileJson(path,label,timeoutMs=20000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(path,{cache:"no-store",signal:controller.signal});
  if(!response.ok)throw Error(label+" returned HTTP "+response.status+" ("+path+").");
  try{return await response.json();}
  catch(error){throw Error(label+" returned invalid JSON ("+path+"): "+(error&&error.message||error));}
 }catch(error){
  if(error&&error.name==="AbortError")throw Error(label+" timed out after "+Math.round(timeoutMs/1000)+" seconds ("+path+").");
  throw error;
 }finally{clearTimeout(timer);}
}
function downloadJson(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function createStores(){
 if(!window.C10Storage)throw Error("Versioned browser storage adapter is unavailable.");
 const legacy=profileId===defaultProfileId;
 const storageProfileId=legacy?"class10-science":profileId;
 bankStore=window.C10Storage.createLocalStore({kind:"exam-paper-question-bank",recordId:storageProfileId,defaults:()=>null,validate:value=>value===null||generator().validateQuestionBank(value,{classId:blueprint.classId,subjectId:blueprint.subjectId,academicYear:blueprint.academicYear}).valid});
 draftStore=window.C10Storage.createLocalStore({kind:"exam-paper-drafts",recordId:storageProfileId,defaults:()=>({drafts:[]}),validate:value=>!!value&&Array.isArray(value.drafts)&&value.drafts.every(item=>item&&item.kind==="exam-paper-snapshot")});
}
function drawBlueprint(){
 if(!blueprint)return;
 const target=$("paperBlueprintSummary");target.innerHTML="";
 blueprint.sections.forEach(s=>{const box=document.createElement("div");box.className="admin-feature";const h=document.createElement("strong");h.textContent=s.title+" · "+s.totalMarks+" marks";const p=document.createElement("p");p.textContent="Questions "+s.questionNumberRange.start+"–"+s.questionNumberRange.end+" · "+s.questionCount+" numbered questions";box.append(h,p);target.appendChild(box);});
 $("paperBlueprintState").value=blueprint.status==="ready"?"Approved for generation":"Draft · slot audit pending";
 $("paperTotalSummary").textContent=blueprint.totalQuestions+" questions · "+blueprint.totalMarks+" marks · "+(blueprint.durationMinutes/60)+" hours";
 $("generatePaperBtn").textContent="Generate "+subjectTitle()+" paper";
 $("generatePaperBtn").disabled=blueprint.status!=="ready"||!bank;
 const meta=$("paperProfileMeta");if(meta)meta.textContent=profileTitle()+" · "+blueprint.totalMarks+" marks · "+blueprint.durationMinutes+" minutes · "+blueprint.totalQuestions+" questions";
}
function drawBank(){
 const n=$("paperPoolSummary");n.innerHTML="";
 if(!bank){n.textContent="The published mixed-question pool"+(profile?.practiceBankUrl?" or shared chapter-wise practice bank":"")+" is unavailable.";$("paperPoolState").textContent="Integrated pool unavailable";$("generatePaperBtn").disabled=true;return;}
 let total=0;
 blueprint.sections.forEach(s=>{const count=bank.questions.filter(q=>q.sectionId===s.sectionId&&q.approvalStatus==="approved").length;total+=count;const box=document.createElement("div");box.className="admin-feature";const h=document.createElement("strong");h.textContent=s.title;const p=document.createElement("p");p.textContent=count+" approved question(s) available";box.append(h,p);n.appendChild(box);});
 const mcqs=bank.questions.filter(q=>q.type==="mcq"&&q.approvalStatus==="approved").length,shared=bankIntegrationStats?.appended||0;
 $("paperPoolState").textContent=total+" approved / "+bank.questions.length+" total · "+mcqs+" MCQs ("+shared+" from linked practice bank)";
 $("generatePaperBtn").disabled=!blueprint||blueprint.status!=="ready";
}
function assembleIntegratedBank(){
 if(!sourceBank||!blueprint)return;
 const integrated=generator().mergeQuestionBanks(sourceBank,practiceChapters,blueprint,{minimumCandidatesPerSlot:profile.minimumCandidatesPerSlot||20});
 bank=integrated.bank;bankIntegrationStats=integrated.stats;drawBank();
}
function loadSavedDraft(){try{const saved=draftStore.load();if(saved.drafts.length)paper=saved.drafts[saved.drafts.length-1];}catch(_){paper=null;}}
function saveDraft(value){const saved=draftStore.load();const drafts=(saved.drafts||[]).filter(item=>item.paperId!==value.paperId);drafts.push(value);draftStore.save({drafts:drafts.slice(-5)});}
function readPaperHistory(){try{const value=JSON.parse(localStorage.getItem(scopedKey(PAPER_HISTORY_KEY))||"[]");if(!Array.isArray(value))return[];return value.map(item=>{const questionIds=Array.isArray(item?.questionIds)?item.questionIds.map(String).filter(Boolean):[],mcqQuestionIds=Array.isArray(item?.mcqQuestionIds)?item.mcqQuestionIds.map(String).filter(Boolean):[];return{paperId:String(item?.paperId||""),generatedAt:String(item?.generatedAt||""),questionIds,mcqQuestionIds,fingerprint:String(item?.fingerprint||JSON.stringify(questionIds))};}).filter(item=>item.questionIds.length&&item.fingerprint!=="[]").slice(-PAPER_HISTORY_LIMIT);}catch(_){return[];}}
function savePaperHistory(history){try{localStorage.setItem(scopedKey(PAPER_HISTORY_KEY),JSON.stringify(history));return true;}catch(_){return false;}}
function showPaper(p){
 const n=$("paperPreview");n.innerHTML="";const h=document.createElement("h3");h.textContent=p.title;const meta=document.createElement("p");meta.textContent=p.totalQuestions+" questions · "+p.totalMarks+" marks · "+(p.deliveryMode||"printable")+" delivery";n.append(h,meta);
 p.sectionResults.forEach(s=>{const d=document.createElement("div");d.className="admin-feature";d.textContent=s.title+": "+s.questionCount+" questions / "+s.totalMarks+" marks";n.appendChild(d);});
 $("paperPreviewStatus").textContent="Validated frozen paper snapshot. Delivery choice is saved with this paper.";$("paperResultActions").hidden=false;updateDeliveryActions();
}
function updateDeliveryActions(){const mode=$("paperDeliveryMode")?.value||"printable";if(paper&&paper.deliveryMode!==mode){paper.deliveryMode=mode;try{saveDraft(paper);}catch(_){}}const online=mode==="online"||mode==="hybrid";["printStudentPaperBtn","printAnswerBookletBtn"].forEach(id=>{const el=$(id);if(el)el.hidden=mode==="online";});const teacher=$("printTeacherPaperBtn");if(teacher)teacher.hidden=mode==="online";const onlineButton=$("openPaperOnlineBtn");if(onlineButton)onlineButton.hidden=!online;const help=$("paperDeliveryHelp");if(help)help.textContent=mode==="online"?"The frozen paper opens in the interactive student exam page.":mode==="hybrid"?"The student receives a printable paper and an online follow-up path.":"Print the question paper and separate answer booklet. The teacher copy contains the marking scheme.";}
function generate(){
 if(!blueprint||!bank)return;
 try{
  const g=generator(),minimum=profile.minimumCandidatesPerSlot||20,coverage=g.auditSlotCoverage(blueprint,bank,minimum);
  if(!coverage.valid)throw Error("A paper pool needs at least "+minimum+" eligible approved questions in every slot. "+coverage.errors.slice(0,5).join(" "));
  const previousHistory=readPaperHistory(),recentPaperFingerprints=previousHistory.map(item=>item.fingerprint),recentQuestionIdSets=previousHistory.slice(-5).map(item=>item.questionIds||[]);
  const candidate=g.generateUniquePaper(blueprint,bank,{seed:"admin-"+profileId+"-"+Date.now()+"-"+Math.random().toString(36).slice(2),title:profileTitle()+" Practice Paper",recentPaperFingerprints,recentQuestionIdSets,uniqueSearchAttempts:500});
  const questionIds=candidate.questions.flatMap(q=>g.questionContentIds(q)),fingerprint=candidate.paperFingerprint||g.paperFingerprint(candidate),mcqQuestionIds=candidate.questions.filter(q=>q.type==="mcq").map(q=>String(q.questionId));
  const nextHistory=[...previousHistory,{paperId:candidate.paperId,generatedAt:candidate.generatedAt,questionIds,mcqQuestionIds,fingerprint}].slice(-PAPER_HISTORY_LIMIT);
  if(!savePaperHistory(nextHistory))throw Error("This browser could not save the 50-paper repeat history. Enable site storage and try again; no paper was started.");
  candidate.deliveryMode=$("paperDeliveryMode")?.value||"printable";paper=candidate;saveDraft(paper);showPaper(paper);
  setStatus(candidate.repeatProtection?.fallback?`Paper generated. Exact combinations from the previous 50 papers are excluded. The five-paper all-format repeat window was relaxed to ${candidate.repeatProtection.appliedWindow} prior papers because a slot had insufficient unused candidates.`:"Paper generated. Exact combinations from the previous 50 papers are excluded; questions of every format from the previous five papers are held out wherever the eligible pool supports it.","success");
 }catch(e){setStatus(e.message||"Generation failed.","error");}
}
async function loadProfile(profileToLoad){
 profile=profileToLoad;profileId=String(profile.profileId);blueprint=null;bank=null;sourceBank=null;practiceChapters=null;bankIntegrationStats=null;paper=null;
 $("paperResultActions").hidden=true;$("paperPreview").innerHTML="";$("paperPreviewStatus").textContent="No paper generated in this session.";
 setLoadStage("Loading blueprint…");
 createStores();
 if(!safePath(profile.blueprintUrl)||!safePath(profile.questionBankUrl)||(profile.practiceBankUrl&&!safePath(profile.practiceBankUrl)))throw Error("The selected profile contains an unsafe data path.");
 blueprint=await fetchProfileJson(profile.blueprintUrl,"Blueprint");
 blueprint.subjectTitle=blueprint.subjectTitle||profile.subjectTitle||blueprint.subjectId;
 if(String(blueprint.classId)!==String(profile.classId)||String(blueprint.subjectId)!==String(profile.subjectId))throw Error("Profile metadata does not match the selected blueprint class and subject.");
 if(profile.subjectCode&&String(blueprint.subjectCode||"")!==String(profile.subjectCode))throw Error("Profile subject code does not match its blueprint.");
 if(profile.academicYear&&String(blueprint.academicYear)!==String(profile.academicYear))throw Error("Profile academic year does not match its blueprint.");
 const g=generator(),bc=g.validateBlueprint(blueprint);if(!bc.valid)throw Error(bc.errors.join(" "));
 setLoadStage("Loading approved question pool…");
 const publishedBank=await fetchProfileJson(profile.questionBankUrl,"Approved question pool");
 const savedBank=bankStore.load();
 // The published pool is authoritative only when its content/version matches;
 // otherwise refresh stale browser data before validating coverage.
 sourceBank=savedBank&&String(savedBank.bankVersion||"")===String(publishedBank.bankVersion||"")
  &&JSON.stringify(savedBank.questions||[])===JSON.stringify(publishedBank.questions||[])
  ?savedBank:publishedBank;
 if(sourceBank===publishedBank)bankStore.save(sourceBank);
 setLoadStage(profile.practiceBankUrl?"Loading chapter-wise practice bank…":"Validating approved question pool…");
 practiceChapters=profile.practiceBankUrl?await fetchProfileJson(profile.practiceBankUrl,"Chapter-wise practice bank"):null;
 const qc=g.validateQuestionBank(sourceBank,{classId:blueprint.classId,subjectId:blueprint.subjectId,academicYear:blueprint.academicYear});if(!qc.valid)throw Error(qc.errors.slice(0,8).join(" "));
 if(!bankStore.load()||String(bankStore.load().bankVersion||"")!==String(publishedBank.bankVersion||"")||JSON.stringify(bankStore.load().questions||[])!==JSON.stringify(publishedBank.questions||[]))bankStore.save(sourceBank);
 setLoadStage("Integrating approved questions and checking every paper slot…");
 assembleIntegratedBank();drawBlueprint();loadSavedDraft();if(paper)showPaper(paper);
 const minimum=profile.minimumCandidatesPerSlot||20,coverage=bankIntegrationStats?.coverage||g.auditSlotCoverage(blueprint,bank,minimum);
 const ready=blueprint.status==="ready"&&coverage.valid;
 $("paperBlueprintState").value=ready?"Approved for generation":"Blueprint or slot audit pending";
 $("paperTotalSummary").textContent=blueprint.totalQuestions+" questions · "+blueprint.totalMarks+" marks · "+(blueprint.durationMinutes/60)+" hours";
 setStatus(ready?"Profile ready: "+profileTitle()+". "+(bankIntegrationStats?.appended||0).toLocaleString()+" linked practice MCQs integrated.":"Profile loaded, but generation remains locked until the blueprint and question-pool coverage are approved.","success");
}
async function loadRegistry(){
 setLoadStage("Loading enabled examination profiles…");
 registry=await fetchProfileJson(REGISTRY_URL,"Exam profile registry");if(!registry||registry.schemaVersion!==1||registry.kind!=="exam-paper-profile-registry"||!Array.isArray(registry.profiles))throw Error("Exam profile registry is invalid.");
 defaultProfileId=String(registry.defaultProfileId||"");const available=registry.profiles.filter(item=>item&&item.enabled!==false);if(!available.length)throw Error("No enabled examination profiles are published.");
 const select=$("paperProfileSelect");if(select){select.innerHTML="";available.forEach(item=>{const option=document.createElement("option");option.value=String(item.profileId);option.textContent=String(item.title||("Class "+item.classId+" · "+item.subjectTitle));select.appendChild(option);});}
 const requested=new URLSearchParams(location.search).get("profile")||defaultProfileId;const selected=available.find(item=>String(item.profileId)===requested)||available.find(item=>String(item.profileId)===defaultProfileId)||available[0];
 if(select){select.value=selected.profileId;select.disabled=available.length<2;select.addEventListener("change",()=>{const url=new URL(location.href);url.searchParams.set("profile",select.value);location.href=url.toString();});}
 await loadProfile(selected);
}
function init(){
 if(!$("tab-exam-papers"))return;
 $("importPaperPoolBtn").addEventListener("click",async()=>{const file=$("paperPoolFile").files?.[0];if(!file){setStatus("Choose a question-bank JSON file first.","error");return;}try{const value=JSON.parse(await file.text()),check=generator().validateQuestionBank(value,{classId:blueprint.classId,subjectId:blueprint.subjectId,academicYear:blueprint.academicYear});if(!check.valid)throw Error(check.errors.slice(0,8).join(" "));sourceBank=value;bankStore.save(sourceBank);assembleIntegratedBank();paper=null;$("paperResultActions").hidden=true;setStatus("Imported "+sourceBank.questions.length+" mixed-question records for "+profileTitle()+".","success");}catch(e){setStatus("Question-bank import failed: "+e.message,"error");}});
 $("downloadPaperPoolTemplateBtn").addEventListener("click",()=>downloadJson(generator().createQuestionBankTemplate({classId:blueprint?.classId,subjectId:blueprint?.subjectId,subjectCode:blueprint?.subjectCode,subjectTitle:blueprint?.subjectTitle,academicYear:blueprint?.academicYear}),"exam-paper-question-bank-template.json"));
 $("generatePaperBtn").addEventListener("click",generate);$("paperDeliveryMode").addEventListener("change",updateDeliveryActions);
 $("downloadPaperJsonBtn").addEventListener("click",()=>{if(paper)downloadJson(paper,"exam-paper-"+paper.paperId+".json");});
 $("printStudentPaperBtn").addEventListener("click",()=>{if(paper)try{renderer().printPaper(paper,"student");}catch(e){setStatus(e.message||String(e),"error");}});
 $("printAnswerBookletBtn").addEventListener("click",()=>{if(paper)try{renderer().printAnswerBooklet(paper);}catch(e){setStatus(e.message||String(e),"error");}});
 $("printTeacherPaperBtn").addEventListener("click",()=>{if(paper)try{renderer().printPaper(paper,"teacher");}catch(e){setStatus(e.message||String(e),"error");}});
 $("openPaperOnlineBtn").addEventListener("click",()=>{if(!paper)return;try{localStorage.setItem("eg_exam_paper_delivery_v1",JSON.stringify(paper));const opened=window.open("./exam-practice.html?delivery=latest&profile="+encodeURIComponent(profileId),"_blank");setStatus(opened?"Frozen paper prepared. The student must sign in on this browser to start.":"Paper saved on this browser. Allow pop-ups or open Exam Paper Practice after sign-in.","success");}catch(e){setStatus(e.message||String(e),"error");}});
 updateDeliveryActions();loadRegistry().catch(setLoadFailure);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
