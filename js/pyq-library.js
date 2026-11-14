/* Official CBSE Class 10 PYQ and marking-scheme catalogue. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const DATA_URL="./data/cbse-class10-pyq.json";
let catalogue=null;
function addOption(select,value,label){const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);}
function render(){
 if(!catalogue)return;
 const subject=$("pyqSubject").value,year=$("pyqYear").value;
 const subjects=subject==="all"?catalogue.subjects:catalogue.subjects.filter(item=>item.id===subject);
 const years=year==="all"?catalogue.years:catalogue.years.filter(item=>item.year===year);
 const entries=subjects.flatMap(s=>years.map(y=>({subject:s,year:y})));
 const list=$("pyqList");list.replaceChildren();
 $("pyqCount").textContent=entries.length+" subject/year combinations · official CBSE source";
 if(!entries.length){const empty=document.createElement("p");empty.className="pyq-empty";empty.textContent="No papers match these filters.";list.appendChild(empty);return;}
 entries.forEach(({subject:s,year:y})=>{
  const card=document.createElement("article");card.className="pyq-item";
  const copy=document.createElement("div"),heading=document.createElement("h3"),meta=document.createElement("p");
  heading.textContent=s.name+" ("+s.code+")";
  meta.textContent=y.label+" · "+y.note;
  copy.append(heading,meta);
  const actions=document.createElement("div");actions.className="pyq-actions";
  const paper=document.createElement("a");paper.className="pyq-link";paper.href=catalogue.questionPaperArchive;paper.target="_blank";paper.rel="noopener noreferrer";paper.textContent="CBSE Question Papers";
  const key=document.createElement("a");key.className="pyq-link secondary";key.href=catalogue.markingSchemeArchive;key.target="_blank";key.rel="noopener noreferrer";key.textContent="CBSE Marking Scheme";
  actions.append(paper,key);card.append(copy,actions);list.appendChild(card);
 });
}
async function init(){
 try{
  const response=await fetch(DATA_URL,{cache:"no-store"});if(!response.ok)throw Error("Catalogue unavailable");
  catalogue=await response.json();
  if(catalogue.schemaVersion!==1||!Array.isArray(catalogue.subjects)||!Array.isArray(catalogue.years))throw Error("Catalogue format is invalid");
  catalogue.subjects.forEach(item=>addOption($("pyqSubject"),item.id,item.name));
  catalogue.years.forEach(item=>addOption($("pyqYear"),item.year,item.label));
  $("pyqSubject").addEventListener("change",render);$("pyqYear").addEventListener("change",render);render();
 }catch(error){$("pyqList").textContent="Unable to load the previous-year paper catalogue. Please refresh the page.";console.error(error);}
}
init();
})();