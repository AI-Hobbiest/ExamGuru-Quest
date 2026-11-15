(()=>{"use strict";
const $=id=>document.getElementById(id);
const subjects={science:["Science","science.json",["science"]],mathematics:["Mathematics","mathematics.json",["mathematics","mathematics-basic","mathematics-standard"]],"social-science":["Social Science","social-science.json",["social-science"]],english:["English","english.json",["english"]],hindi:["Hindi","hindi.json",["hindi","hindi-a","hindi-b"]]};
const key="examguru_cbse_review_approvals_v1";
const read=()=>{try{const x=JSON.parse(localStorage.getItem(key)||"{}");return Array.isArray(x.approved)?x.approved:[];}catch(_){return[];}};
let approvals=read(),queue=null,candidate=null,bank=null,bankSubject=null;
const norm=x=>String(x||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const fingerprint=(p,o)=>norm(p)+"::"+(o||[]).map(norm).sort().join("|");
const subjectOf=c=>Object.keys(subjects).find(k=>subjects[k][2].includes(c.subjectId));
const status=(s,t)=>{$("cbseReviewStatusMessage").textContent=s;$("cbseReviewStatusMessage").className="admin-status "+(t||"");};
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function drawList(){
 const host=$("cbseReviewCandidateList");host.replaceChildren();
 const q=norm($("cbseReviewSearch").value),sub=$("cbseReviewSubject").value,mode=$("cbseReviewStatus").value;
 const rows=(queue?.candidates||[]).filter(c=>{
  const k=subjectOf(c),done=approvals.some(a=>a.id===c.candidateId);
  return (sub==="all"||sub===k)&&(mode==="all"||(mode==="pending"&&!done)||(mode==="approved"&&done))&&(!q||norm(c.prompt+" "+c.source.reference+" "+c.source.paperId).includes(q));
 });
 rows.forEach(c=>{
  const done=approvals.some(a=>a.id===c.candidateId),b=make("button","admin-review-candidate",c.prompt);
  b.type="button";b.append(make("small","", "CBSE-"+c.source.year+" · "+c.source.examType+" · "+c.source.subjectCode+" · "+c.source.questionNumber+(done?" · Approved locally":" · Pending")));
  b.onclick=()=>openCandidate(c);host.appendChild(b);
 });
 $("cbseReviewTotal").textContent=String(queue?.candidateCount||0);
 $("cbseReviewPending").textContent=String((queue?.candidates||[]).filter(c=>!approvals.some(a=>a.id===c.candidateId)).length);
 $("cbseReviewApproved").textContent=String(approvals.length);
 if(!rows.length)host.appendChild(make("p","admin-empty","No candidates match these filters."));
}
function safeFile(path){return typeof path==="string"&&/^\.\/cbse-papers\/files\/[a-f0-9]{24}-.+\.pdf$/i.test(path);}
async function loadBank(subject){
 const file=subjects[subject][1],r=await fetch("./data/"+file,{cache:"no-store"});if(!r.ok)throw Error("Could not load "+file);
 const data=await r.json();if(!Array.isArray(data))throw Error("Expected a chapter array in "+file);
 for(const a of approvals.filter(a=>a.subject===subject)){
  const ch=data.find((x,i)=>String(x.key||x.chapterKey||x.chapter_no||i+1)===a.chapter);
  if(ch&&!ch.questions.some(q=>fingerprint(q.question||q.prompt,q.options)===fingerprint(a.question.question,a.question.options)))ch.questions.push(a.question);
 }
 bank=data;bankSubject=subject;return data;
}
async function openCandidate(c){
 candidate=c;const sub=subjectOf(c);$("cbseReviewEmpty").hidden=true;$("cbseReviewEditor").hidden=false;
 $("cbseReviewSourceTag").textContent="CBSE-"+c.source.year+" Question";
 $("cbseReviewSourceMeta").textContent=[c.source.examType,"Subject "+c.source.subjectCode,c.source.questionNumber].join(" · ");
 $("cbseReviewQuestion").textContent=c.prompt;
 const options=$("cbseReviewOptions");options.replaceChildren();
 c.options.forEach((o,i)=>{const row=make("div","admin-review-option","");row.append(make("b","",o.optionId||String.fromCharCode(65+i)),make("span","",o.text));options.appendChild(row);});
 const evidence=$("cbseReviewSourceFiles");evidence.replaceChildren();
 (c.sourceOccurrences||[]).forEach(o=>{
  const row=make("div","admin-review-source-row",""),info=make("div","");
  info.append(make("strong","",o.paperFile||"CBSE paper"),make("small","","Page "+o.pageNumber+" · "+((o.source||{}).year||c.source.year)));
  if(safeFile(o.paperFilePath)){const a=make("a","admin-btn secondary","Open original PDF");a.href=o.paperFilePath+"#page="+Number(o.pageNumber||1);a.target="_blank";a.rel="noopener noreferrer";row.append(info,a);}else row.append(info);
  (o.answerKeyCandidates||[]).forEach(v=>{
   row.append(make("small","","Marking scheme suggests "+v.proposedOptionId+" (unverified)"));
   if(safeFile(v.markingSchemeFilePath)){const a=make("a","admin-btn secondary","Open marking scheme");a.href=v.markingSchemeFilePath+"#page="+Number(v.pageNumber||1);a.target="_blank";a.rel="noopener noreferrer";row.append(a);}
  });
  evidence.appendChild(row);
 });
 ["cbseReviewAnswer","cbseReviewDifficulty","cbseReviewCompetency","cbseReviewExplanation"].forEach(id=>$(id).value="");
 $("cbseReviewConfirm").checked=false;
 try{
  const data=await loadBank(sub);
  const ch=$("cbseReviewChapter");ch.replaceChildren(new Option("Choose a chapter / topic",""));
  data.forEach((item,i)=>ch.appendChild(new Option(String(item.chapter_no||i+1).padStart(2,"0")+" · "+item.title,String(item.key||item.chapterKey||item.chapter_no||i+1))));
  $("cbseReviewApproveBtn").disabled=approvals.some(a=>a.id===c.candidateId);
  $("cbseReviewExportBtn").disabled=!approvals.some(a=>a.subject===sub);
  status("Review the original paper and answer key before approving.","success");
 }catch(e){status(e.message,"error");}
}
function approve(){
 if(!candidate||!bank||!bankSubject)return;
 const answer=$("cbseReviewAnswer").value,chapter=$("cbseReviewChapter").value,difficulty=$("cbseReviewDifficulty").value,
 competency=$("cbseReviewCompetency").value,explanation=$("cbseReviewExplanation").value.trim();
 if(!answer||!chapter||!difficulty||!competency||!explanation||!$("cbseReviewConfirm").checked){status("Complete every review field and confirm that you checked the original CBSE paper and marking scheme.","error");return;}
 const options=candidate.options.map(x=>x.text),keyNow=fingerprint(candidate.prompt,options);
 if(bank.some(ch=>(ch.questions||[]).some(q=>fingerprint(q.question||q.prompt,q.options)===keyNow))){status("This question already exists in the published bank; no duplicate was added.","error");return;}
 const question={id:candidate.candidateId,question:candidate.prompt,options,answer:["A","B","C","D"].indexOf(answer),explanation,difficulty,competency,
  competencyTagStatus:"author-confirmed",competencyTagReason:"Manually checked against the original CBSE paper and matching official marking scheme; chapter, difficulty and competency reviewed.",
  competencyTaggerVersion:"1.0.0",source:JSON.parse(JSON.stringify(candidate.source))};
 const target=bank.find((ch,i)=>String(ch.key||ch.chapterKey||ch.chapter_no||i+1)===chapter);if(!target){status("Selected chapter no longer exists.","error");return;}
 target.questions.push(question);approvals.push({id:candidate.candidateId,subject:bankSubject,chapter,question});
 try{localStorage.setItem(key,JSON.stringify({approved:approvals}));}catch(_){}
 $("cbseReviewApproveBtn").disabled=true;$("cbseReviewExportBtn").disabled=false;
 $("cbseReviewEditorStatus").textContent="Added to this browser's local bank draft. Download the reviewed bank JSON to publish; the live student bank is unchanged until an authorised maintainer commits it.";
 status("Approved locally. The student bank has not been changed yet.","success");drawList();
}
function exportBank(){
 if(!bank||!bankSubject){status("Choose a candidate from the subject you want to export.","error");return;}
 if(!approvals.some(a=>a.subject===bankSubject)){status("No reviewed questions are available for this subject.","error");return;}
 const blob=new Blob([JSON.stringify(bank,null,2)+"\n"],{type:"application/json"}),url=URL.createObjectURL(blob),a=make("a","","");
 a.href=url;a.download=subjects[bankSubject][1];document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status("Downloaded "+subjects[bankSubject][1]+" with locally reviewed CBSE questions.","success");
}
async function init(){
 try{
  const r=await fetch(QUEUE_URL,{cache:"no-store"});if(!r.ok)throw Error("CBSE MCQ review queue is unavailable until the latest Pages extraction has completed.");
  queue=await r.json();if(queue.kind!=="cbse-class10-mcq-review-queue"||queue.classId!=="10"||!Array.isArray(queue.candidates))throw Error("Invalid CBSE review queue.");
  $("cbseReviewSubject").onchange=drawList;$("cbseReviewStatus").onchange=drawList;$("cbseReviewSearch").oninput=drawList;
  $("cbseReviewApproveBtn").onclick=approve;$("cbseReviewExportBtn").onclick=exportBank;
  drawList();status("Loaded "+queue.candidateCount+" CBSE MCQ candidates. All require human review before promotion.","success");
 }catch(e){status(e.message,"error");$("cbseReviewCandidateList").replaceChildren(make("p","admin-empty",e.message));}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();