(() => {
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let manifest=null,activeItems=[],activeChapter=null;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function render(){
 const subject=$( "crhSubject" ).value, chapterKey=$( "crhChapter" ).value, type=$( "crhType" ).value;
 const group=manifest.subjects.find(s=>s.id===subject), chapter=group?.chapters.find(c=>c.chapterKey===chapterKey);
 activeChapter=chapter||null;
 activeItems=chapter?.items||[];
 const shown=activeItems.filter(item=>type==="all"||item.type===type);
 $("crhChapterTitle").textContent=chapter?.chapterTitle||"Choose a chapter";
 $("crhChapterMeta").textContent=chapter?shown.length+" of "+activeItems.length+" reference items · "+(group.label):"";
 $("crhCards").replaceChildren();
 if(!shown.length){$("crhCards").append(el("div","crh-empty","No reference items are published for this chapter yet."));return;}
 shown.forEach(item=>{
  const card=el("article","crh-card");
  const head=el("div","crh-card-head");
  const kind=el("span","crh-kind",item.type.replaceAll("_"," "));
  head.append(kind);card.append(head,el("h3","",item.title));
  if(item.summary){if(item.type==="THEOREM_PROOF")card.append(el("p","crh-note","Core statement / result"));card.append(el("p","crh-summary",item.summary));}
  if(item.formula)card.append(el("div","crh-formula",item.formula));
  if(item.equation)card.append(el("div","crh-equation",item.equation));
  if(item.condition)card.append(el("p","crh-note","Condition: "+item.condition));
  if(item.observation)card.append(el("p","crh-note","Observation: "+item.observation));
  if(item.steps?.length){if(item.type==="THEOREM_PROOF")card.append(el("h4","crh-subheading","Proof / derivation"));const list=el("ol","crh-steps");item.steps.forEach(step=>list.append(el("li","",step)));card.append(list);}
  if(item.facts?.length){const list=el("dl","crh-facts");item.facts.forEach(pair=>{list.append(el("dt","",pair[0]),el("dd","",pair[1]));});card.append(list);}
  const visualApproved=["verified_ncert_match","verified_reusable_match"].includes(item.visualAudit?.status);
  if((item.asset||item.assetUrl)&&visualApproved){const figure=el("figure","crh-figure");const img=document.createElement("img");img.src=item.assetUrl||("./"+item.asset);img.alt=item.alt||item.title;img.loading="lazy";img.decoding="async";figure.append(img);if(item.alt)figure.append(el("figcaption","",item.alt));card.append(figure);}
  else if(item.asset||item.assetUrl){card.append(el("p","crh-note","Visual temporarily withheld: this image has not yet passed the NCERT figure-fidelity and reuse-rights audit. Open the official chapter PDF below for the textbook illustration."));}
  if(item.labels?.length){const labels=el("ul","crh-labels");item.labels.forEach(label=>labels.append(el("li","",label)));card.append(labels);}
  if(item.illustrationType)card.append(el("p","crh-note",item.illustrationType));
  else if(item.asset)card.append(el("p","crh-note","Supplementary ExamGuru visual — not yet verified as a reproduction of the NCERT textbook figure."));
  if(item.source)card.append(el("p","crh-note","NCERT reference: "+item.source));
  if(item.imageCredit){const credit=el("p","crh-note","Image: "+item.imageCredit.author+" · "+item.imageCredit.license+" · "+Math.round(item.imageCredit.fileSizeBytes/1024)+" KB external asset (0 KB added to repository)");const sourceLink=document.createElement("a");sourceLink.href=item.imageCredit.source;sourceLink.target="_blank";sourceLink.rel="noopener noreferrer";sourceLink.textContent="Source and licence";credit.append(" · ",sourceLink);card.append(credit);}
  if(activeChapter?.sourceUrl){const sourceLine=el("p","crh-note");sourceLine.append(document.createTextNode((activeChapter.sourceBook||"NCERT")+" · "+(activeChapter.sourceEdition||"")+" · "));const link=document.createElement("a");link.href=activeChapter.sourceUrl;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Open official chapter PDF";sourceLine.append(link);card.append(sourceLine);}
  if(item.examTip)card.append(el("p","crh-tip","Exam tip: "+item.examTip));
  $("crhCards").append(card);
 });
}
function populateChapters(){
 const group=manifest.subjects.find(s=>s.id===$("crhSubject").value),select=$("crhChapter");select.replaceChildren();
 (group?.chapters||[]).forEach(ch=>{const o=document.createElement("option");o.value=ch.chapterKey;o.textContent=ch.chapterTitle;select.append(o);});
 render();
}
async function init(){
 const section=$("chapterReferenceHub");if(!section)return;
 // Resolve class from the page's established session snapshot without waiting on
 // secondary account refreshes. This page is currently the Class 10 Study Library.
 let viewerClass=String(window.C10StudyViewerClassId||new URLSearchParams(location.search).get("classId")||"").trim().replace(/^class[ -]?/i,"");
 if(!viewerClass){
  const user=window.C10StudentAuth&&window.C10StudentAuth.currentUser?window.C10StudentAuth.currentUser():null;
  viewerClass=String(user?.classId||"10");
 }
 if(viewerClass!=="10"){
  section.hidden=true;const tab=$("referencesHubTab");if(tab)tab.hidden=true;
  $("crhStatus").textContent="References Hub is currently available for Class 10 students only.";
  return;
 }
 $("crhStatus").textContent="Connecting to the Class 10 reference catalogue…";
 try{
  const response=await fetch("./data/chapter-reference.json",{cache:"no-store"});
  if(!response.ok)throw new Error("Catalogue request failed (HTTP "+response.status+").");
  const loaded=await response.json();
  if(loaded.kind!=="chapter-reference-manifest"||String(loaded.classId)!=="10"||!Array.isArray(loaded.subjects)||!loaded.subjects.length)throw new Error("Reference catalogue format is invalid or empty.");
  manifest=loaded;
  const subjectSelect=$("crhSubject");
  subjectSelect.replaceChildren(...manifest.subjects.map(subject=>{
   const option=document.createElement("option");option.value=subject.id;option.textContent=subject.label;return option;
  }));
  subjectSelect.addEventListener("change",populateChapters);
  $("crhChapter").addEventListener("change",render);
  $("crhType").addEventListener("change",render);
  populateChapters();
  $("crhStatus").textContent="Loaded "+manifest.subjects.length+" subjects and "+manifest.subjects.reduce((n,s)=>n+s.chapters.length,0)+" chapters.";
 }catch(error){
  $("crhStatus").textContent="Could not load references: "+(error&&error.message?error.message:String(error));
  $("crhSubject").replaceChildren(el("option","","Catalogue unavailable"));
  $("crhChapter").replaceChildren(el("option","","No chapters available"));
  $("crhChapterTitle").textContent="Reference catalogue unavailable";
  $("crhCards").replaceChildren(el("div","crh-empty","Please retry after checking your connection. The exact loading error is shown above."));
  console.error("Chapter Reference Hub initialization failed:",error);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();