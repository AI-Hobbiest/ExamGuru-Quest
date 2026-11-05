/* Print-ready student-paper and teacher-marking-scheme renderer. */
(() => {
"use strict";
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const list=x=>Array.isArray(x)?x:[];
function partHtml(p,teacher){
 let h='<div class="part"><strong>('+esc(p.partId||"")+')</strong> '+esc(p.prompt)+' <span class="marks">['+esc(p.marks)+']</span></div>';
 if(Array.isArray(p.options))h+='<ol class="options" type="A">'+p.options.map(o=>"<li>"+esc(o.text)+"</li>").join("")+'</ol>';
 list(p.alternatives).forEach(a=>{
  h+='<div class="or">OR</div><div class="part-alternative">'+esc(a.prompt)+' <span class="marks">['+esc(p.marks)+' marks]</span></div>';
  if(teacher)h+=teacherAnswerHtml(a.answerKey,a.markingScheme);
 });
 if(teacher&&p.answerKey)h+='<div class="answer"><b>Expected answer:</b> '+esc(typeof p.answerKey==="string"?p.answerKey:JSON.stringify(p.answerKey))+"</div>";
 return h;
}
function visualDataHtml(data){
 if(!data||!Array.isArray(data.columns)||!Array.isArray(data.rows))return"";
 const header=data.columns.map(column=>"<th>"+esc(column)+"</th>").join("");
 const rows=data.rows.map(row=>"<tr>"+row.map(cell=>"<td>"+esc(cell)+"</td>").join("")+"</tr>").join("");
 return '<div class="data-visual">'+(data.title?'<h3>'+esc(data.title)+'</h3>':"")+'<table class="data-table"><thead><tr>'+header+'</tr></thead><tbody>'+rows+'</tbody></table>'+(data.caption?'<p class="data-caption">'+esc(data.caption)+'</p>':"")+'</div>';
}
function imageHtml(images){return list(images).map(image=>'<figure class="diagram"><img src="'+esc(image.src)+'" alt="'+esc(image.alt)+'" style="max-width:100%;height:auto"><figcaption>'+esc(image.caption||image.alt)+'</figcaption></figure>').join("");}
function teacherAnswerHtml(answerKey,markingScheme){
 let h="";
 if(answerKey)h+='<div class="answer"><b>Expected answer:</b><pre>'+esc(typeof answerKey==="string"?answerKey:JSON.stringify(answerKey,null,2))+"</pre></div>";
 if(Array.isArray(markingScheme))h+='<div class="marking"><b>Marking scheme</b><ul>'+markingScheme.map(m=>"<li>"+esc(m.criterion)+" — "+esc(m.marks)+" mark(s)</li>").join("")+"</ul></div>";
 return h;
}
function alternativeHtml(a,teacher){
 let h='<div class="or">OR</div><div class="alternative">'+esc(a.prompt)+'</div>';
 if(a.stimulus)h+='<div class="stimulus">'+esc(a.stimulus)+'</div>';
 h+=visualDataHtml(a.visualData);
 if(Array.isArray(a.options))h+='<ol class="options" type="A">'+a.options.map(o=>"<li>"+esc(o.text)+"</li>").join("")+'</ol>';
 h+=imageHtml(a.images);
 list(a.parts).forEach(p=>h+=partHtml(p,teacher));
 if(teacher)h+=teacherAnswerHtml(a.answerKey,a.markingScheme);
 return h;
}
function questionHtml(q,teacher){
 let h='<article class="question"><div class="question-heading"><b>Q'+esc(q.paperQuestionNumber)+'.</b> '+esc(q.prompt)+' <span class="marks">['+esc(q.marks)+' marks]</span></div>';
 if(q.stimulus)h+='<div class="stimulus">'+esc(q.stimulus)+'</div>';
 h+=visualDataHtml(q.visualData);
 if(Number.isInteger(q.attemptAny))h+='<p class="attempt-any-note"><strong>Attempt any '+esc(q.attemptAny)+' of the '+esc(q.parts?.length||0)+' items.</strong></p>';
 if(Array.isArray(q.options))h+='<ol class="options" type="A">'+q.options.map(o=>"<li>"+esc(o.text)+"</li>").join("")+'</ol>';
 h+=imageHtml(q.images);
 list(q.parts).forEach(p=>h+=partHtml(p,teacher));
 list(q.alternatives).forEach(a=>h+=alternativeHtml(a,teacher));
 if(teacher)h+=teacherAnswerHtml(q.answerKey,q.markingScheme);
 return h+"</article>";
}
function profileLabel(paper){
 const bp=paper.blueprintSnapshot||{};
 const classId=paper.classId==null?"":String(paper.classId);
 const subjectName=String(bp.subjectTitle||bp.subjectName||bp.subjectLabel||paper.subjectTitle||paper.subjectId||"");
 const subjectCode=bp.subjectCode||paper.subjectCode||null;
 const subject=subjectName+(subjectCode?" ("+subjectCode+")":"");
 return "Class "+classId+(subject?" · "+subject:"");
}
function buildDocumentHtml(paper,mode,baseHref){
 if(!paper||paper.kind!=="exam-paper-snapshot"||!Array.isArray(paper.questions))throw new TypeError("Valid paper snapshot required.");
 const teacher=mode==="teacher";
 const sections=(paper.blueprintSnapshot.sections||[]).map(s=>'<section><h2>'+esc(s.title)+' <small>('+esc(s.totalMarks)+' marks)</small></h2>'+paper.questions.filter(q=>q.sectionId===s.sectionId).map(q=>questionHtml(q,teacher)).join("")+"</section>").join("");
 const instructions=list(paper.blueprintSnapshot.generalInstructions);
 return'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(paper.title)+'</title>'+(baseHref?'<base href="'+esc(baseHref)+'">':"")+'<style>'+
 'body{font:11pt Arial,sans-serif;color:#171717;max-width:850px;margin:28px auto;padding:0 24px;line-height:1.45}h1{text-align:center;font-size:19pt;margin:0 0 5px}h2{font-size:14pt;border-bottom:1px solid #777;padding-bottom:5px;margin:24px 0 12px}.subtitle{text-align:center}.meta{display:flex;justify-content:space-between;border-block:1px solid #777;padding:9px 0;margin:14px 0}.instructions{margin:12px 0 20px}.question{break-inside:avoid;margin:0 0 15px}.marks{float:right;font-weight:600}.options{margin:7px 0 7px 25px;columns:2}.part{margin:7px 0 7px 18px}.stimulus{border:1px solid #999;padding:10px;margin:9px 0;white-space:pre-line}.data-visual{border:1px solid #999;padding:10px;margin:9px 0;break-inside:avoid}.data-visual h3{font-size:11pt;margin:0 0 7px}.data-table{width:100%;border-collapse:collapse;font-size:10pt}.data-table th,.data-table td{border:1px solid #999;padding:5px;text-align:left}.data-table th{background:#eee}.data-caption{font-size:9pt;color:#555;margin:6px 0 0}.diagram{margin:10px 18px;break-inside:avoid}.diagram img{display:block;max-width:100%;max-height:420px;object-fit:contain}.diagram figcaption{font-size:9pt;color:#555}.or{text-align:center;font-weight:bold;margin:10px}.answer,.marking{background:#f3f3f3;padding:9px;margin:8px 0}.answer pre{white-space:pre-wrap;font:10pt Arial}.footer{border-top:1px solid #777;margin-top:30px;padding-top:8px;text-align:center}@media print{body{margin:0 auto;padding:0 12mm;max-width:none}h2{break-after:avoid}.question{break-inside:avoid}}</style></head><body>'+
 '<h1>'+esc(paper.title)+'</h1><div class="subtitle">'+esc(profileLabel(paper))+' · '+esc(paper.academicYear)+(teacher?" · TEACHER COPY":"")+'</div><div class="meta"><span>Time: '+esc(paper.durationMinutes)+' minutes</span><span>Maximum Marks: '+esc(paper.totalMarks)+'</span><span>Questions: '+esc(paper.totalQuestions)+'</span></div>'+
 (instructions.length?'<div class="instructions"><b>General Instructions</b><ol>'+instructions.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ol></div>":"")+sections+'<div class="footer">End of Question Paper</div></body></html>';
}

function buildAnswerBookletHtml(paper,baseHref){
 if(!paper||paper.kind!=="exam-paper-snapshot"||!Array.isArray(paper.questions))throw new TypeError("Valid paper snapshot required.");
 const sections=(paper.blueprintSnapshot.sections||[]).map(section=>{
  const questions=paper.questions.filter(q=>q.sectionId===section.sectionId).map(q=>{
   const linesFor=marks=>Array.from({length:Math.max(3,Math.min(18,Number(marks||1)*3))},()=>'<div class="answer-line"></div>').join("");
   const questionChoice=q.alternatives&&q.alternatives.length?'<p class="choice-note">Answer either the main question or the internal-choice question, not both.</p>':"";
   const attemptAnyNote=Number.isInteger(q.attemptAny)?'<p class="choice-note">Attempt any '+esc(q.attemptAny)+' of the '+esc(q.parts?.length||0)+' items.</p>':"";
   const responseSpace=Array.isArray(q.parts)&&q.parts.length?q.parts.map(part=>{
    const partChoice=Array.isArray(part.alternatives)&&part.alternatives.length?'<p class="choice-note">Choose either the main or alternative version of this subpart.</p>':"";
    const partOptions=Array.isArray(part.options)?'<ol class="options" type="A">'+part.options.map(option=>"<li>"+esc(option.text)+"</li>").join("")+'</ol>':linesFor(part.marks);
    return'<div class="answer-part"><b>('+esc(part.partId||"")+')</b> '+esc(part.prompt)+' <span class="marks">['+esc(part.marks)+' marks]</span></div>'+partChoice+partOptions;
   }).join(""):linesFor(q.marks);
   return'<article class="answer-space"><h3>Q'+esc(q.paperQuestionNumber)+'. '+esc(q.prompt)+' <span class="marks">['+esc(q.marks)+' marks]</span></h3>'+questionChoice+attemptAnyNote+responseSpace+'</article>';
  }).join("");
  return'<section><h2>'+esc(section.title)+' · '+esc(section.totalMarks)+' marks</h2>'+questions+'</section>';
 }).join("");
 return'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(paper.title)+' · Answer Booklet</title>'+(baseHref?'<base href="'+esc(baseHref)+'">':"")+'<style>'+
 'body{font:11pt Arial,sans-serif;color:#171717;max-width:850px;margin:28px auto;padding:0 24px;line-height:1.4}h1{text-align:center;font-size:19pt;margin:0 0 6px}h2{font-size:14pt;border-bottom:1px solid #777;padding:6px 0;margin:23px 0 12px}.student-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0 22px}.student-fields span{border-bottom:1px solid #555;padding:5px 0}.instructions{border:1px solid #999;padding:10px;margin:12px 0 18px}.answer-space{break-inside:avoid;margin:0 0 22px}.answer-space h3{font-size:11pt;margin:12px 0 7px}.marks{float:right}.choice-note{font-size:9pt;color:#555;font-style:italic;margin:4px 0 8px}.answer-part{font-weight:600;margin:10px 0 2px}.answer-line{height:25px;border-bottom:1px solid #b8b8b8}.footer{border-top:1px solid #777;margin-top:28px;padding-top:8px;text-align:center}@media print{body{margin:0 auto;padding:0 12mm;max-width:none}h2{break-after:avoid}.answer-space{break-inside:avoid}}</style></head><body><h1>'+esc(paper.title)+' · Answer Booklet</h1><p style="text-align:center">Class '+esc(paper.classId)+' · '+esc(paper.academicYear)+' · Maximum Marks '+esc(paper.totalMarks)+'</p><div class="student-fields"><span>Student Name:</span><span>Roll No.:</span><span>School:</span><span>Date:</span></div><div class="instructions"><b>Instructions</b><p>Write the question number clearly. Use the space provided for each answer. For internal-choice questions, answer only one option. Attach extra sheets with your name and question number if required.</p></div>'+sections+'<div class="footer">End of Answer Booklet</div></body></html>';
}
function printAnswerBooklet(paper){
 const url=URL.createObjectURL(new Blob([buildAnswerBookletHtml(paper,document.baseURI)],{type:"text/html;charset=utf-8"}));
 const opened=window.open(url,"_blank");
 if(!opened)throw Error("Print window blocked. Allow pop-ups for ExamGuru and retry.");
 return{url,mode:"booklet"};
}

function printPaper(paper,mode){const url=URL.createObjectURL(new Blob([buildDocumentHtml(paper,mode,document.baseURI)],{type:"text/html;charset=utf-8"}));const opened=window.open(url,"_blank");if(!opened)throw Error("Print window blocked. Allow pop-ups for ExamGuru and retry.");return{url,mode:mode||"student"};}
const api=Object.freeze({escapeHtml:esc,profileLabel,buildDocumentHtml,buildAnswerBookletHtml,printPaper,printAnswerBooklet});
window.ExamPaperRenderer=api;
window.C10ExamPaperRenderer=api;
})();