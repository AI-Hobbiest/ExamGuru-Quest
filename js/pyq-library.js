/* Class 10 CBSE previous-year archive catalogue.
 * PDFs remain hosted by CBSE; ExamGuru publishes only the small JSON catalogue.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const DATA_URL="./data/cbse-class10-pyq.json";
let catalogue=null;
function addOption(select,value,label){const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);}
function safeExternalLink(url){
 try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname==="www.cbse.gov.in"&&parsed.pathname.toLowerCase().startsWith("/cbsenew/")&&parsed.pathname.toLowerCase().endsWith(".zip");}
 catch(_){return false;}
}
function makePackageLink(url,label){
 if(!safeExternalLink(url))return null;
 const a=document.createElement("a");a.className="pyq-link";a.href=url;a.textContent=label;
 a.target="_blank";a.rel="noopener noreferrer";return a;
}
function render(){
 if(!catalogue)return;
 const subject=$("pyqSubject").value,year=$("pyqYear").value,exam=$("pyqExam").value;
 const entries=catalogue.records.filter(item=>(subject==="all"||item.subjectId===subject)&&(year==="all"||item.year===year)&&(exam==="all"||item.examType===exam));
 const list=$("pyqList");list.replaceChildren();
 $("pyqCount").textContent=entries.length+" CBSE archive records · files open directly from the official CBSE website";
 if(!entries.length){const empty=document.createElement("p");empty.className="pyq-empty";empty.textContent="No verified papers match these filters.";list.appendChild(empty);return;}
 entries.slice().sort((a,b)=>Number(b.year)-Number(a.year)||a.subjectName.localeCompare(b.subjectName)).forEach(item=>{
  const card=document.createElement("article");card.className="pyq-item";
  const meta=document.createElement("div");meta.className="pyq-meta";meta.textContent=item.year+" · "+item.examType+" · Subject code "+item.subjectCode;
  const title=document.createElement("h3");title.textContent=item.subjectName;
  const format=document.createElement("span");format.className="pyq-format";format.textContent="OFFICIAL CBSE ARCHIVE";
  const note=document.createElement("p");note.textContent=item.paperNote||"Open the original question-paper package from the official CBSE archive.";
  const source=document.createElement("p");source.className="pyq-source-note";source.textContent="Source: Central Board of Secondary Education (CBSE) · "+item.year+" "+item.examType+" · Class X";
  const actions=document.createElement("div");actions.className="pyq-actions";
  const paper=makePackageLink(item.paperUrl,"Question paper package (CBSE ZIP)");
  const scheme=makePackageLink(item.markingSchemeUrl,"Official marking scheme (CBSE ZIP)");
  if(paper)actions.appendChild(paper);
  if(scheme)actions.appendChild(scheme);
  if(!paper&&!scheme){const unavailable=document.createElement("p");unavailable.className="pyq-review-note";unavailable.textContent="Official package links are not available for this catalogue record.";card.appendChild(unavailable);}
  card.append(meta,title,format,note,actions);
  if(item.schemeNote){const schemeNote=document.createElement("p");schemeNote.className="pyq-note";schemeNote.textContent=item.schemeNote;card.appendChild(schemeNote);}
  card.appendChild(source);list.appendChild(card);
 });
}
async function init(){
 try{
  const response=await fetch(DATA_URL,{cache:"no-store"});
  if(!response.ok)throw Error("CBSE archive catalogue is unavailable");
  catalogue=await response.json();
  if(catalogue.schemaVersion!==2||catalogue.kind!=="cbse-class10-pyq-catalog"||catalogue.classId!=="10"||
    !Array.isArray(catalogue.subjects)||!Array.isArray(catalogue.records)||!catalogue.records.length)throw Error("Catalogue format is invalid");
  const seen=new Set();
  for(const item of catalogue.records){
   if(!item.id||seen.has(item.id)||!catalogue.subjects.some(s=>s.id===item.subjectId)||
     !safeExternalLink(item.paperUrl)||(item.markingSchemeUrl&&!safeExternalLink(item.markingSchemeUrl)))throw Error("A paper catalogue record failed validation");
   seen.add(item.id);
  }
  catalogue.subjects.forEach(item=>addOption($("pyqSubject"),item.id,item.name));
  [...new Set(catalogue.records.map(item=>item.year))].sort((a,b)=>Number(b)-Number(a)).forEach(value=>addOption($("pyqYear"),value,value));
  [...new Set(catalogue.records.map(item=>item.examType))].forEach(value=>addOption($("pyqExam"),value,value));
  ["pyqSubject","pyqYear","pyqExam"].forEach(id=>$(id).addEventListener("change",render));
  render();
 }catch(error){
  $("pyqList").textContent="Unable to load the CBSE archive catalogue. Please refresh the page.";
  $("pyqCount").textContent="CBSE archive catalogue unavailable.";console.error(error);
 }
}
window.C10PyqLibrary=Object.freeze({safeExternalLink});
init();
})();