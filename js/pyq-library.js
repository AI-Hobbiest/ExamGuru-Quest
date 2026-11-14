/* Class 10 CBSE previous-year paper library. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const DATA_URL="./data/cbse-class10-pyq.json";
let catalogue=null;
function addOption(select,value,label){const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);}
function safeExternalLink(url){
 try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname==="www.cbse.gov.in"&&parsed.pathname.toLowerCase().endsWith(".zip");}
 catch(_){return false;}
}
function makeLink(url,label,secondary){
 const a=document.createElement("a");a.className="pyq-link"+(secondary?" secondary":"");
 a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;return a;
}
function render(){
 if(!catalogue)return;
 const subject=$("pyqSubject").value,year=$("pyqYear").value,exam=$("pyqExam").value;
 const entries=catalogue.records.filter(item=>(subject==="all"||item.subjectId===subject)&&(year==="all"||item.year===year)&&(exam==="all"||item.examType===exam));
 const list=$("pyqList");list.replaceChildren();
 $("pyqCount").textContent=entries.length+" verified paper records · CBSE-hosted downloads";
 if(!entries.length){const empty=document.createElement("p");empty.className="pyq-empty";empty.textContent="No verified papers match these filters.";list.appendChild(empty);return;}
 entries.slice().sort((a,b)=>Number(b.year)-Number(a.year)||a.subjectName.localeCompare(b.subjectName)).forEach(item=>{
  const card=document.createElement("article");card.className="pyq-item";
  const meta=document.createElement("div");meta.className="pyq-meta";meta.textContent=item.year+" · "+item.examType+" · Subject code "+item.subjectCode;
  const title=document.createElement("h3");title.textContent=item.subjectName;
  const format=document.createElement("span");format.className="pyq-format";format.textContent="CBSE ZIP PACKAGE";
  const paperNote=document.createElement("p");paperNote.textContent=item.paperNote||"Official question-paper package, as listed in the CBSE archive.";
  const actions=document.createElement("div");actions.className="pyq-actions";
  if(safeExternalLink(item.paperUrl))actions.appendChild(makeLink(item.paperUrl,"Download Question Paper (.ZIP)",false));
  if(item.markingSchemeUrl&&safeExternalLink(item.markingSchemeUrl)){
   actions.appendChild(makeLink(item.markingSchemeUrl,"Official Marking Scheme (.ZIP)",true));
  }else{
   const missing=document.createElement("p");missing.textContent="No matching official marking-scheme package is listed in the verified catalogue.";actions.appendChild(missing);
  }
  const schemeNote=item.schemeNote?document.createElement("p"):null;
  if(schemeNote)schemeNote.textContent=item.schemeNote;
  const source=document.createElement("p");source.className="pyq-note";
  const q=document.createElement("a");q.href=catalogue.archives.questionPapers;q.target="_blank";q.rel="noopener noreferrer";q.textContent="Question paper source";
  const sep=document.createTextNode(" · ");
  const m=document.createElement("a");m.href=catalogue.archives.markingSchemes;m.target="_blank";m.rel="noopener noreferrer";m.textContent="Marking scheme source";
  source.append(q,sep,m);
  card.append(meta,title,format,paperNote,actions);
  if(schemeNote)card.appendChild(schemeNote);
  card.appendChild(source);list.appendChild(card);
 });
}
async function init(){
 try{
  const response=await fetch(DATA_URL,{cache:"no-store"});if(!response.ok)throw Error("Catalogue unavailable");
  catalogue=await response.json();
  if(catalogue.schemaVersion!==2||catalogue.kind!=="cbse-class10-pyq-catalog"||catalogue.classId!=="10"||!Array.isArray(catalogue.subjects)||!Array.isArray(catalogue.records)||!catalogue.records.length)throw Error("Catalogue format is invalid");
  const seen=new Set();
  for(const item of catalogue.records){
   if(!item.id||seen.has(item.id)||!catalogue.subjects.some(s=>s.id===item.subjectId)||!safeExternalLink(item.paperUrl)||(item.markingSchemeUrl&&!safeExternalLink(item.markingSchemeUrl)))throw Error("A paper catalogue record failed validation");
   seen.add(item.id);
  }
  catalogue.subjects.forEach(item=>addOption($("pyqSubject"),item.id,item.name));
  [...new Set(catalogue.records.map(item=>item.year))].sort((a,b)=>Number(b)-Number(a)).forEach(value=>addOption($("pyqYear"),value,value));
  [...new Set(catalogue.records.map(item=>item.examType))].forEach(value=>addOption($("pyqExam"),value,value));
  ["pyqSubject","pyqYear","pyqExam"].forEach(id=>$(id).addEventListener("change",render));
  render();
 }catch(error){$("pyqList").textContent="Unable to load the previous-year paper catalogue. Please refresh the page."; $("pyqCount").textContent="Paper catalogue unavailable.";console.error(error);}
}
init();
})();