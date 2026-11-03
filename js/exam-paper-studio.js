/* Admin UI for the first Exam Paper Studio foundation release. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
let blueprint=null,bank=null,paper=null,bankStore=null,draftStore=null;
const PAPER_HISTORY_KEY="eg_exam_paper_history_v1",PAPER_HISTORY_LIMIT=50;
function setStatus(message,tone){const n=$("paperStudioStatus");if(n){n.textContent=message;n.className="admin-status"+(tone?" "+tone:"");}}
function downloadJson(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function drawBlueprint(){if(!blueprint)return;const target=$("paperBlueprintSummary");target.innerHTML="";blueprint.sections.forEach(s=>{const box=document.createElement("div");box.className="admin-feature";const h=document.createElement("strong");h.textContent=s.title+" · "+s.totalMarks+" marks";const p=document.createElement("p");p.textContent="Questions "+s.questionNumberRange.start+"–"+s.questionNumberRange.end+" · "+s.questionCount+" numbered questions";box.append(h,p);target.appendChild(box);});$("paperBlueprintState").value=blueprint.status==="ready"?"Approved for generation":"Draft · slot audit pending";$("paperTotalSummary").textContent=blueprint.totalQuestions+" questions · "+blueprint.totalMarks+" marks · "+(blueprint.durationMinutes/60)+" hours";$("generatePaperBtn").disabled=blueprint.status!=="ready"||!bank;}
function drawBank(){const n=$("paperPoolSummary");n.innerHTML="";if(!bank){n.textContent="The published mixed-question pool or shared Science practice bank is unavailable.";$("paperPoolState").textContent="Integrated pool unavailable";$("generatePaperBtn").disabled=true;return;}let total=0;blueprint.sections.forEach(s=>{const count=bank.questions.filter(q=>q.sectionId===s.sectionId&&q.approvalStatus==="approved").length;total+=count;const box=document.createElement("div");box.className="admin-feature";const h=document.createElement("strong");h.textContent=s.title;const p=document.createElement("p");p.textContent=count+" approved question(s) available";box.append(h,p);n.appendChild(box);});const mcqs=bank.questions.filter(q=>q.type==="mcq"&&q.approvalStatus==="approved").length;const shared=bankIntegrationStats?.appended||0;$("paperPoolState").textContent=total+" approved / "+bank.questions.length+" total · "+mcqs+" MCQs ("+shared+" from shared practice bank)";$("generatePaperBtn").disabled=!blueprint||blueprint.status!=="ready";}
function createStores(){
 if(!window.C10Storage)throw Error("Versioned browser storage adapter is unavailable.");
 bankStore=window.C10Storage.createLocalStore({
  kind:"exam-paper-question-bank",recordId:"class10-science",defaults:()=>null,
  validate:value=>value===null||window.C10ExamPaperGenerator.validateQuestionBank(value,{academicYear:"2026-27"}).valid
 });
 draftStore=window.C10Storage.createLocalStore({
  kind:"exam-paper-drafts",recordId:"class10-science",defaults:()=>({drafts:[]}),
  validate:value=>!!value&&Array.isArray(value.drafts)&&value.drafts.every(item=>item&&item.kind==="exam-paper-snapshot")
 });
}
let sourceBank=null,practiceChapters=null,bankIntegrationStats=null;
function assembleIntegratedBank(){
 if(!sourceBank||!practiceChapters||!blueprint)return;
 const integrated=window.C10ExamPaperGenerator.mergeQuestionBanks(sourceBank,practiceChapters,blueprint);
 bank=integrated.bank;bankIntegrationStats=integrated.stats;
 drawBank();
}
async function loadBank(){
 try{
  const [baseResponse,practiceResponse,blueprintResponse]=await Promise.all([
   fetch("./data/exam-papers/question-banks/class-10-science-2026-27-v1.json",{cache:"no-store"}),
   fetch("./data/science.json",{cache:"no-store"}),
   fetch("./data/exam-papers/blueprints/class-10-science-2026-27.json",{cache:"no-store"})
  ]);
  if(!baseResponse.ok)throw Error("Published mixed-question pool HTTP "+baseResponse.status);
  if(!practiceResponse.ok)throw Error("Shared chapter-wise Science MCQ bank HTTP "+practiceResponse.status);
  if(!blueprintResponse.ok)throw Error("CBSE Science blueprint HTTP "+blueprintResponse.status);
  const publishedBase=await baseResponse.json();
  practiceChapters=await practiceResponse.json();
  if(!blueprint)blueprint=await blueprintResponse.json();
  sourceBank=bankStore.load()||publishedBase;
  const check=window.C10ExamPaperGenerator.validateQuestionBank(sourceBank,{academicYear:"2026-27"});
  if(!check.valid)throw Error(check.errors.slice(0,8).join(" "));
  if(!bankStore.load())bankStore.save(sourceBank);
  assembleIntegratedBank();
  const sharedCount=bankIntegrationStats.appended;
  setStatus("Integrated pool ready: "+sharedCount.toLocaleString()+" existing chapter-wise MCQs joined with the dedicated exam-paper questions. No MCQs were regenerated.", "success");
 }catch(e){
  bank=null;bankIntegrationStats=null;if(blueprint)drawBank();
  setStatus("Integrated Science question pool could not be loaded: "+(e.message||e),"error");
 }
}
function loadSavedDraft(){try{const saved=draftStore.load();if(saved.drafts.length)paper=saved.drafts[saved.drafts.length-1];}catch(_){paper=null;}}
function saveDraft(value){const saved=draftStore.load();const drafts=(saved.drafts||[]).filter(item=>item.paperId!==value.paperId);drafts.push(value);draftStore.save({drafts:drafts.slice(-5)});}
async function loadBlueprint(){try{const r=await fetch("./data/exam-papers/blueprints/class-10-science-2026-27.json",{cache:"no-store"});if(!r.ok)throw Error("Blueprint HTTP "+r.status);blueprint=await r.json();const check=window.C10ExamPaperGenerator.validateBlueprint(blueprint);if(!check.valid)throw Error(check.errors.join(" "));drawBlueprint();drawBank();setStatus(blueprint.status==="ready"?(bankIntegrationStats?"Approved blueprint and shared chapter-wise MCQ pool loaded.":"Approved blueprint loaded; waiting for the shared Science question pool."):"Blueprint loaded. Generation is locked until the official question-by-question mark/type/internal-choice slot map is audited and approved.","warning");}catch(e){setStatus("Unable to load blueprint: "+(e.message||e),"error");}}
async function importBank(){const file=$("paperPoolFile").files&&$("paperPoolFile").files[0];if(!file){setStatus("Choose a question-bank JSON file first.","error");return;}try{const value=JSON.parse(await file.text());const check=window.C10ExamPaperGenerator.validateQuestionBank(value,{academicYear:"2026-27"});if(!check.valid)throw Error(check.errors.slice(0,8).join(" "));sourceBank=value;bankStore.save(sourceBank);assembleIntegratedBank();paper=null;$("paperResultActions").hidden=true;setStatus("Imported "+sourceBank.questions.length+" mixed-question records and retained the shared chapter-wise MCQ integration ("+(bankIntegrationStats?.appended||0).toLocaleString()+" MCQs).","success");}catch(e){setStatus("Question-bank import failed: "+(e.message||e),"error");}}
function showPaper(p){const n=$("paperPreview");n.innerHTML="";const h=document.createElement("h3");h.textContent=p.title;const meta=document.createElement("p");meta.textContent=p.totalQuestions+" questions · "+p.totalMarks+" marks";n.append(h,meta);p.sectionResults.forEach(s=>{const d=document.createElement("div");d.className="admin-feature";d.textContent=s.title+": "+s.questionCount+" questions / "+s.totalMarks+" marks";n.appendChild(d);});$("paperPreviewStatus").textContent="Validated draft snapshot. Question content and blueprint version are frozen."; $("paperResultActions").hidden=false;}
function readPaperHistory(){
 try{
  const value=JSON.parse(localStorage.getItem(PAPER_HISTORY_KEY)||"[]");
  if(!Array.isArray(value))return[];
  return value.map(item=>{
   const questionIds=Array.isArray(item&&item.questionIds)?item.questionIds.map(String).filter(Boolean):[];
   const mcqQuestionIds=Array.isArray(item&&item.mcqQuestionIds)?item.mcqQuestionIds.map(String).filter(Boolean):[];
   return{paperId:String(item&&item.paperId||""),generatedAt:String(item&&item.generatedAt||""),questionIds,mcqQuestionIds,fingerprint:String(item&&item.fingerprint||JSON.stringify(questionIds))};
  }).filter(item=>item.questionIds.length&&item.fingerprint!=="[]").slice(-PAPER_HISTORY_LIMIT);
 }catch(_){return[];}
}
function savePaperHistory(history){
 try{localStorage.setItem(PAPER_HISTORY_KEY,JSON.stringify(history));return true;}catch(_){return false;}
}
function generate(){
 if(!blueprint||!bank)return;
 try{
  const coverage=window.C10ExamPaperGenerator.auditSlotCoverage(blueprint,bank,3);
  if(!coverage.valid)throw Error("A 50-paper pool needs at least three eligible approved questions in every slot. "+coverage.errors.slice(0,5).join(" "));
  const previousHistory=readPaperHistory();
  const recentPaperFingerprints=previousHistory.map(item=>item.fingerprint);
  const recentMcqQuestionIds=previousHistory.slice(-2).flatMap(item=>item.mcqQuestionIds||[]);
  const candidate=window.C10ExamPaperGenerator.generateUniquePaper(blueprint,bank,{
   seed:"admin-science-"+Date.now()+"-"+Math.random().toString(36).slice(2),
   title:"CBSE Class 10 Science Practice Paper",
   recentPaperFingerprints,
   recentQuestionIds:recentMcqQuestionIds,
   uniqueSearchAttempts:500
  });
  const questionIds=candidate.questions.map(q=>String(q.questionId));
  const fingerprint=candidate.paperFingerprint||window.C10ExamPaperGenerator.paperFingerprint(candidate);
  const mcqQuestionIds=candidate.questions.filter(q=>q.type==="mcq").map(q=>String(q.questionId));
  const nextHistory=[...previousHistory,{paperId:candidate.paperId,generatedAt:candidate.generatedAt,questionIds,mcqQuestionIds,fingerprint}].slice(-PAPER_HISTORY_LIMIT);
  if(!savePaperHistory(nextHistory))throw Error("This browser could not save the 50-paper repeat history. Enable site storage and try again; no paper was started.");
  paper=candidate;
  saveDraft(paper);showPaper(paper);
  setStatus("Paper generated. Exact combinations from the previous 50 papers are excluded, and MCQs used in the previous two papers are held out on this browser.","success");
 }catch(e){setStatus(e.message||"Generation failed.","error");}
}
function init(){if(!$("tab-exam-papers"))return;createStores();$("importPaperPoolBtn").addEventListener("click",importBank);$("downloadPaperPoolTemplateBtn").addEventListener("click",()=>downloadJson(window.C10ExamPaperGenerator.createQuestionBankTemplate(),"class-10-science-paper-question-bank-template.json"));$("generatePaperBtn").addEventListener("click",generate);$("downloadPaperJsonBtn").addEventListener("click",()=>{if(paper)downloadJson(paper,"class-10-science-paper-"+paper.paperId+".json");});$("printStudentPaperBtn").addEventListener("click",()=>{if(paper)try{window.C10ExamPaperRenderer.printPaper(paper,"student");}catch(e){setStatus(e.message||String(e),"error");}});$("printTeacherPaperBtn").addEventListener("click",()=>{if(paper)try{window.C10ExamPaperRenderer.printPaper(paper,"teacher");}catch(e){setStatus(e.message||String(e),"error");}});loadBank();loadSavedDraft();loadBlueprint();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();