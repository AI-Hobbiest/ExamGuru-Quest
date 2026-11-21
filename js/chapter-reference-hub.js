(() => {
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let manifest=null,activeItems=[];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function render(){
 const subject=$( "crhSubject" ).value, chapterKey=$( "crhChapter" ).value, type=$( "crhType" ).value;
 const group=manifest.subjects.find(s=>s.id===subject), chapter=group?.chapters.find(c=>c.chapterKey===chapterKey);
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
  if(item.summary)card.append(el("p","crh-summary",item.summary));
  if(item.formula)card.append(el("div","crh-formula",item.formula));
  if(item.equation)card.append(el("div","crh-equation",item.equation));
  if(item.condition)card.append(el("p","crh-note","Condition: "+item.condition));
  if(item.observation)card.append(el("p","crh-note","Observation: "+item.observation));
  if(item.steps?.length){const list=el("ol","crh-steps");item.steps.forEach(step=>list.append(el("li","",step)));card.append(list);}
  if(item.facts?.length){const list=el("dl","crh-facts");item.facts.forEach(pair=>{list.append(el("dt","",pair[0]),el("dd","",pair[1]));});card.append(list);}
  if(item.asset){const figure=el("figure","crh-figure");const img=document.createElement("img");img.src="./"+item.asset;img.alt=item.alt||item.title;img.loading="lazy";img.decoding="async";figure.append(img);if(item.alt)figure.append(el("figcaption","",item.alt));card.append(figure);}
  if(item.labels?.length){const labels=el("ul","crh-labels");item.labels.forEach(label=>labels.append(el("li","",label)));card.append(labels);}
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
 // page-access restores student/parent identity asynchronously; wait before class gating.
 if(window.C10StudyAccessReady)await window.C10StudyAccessReady;
 let viewerClass=new URLSearchParams(location.search).get("classId")||"";
 if(window.C10StudyViewerRole==="parent"){
  try{const children=await window.C10StudentAuth.getLinkedChildren();const child=children.find(item=>String(item.studentId)===String(window.C10StudyChildId));viewerClass=String(child?.classId||"");}catch(_){viewerClass="";}
 }else if(window.C10StudyViewerRole==="admin"){viewerClass=viewerClass||"10";}
 else{const user=window.C10StudentAuth&&window.C10StudentAuth.currentUser?window.C10StudentAuth.currentUser():null;viewerClass=viewerClass||String(user?.classId||"");}
 if(viewerClass!=="10"){section.hidden=true;return;}
 try{
  const response=await fetch("./data/chapter-reference.json",{cache:"no-store"});if(!response.ok)throw new Error("Reference catalogue unavailable.");
  manifest=await response.json();
  if(manifest.kind!=="chapter-reference-manifest"||manifest.classId!=="10"||!Array.isArray(manifest.subjects))throw new Error("Reference catalogue format is invalid.");
  $("crhSubject").replaceChildren(...manifest.subjects.map(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=s.label;return o;}));
  $("crhSubject").addEventListener("change",populateChapters);
  $("crhChapter").addEventListener("change",render);
  $("crhType").addEventListener("change",render);
  populateChapters();
  $("crhStatus").textContent="Chapter references loaded from GitHub static JSON. Diagrams reuse optimized SVG files already in this repository.";
 }catch(error){$("crhStatus").textContent=error.message;$("crhCards").replaceChildren(el("div","crh-empty","Chapter references could not be loaded. Please refresh or contact the administrator."));}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();