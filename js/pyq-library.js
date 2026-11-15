/* Class 10 CBSE previous-year paper library with unchanged PDF extracts. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const DATA_URL="./data/cbse-class10-pyq.json";
const FILES_URL="./data/cbse-class10-pyq-files.json";
let catalogue=null,fileManifest=null;
function addOption(select,value,label){const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);}
function safeExternalLink(url){
 try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname==="www.cbse.gov.in"&&parsed.pathname.toLowerCase().endsWith(".zip");}
 catch(_){return false;}
}
function safeLocalPdf(file){
 return !!file&&typeof file.path==="string"&&/^\.\/cbse-papers\/files\/[a-f0-9]{24}-[A-Za-z0-9._() -]+\.pdf$/i.test(file.path)&&
  /^[a-f0-9]{64}$/i.test(String(file.sha256||""))&&Number.isFinite(Number(file.sizeBytes))&&Number(file.sizeBytes)>0;
}
function makePdfLink(file,label,download){
 const a=document.createElement("a");a.className="pyq-link"+(download?" secondary":"");
 a.href=file.path;a.textContent=label;a.rel="noopener noreferrer";
 if(download){a.download=file.filename||"CBSE-paper.pdf";}
 else a.target="_blank";
 return a;
}
function fileGroup(title,files,withheld){
 const section=document.createElement("details");section.className="pyq-file-group";
 if(Array.isArray(files)&&files.length===1)section.open=true;
 const summary=document.createElement("summary");summary.textContent=title+" ("+(files||[]).length+")";
 section.appendChild(summary);
 const list=document.createElement("div");list.className="pyq-file-list";
 (files||[]).forEach(file=>{
  if(!safeLocalPdf(file))return;
  const row=document.createElement("div");row.className="pyq-file-row";
  const copy=document.createElement("div");copy.className="pyq-file-copy";
  const name=document.createElement("strong");name.textContent=file.filename||"CBSE paper PDF";
  const meta=document.createElement("small");meta.textContent=Math.max(1,Math.round(Number(file.sizeBytes)/1024))+" KB · original PDF";
  copy.append(name,meta);
  const actions=document.createElement("div");actions.className="pyq-file-actions";
  actions.append(makePdfLink(file,"Open PDF",false),makePdfLink(file,"Download PDF",true));
  row.append(copy,actions);list.appendChild(row);
 });
 if(!(files||[]).length){
  const empty=document.createElement("p");empty.className="pyq-note";empty.textContent="No PDF is currently published for this file group.";list.appendChild(empty);
 }
 if((withheld||[]).length){
  const note=document.createElement("p");note.className="pyq-review-note";
  note.textContent=(withheld.length)+" file(s) are being held back for rights review and are not redistributed.";
  list.appendChild(note);
 }
 section.appendChild(list);return section;
}
function render(){
 if(!catalogue||!fileManifest)return;
 const subject=$("pyqSubject").value,year=$("pyqYear").value,exam=$("pyqExam").value;
 const entries=catalogue.records.filter(item=>(subject==="all"||item.subjectId===subject)&&(year==="all"||item.year===year)&&(exam==="all"||item.examType===exam));
 const list=$("pyqList");list.replaceChildren();
 const fileRows=entries.map(item=>fileManifest.records.find(row=>row.id===item.id)).filter(Boolean);
 const pdfCount=fileRows.reduce((sum,row)=>sum+(row.paperFiles||[]).length+(row.markingSchemeFiles||[]).length,0);
 $("pyqCount").textContent=entries.length+" paper records · "+pdfCount+" original PDF files available";
 if(!entries.length){const empty=document.createElement("p");empty.className="pyq-empty";empty.textContent="No verified papers match these filters.";list.appendChild(empty);return;}
 entries.slice().sort((a,b)=>Number(b.year)-Number(a.year)||a.subjectName.localeCompare(b.subjectName)).forEach(item=>{
  const files=fileManifest.records.find(row=>row.id===item.id);
  const card=document.createElement("article");card.className="pyq-item";
  const meta=document.createElement("div");meta.className="pyq-meta";meta.textContent=item.year+" · "+item.examType+" · Subject code "+item.subjectCode;
  const title=document.createElement("h3");title.textContent=item.subjectName;
  const format=document.createElement("span");format.className="pyq-format";format.textContent="ORIGINAL CBSE PDF";
  const paperNote=document.createElement("p");paperNote.textContent=item.paperNote||"Official CBSE question paper, extracted from the original archive package without modification.";
  const source=document.createElement("p");source.className="pyq-source-note";
  source.textContent="Source: Central Board of Secondary Education (CBSE) · "+item.year+" "+item.examType+" · Class X";
  card.append(meta,title,format,paperNote);
  if(files){
   card.appendChild(fileGroup("Question paper PDFs",files.paperFiles||[],files.paperWithheldFiles||[]));
   if((files.markingSchemeFiles||[]).length||(files.markingSchemeWithheldFiles||[]).length){
    card.appendChild(fileGroup("Official marking-scheme PDFs",files.markingSchemeFiles||[],files.markingSchemeWithheldFiles||[]));
   }else{
    const missing=document.createElement("p");missing.className="pyq-note";
    missing.textContent="No matching marking-scheme PDF is listed for this catalogue record.";card.appendChild(missing);
   }
  }else{
   const missing=document.createElement("p");missing.className="pyq-review-note";
   missing.textContent="PDF extraction is unavailable for this record in the current publication.";card.appendChild(missing);
  }
  if(item.schemeNote){const note=document.createElement("p");note.className="pyq-note";note.textContent=item.schemeNote;card.appendChild(note);}
  card.append(source,source);
  list.appendChild(card);
 });
}
async function init(){
 try{
  const responses=await Promise.all([fetch(DATA_URL,{cache:"no-store"}),fetch(FILES_URL,{cache:"no-store"})]);
  if(responses.some(response=>!response.ok))throw Error("Catalogue or extracted PDF manifest is unavailable");
  [catalogue,fileManifest]=await Promise.all(responses.map(response=>response.json()));
  if(catalogue.schemaVersion!==2||catalogue.kind!=="cbse-class10-pyq-catalog"||catalogue.classId!=="10"||
    !Array.isArray(catalogue.subjects)||!Array.isArray(catalogue.records)||!catalogue.records.length)throw Error("Catalogue format is invalid");
  if(fileManifest.schemaVersion!==1||fileManifest.kind!=="cbse-class10-pyq-pdf-manifest"||
    fileManifest.classId!=="10"||!Array.isArray(fileManifest.records))throw Error("Extracted PDF manifest format is invalid");
  const seen=new Set();
  for(const item of catalogue.records){
   if(!item.id||seen.has(item.id)||!catalogue.subjects.some(s=>s.id===item.subjectId)||
     !safeExternalLink(item.paperUrl)||(item.markingSchemeUrl&&!safeExternalLink(item.markingSchemeUrl)))throw Error("A paper catalogue record failed validation");
   seen.add(item.id);
  }
  const fileIds=new Set();
  for(const record of fileManifest.records){
   if(!record.id||fileIds.has(record.id)||!seen.has(record.id))throw Error("PDF manifest contains an unsupported record");
   fileIds.add(record.id);
   for(const file of [...(record.paperFiles||[]),...(record.markingSchemeFiles||[])])if(!safeLocalPdf(file))throw Error("A PDF manifest entry failed validation");
  }
  catalogue.subjects.forEach(item=>addOption($("pyqSubject"),item.id,item.name));
  [...new Set(catalogue.records.map(item=>item.year))].sort((a,b)=>Number(b)-Number(a)).forEach(value=>addOption($("pyqYear"),value,value));
  [...new Set(catalogue.records.map(item=>item.examType))].forEach(value=>addOption($("pyqExam"),value,value));
  ["pyqSubject","pyqYear","pyqExam"].forEach(id=>$(id).addEventListener("change",render));
  render();
 }catch(error){
  $("pyqList").textContent="Unable to load the extracted CBSE PDF library. Please refresh the page.";
  $("pyqCount").textContent="PDF library unavailable.";console.error(error);
 }
}
init();
})();
