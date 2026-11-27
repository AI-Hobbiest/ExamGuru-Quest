/* Educator-only review queue for objective questions extracted from CBSE Class X papers.
 * Parsing is a discovery aid only: answers are never accepted without human verification.
 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 function bankSubjectFor(subjectId){
  const value=String(subjectId||"").trim().toLowerCase();
  if(value==="mathematics-basic"||value==="mathematics-standard")return "mathematics";
  if(value==="hindi-a"||value==="hindi-b")return "hindi";
  return value;
 }
 function sourceBadge(source){
  if(!source||String(source.type||"").toUpperCase()!=="CBSE_PYQ"||!/^20\d{2}$/.test(String(source.year||"")))return "";
  return "CBSE-"+String(source.year)+" Question";
 }
 function candidateFingerprint(prompt,options){
  const norm=value=>String(value==null?"":value).normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  return norm(prompt)+"::"+(Array.isArray(options)?options.map(norm).filter(Boolean).sort().join("|"):"");
 }
 function safeOfficialPackageUrl(url){
  try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname==="www.cbse.gov.in"&&parsed.pathname.toLowerCase().startsWith("/cbsenew/")&&parsed.pathname.toLowerCase().endsWith(".zip");}
  catch(_){return false;}
 }
 window.C10CbseReview=Object.freeze({bankSubjectFor,sourceBadge,candidateFingerprint,safeOfficialPackageUrl});
 if(!$("cbseReviewStatus"))return;
 let queue=null,manifest=null,visibleCandidates=[],selectedCandidate=null,addedThisSession=new Set();
 const status=(message,tone="")=>{
  $("cbseReviewStatus").textContent=String(message);
  $("cbseReviewStatus").className="admin-status"+(tone?" "+tone:"");
 };
 const text=(id,value)=>{const el=$(id);if(el)el.textContent=String(value==null?"":value);};
 const node=(tag,cls,value)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(value!==undefined)el.textContent=String(value);return el;
 };
 function addOption(select,value,label){
  const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);
 }
 function subjectLabel(subjectId){
  return ({"science":"Science","mathematics":"Mathematics","mathematics-basic":"Mathematics Basic",
   "mathematics-standard":"Mathematics Standard","social-science":"Social Science",
   "english":"English","hindi-a":"Hindi Course A","hindi-b":"Hindi Course B"})[subjectId]||subjectId;
 }
 async function loadQueue(){
  status("Loading CBSE review queue and official CBSE archive catalogue…");
  try{
   const responses=await Promise.all([
    fetch("./data/cbse-class10-mcq-review-queue.json",{cache:"no-store"}),
    fetch("./data/cbse-class10-pyq.json",{cache:"no-store"})
   ]);
   if(responses.some(response=>!response.ok))throw new Error("The CBSE review queue or archive catalogue is not available in this deployment.");
   [queue,manifest]=await Promise.all(responses.map(response=>response.json()));
   if(queue.kind!=="cbse-class10-mcq-review-queue"||queue.classId!=="10"||!Array.isArray(queue.candidates)||
      queue.candidateCount!==queue.candidates.length)throw new Error("The CBSE review queue failed its format check.");
   if(manifest.kind!=="cbse-class10-pyq-catalog"||manifest.classId!=="10"||!Array.isArray(manifest.records))
    throw new Error("The CBSE archive catalogue failed its format check.");
   populateYears();renderCandidatePicker();
   const total=queue.candidates.length,occurrences=Number(queue.sourceOccurrenceCount)||total;
   const skipped=queue.rejectedOrSkipped?Object.values(queue.rejectedOrSkipped).reduce((a,b)=>a+Number(b||0),0):0;
   text("cbseReviewSummary",total+" unique MCQ candidate(s) · "+occurrences+" paper occurrence(s) · "+skipped+" unreadable or skipped source file(s).");
   status(total?"Review queue loaded. Open the official CBSE ZIP packages to verify each candidate; all remain pending until manually checked.":"No four-option MCQ candidates are available in this review queue.","success");
  }catch(error){
   queue=null;manifest=null;visibleCandidates=[];$("cbseReviewCandidate").replaceChildren();
   clearDetails();
   status(error.message||"Unable to load the CBSE review queue.","error");
  }
 }
 function populateYears(){
  const select=$("cbseReviewYear"),current=select.value||"all";
  select.replaceChildren();addOption(select,"all","All years");
  [...new Set(queue.candidates.map(candidate=>String(candidate.source&&candidate.source.year||"")))]
   .filter(year=>/^20\d{2}$/.test(year)).sort((a,b)=>Number(b)-Number(a))
   .forEach(year=>addOption(select,year,year));
  select.value=[...select.options].some(option=>option.value===current)?current:"all";
 }
 function renderCandidatePicker(){
  if(!queue)return;
  const subject=$("cbseReviewSubject").value,year=$("cbseReviewYear").value;
  visibleCandidates=queue.candidates.filter(candidate=>
   (subject==="all"||candidate.subjectId===subject)&&
   (year==="all"||String(candidate.source&&candidate.source.year||"")===year)
  );
  const select=$("cbseReviewCandidate"),old=select.value;
  select.replaceChildren();
  if(!visibleCandidates.length){
   addOption(select,"","No candidates match these filters");selectedCandidate=null;clearDetails();return;
  }
  visibleCandidates.forEach(candidate=>{
   const source=candidate.source||{};
   const label=[source.year,source.examType,subjectLabel(candidate.subjectId),source.questionNumber,candidate.candidateId].filter(Boolean).join(" · ");
   addOption(select,candidate.candidateId,label);
  });
  select.value=visibleCandidates.some(candidate=>candidate.candidateId===old)?old:visibleCandidates[0].candidateId;
  renderSelectedCandidate();
 }
 function clearDetails(){
  selectedCandidate=null;
  text("cbseReviewSource","Choose a candidate to inspect its original CBSE paper and marking scheme.");
  text("cbseReviewPrompt","No candidate selected.");
  $("cbseReviewOptions").replaceChildren();
  $("cbseReviewSourceLinks").replaceChildren();
  $("cbseReviewProposals").replaceChildren();
  $("cbseReviewChapter").replaceChildren();
  $("cbseReviewCorrectOption").replaceChildren();
  addOption($("cbseReviewChapter"),"","Load a candidate first");
  addOption($("cbseReviewCorrectOption"),"","Choose after checking the official key");
  $("cbseReviewApprove").disabled=true;
  $("cbseReviewExportBank").disabled=true;
  $("cbseReviewConfirm").checked=false;
 }
 async function ensureTargetBank(candidate){
  const api=window.C10AdminQuestionBanks;
  if(!api||typeof api.loadForCbseSubject!=="function")throw new Error("The Admin question-bank editor is not available.");
  return await api.loadForCbseSubject(candidate.subjectId);
 }
 function appendSourceLinks(candidate){
  const container=$("cbseReviewSourceLinks");
  container.replaceChildren();
  const source=candidate.source||{};
  const record=manifest.records.find(item=>item.id===source.paperId);
  if(!record){container.appendChild(node("p","admin-muted","The official CBSE source package is not listed in the catalogue."));return;}
  const addPackage=(url,label)=>{
   try{
    if(!safeOfficialPackageUrl(url))return false;
    const a=node("a","admin-btn secondary",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";container.appendChild(a);return true;
   }catch(_){return false;}
  };
  const paperAdded=addPackage(record.paperUrl,"Open official CBSE question-paper ZIP");
  const proposed=(candidate.proposedAnswers||[]).find(item=>item.markingSchemeFile);
  const schemeId=proposed&&proposed.sourceOccurrence&&proposed.sourceOccurrence.paperId||source.paperId;
  const schemeRecord=manifest.records.find(item=>item.id===schemeId)||record;
  const schemeAdded=addPackage(schemeRecord.markingSchemeUrl,"Open official CBSE marking-scheme ZIP");
  if(!paperAdded&&!schemeAdded)container.appendChild(node("p","admin-muted","Official CBSE source package links are unavailable for this record."));
  container.appendChild(node("p","admin-muted","CBSE hosts the original ZIP packages. Locate the paper and page noted above; ExamGuru does not mirror the PDFs."));
 }
 async function renderSelectedCandidate(){
  const candidate=visibleCandidates.find(item=>item.candidateId===$("cbseReviewCandidate").value);
  if(!candidate){clearDetails();return;}
  selectedCandidate=candidate;
  $("cbseReviewConfirm").checked=false;
  $("cbseReviewExplanation").value="";
  $("cbseReviewCorrectOption").replaceChildren();
  addOption($("cbseReviewCorrectOption"),"","Choose after checking the official key");
  (candidate.options||[]).forEach(option=>addOption($("cbseReviewCorrectOption"),option.optionId,String(option.optionId)+". "+option.text));
  text("cbseReviewSource",[sourceBadge(candidate.source),candidate.source&&candidate.source.examType,
   subjectLabel(candidate.subjectId),candidate.source&&("Paper "+candidate.source.paperId),
   candidate.source&&candidate.source.questionNumber].filter(Boolean).join(" · "));
  text("cbseReviewPrompt",candidate.prompt||"No question text extracted.");
  $("cbseReviewOptions").replaceChildren();
  (candidate.options||[]).forEach(option=>$("cbseReviewOptions").appendChild(node("li","",String(option.optionId)+". "+String(option.text))));
  $("cbseReviewProposals").replaceChildren();
  const proposals=candidate.proposedAnswers||[];
  if(!proposals.length){
   $("cbseReviewProposals").appendChild(node("p","admin-muted","No marking-scheme answer candidate was parsed. Read the official scheme and choose the answer manually."));
  }else{
   proposals.forEach(proposal=>{
    const label="Unverified answer suggestion: Option "+proposal.proposedOptionId+
     " · "+String(proposal.markingSchemeFile||"marking scheme")+" · page "+String(proposal.pageNumber||"?")+
     ". This is not an approved answer; verify the printed scheme yourself.";
    $("cbseReviewProposals").appendChild(node("div","cbse-review-proposal",label));
   });
  }
  appendSourceLinks(candidate);
  $("cbseReviewChapter").replaceChildren();
  addOption($("cbseReviewChapter"),"","Loading matching Class 10 bank…");
  $("cbseReviewApprove").disabled=true;
  $("cbseReviewExportBank").disabled=true;
  try{
   const state=await ensureTargetBank(candidate);
   if(!selectedCandidate||selectedCandidate.candidateId!==candidate.candidateId)return;
   $("cbseReviewChapter").replaceChildren();
   state.chapters.forEach(chapter=>addOption($("cbseReviewChapter"),chapter.key,chapter.chapterNo+". "+chapter.title+" ("+chapter.questionCount+")"));
   text("cbseReviewWorkStatus","Target bank ready: Class 10 · "+state.subjectId+" · "+state.questionCount+" existing question(s).");
   $("cbseReviewApprove").disabled=addedThisSession.has(candidate.candidateId);
   $("cbseReviewExportBank").disabled=!state.dirty;
   if(addedThisSession.has(candidate.candidateId))text("cbseReviewWorkStatus","This candidate has already been added to the current local draft.");
  }catch(error){
   $("cbseReviewChapter").replaceChildren();
   addOption($("cbseReviewChapter"),"","Bank could not be loaded");
   text("cbseReviewWorkStatus",error.message||"Could not load the matching Class 10 bank.");
  }
 }
 function approve(){
  const candidate=selectedCandidate;
  if(!candidate)return;
  if(!$("cbseReviewConfirm").checked){
   text("cbseReviewWorkStatus","First confirm that you checked the exact question and answer against the original CBSE paper and official marking scheme.");
   return;
  }
  try{
   const result=window.C10AdminQuestionBanks.approveCbseCandidate(candidate,{
    chapterKey:$("cbseReviewChapter").value,correctOptionId:$("cbseReviewCorrectOption").value,
    difficulty:$("cbseReviewDifficulty").value,competency:$("cbseReviewCompetency").value,
    explanation:$("cbseReviewExplanation").value,confirmed:true
   });
   addedThisSession.add(candidate.candidateId);
   const option=[...$("cbseReviewCandidate").options].find(item=>item.value===candidate.candidateId);
   if(option)option.textContent+=" · Added to bank draft";
   text("cbseReviewWorkStatus","Added "+result.questionId+" to "+result.chapterTitle+". The item is now in the local bank draft; export the bank JSON before publishing.");
   $("cbseReviewApprove").disabled=true;
   $("cbseReviewExportBank").disabled=false;
  }catch(error){
   text("cbseReviewWorkStatus",error.message||"Unable to approve the candidate.");
  }
 }
 function exportBank(){
  try{
   const state=window.C10AdminQuestionBanks.getState();
   if(!state.loaded||!state.dirty)throw new Error("No unexported changes are waiting in the current bank.");
   window.C10AdminQuestionBanks.exportCurrentBank();
   $("cbseReviewExportBank").disabled=true;
   text("cbseReviewWorkStatus","Bank JSON exported. Review the file and publish it to the matching data/*.json path in GitHub.");
  }catch(error){
   text("cbseReviewWorkStatus",error.message||"Unable to export the bank draft.");
  }
 }
 function init(){
  $("cbseReviewReload").addEventListener("click",loadQueue);
  $("cbseReviewSubject").addEventListener("change",renderCandidatePicker);
  $("cbseReviewYear").addEventListener("change",renderCandidatePicker);
  $("cbseReviewCandidate").addEventListener("change",renderSelectedCandidate);
  $("cbseReviewApprove").addEventListener("click",approve);
  $("cbseReviewExportBank").addEventListener("click",exportBank);
  loadQueue();
 }
 init();
})();