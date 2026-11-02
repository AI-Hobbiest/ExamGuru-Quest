/* Print-ready student-paper and teacher-marking-scheme renderer. */
(() => {
"use strict";
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const list=x=>Array.isArray(x)?x:[];
function partHtml(p,teacher){return'<div class="part"><strong>('+esc(p.partId||"")+')</strong> '+esc(p.prompt)+' <span class="marks">['+esc(p.marks)+']</span></div>'+(teacher&&p.answerKey?'<div class="answer"><b>Expected answer:</b> '+esc(typeof p.answerKey==="string"?p.answerKey:JSON.stringify(p.answerKey))+"</div>":"");}
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
 if(Array.isArray(a.options))h+='<ol class="options" type="A">'+a.options.map(o=>"<li>"+esc(o.text)+"</li>").join("")+'</ol>';
 h+=imageHtml(a.images);
 list(a.parts).forEach(p=>h+=partHtml(p,teacher));
 if(teacher)h+=teacherAnswerHtml(a.answerKey,a.markingScheme);
 return h;
}
function questionHtml(q,teacher){
 let h='<article class="question"><div class="question-heading"><b>Q'+esc(q.paperQuestionNumber)+'.</b> '+esc(q.prompt)+' <span class="marks">['+esc(q.marks)+' marks]</span></div>';
 if(q.stimulus)h+='<div class="stimulus">'+esc(q.stimulus)+'</div>';
 if(Array.isArray(q.options))h+='<ol class="options" type="A">'+q.options.map(o=>"<li>"+esc(o.text)+"</li>").join("")+'</ol>';
 h+=imageHtml(q.images);
 list(q.parts).forEach(p=>h+=partHtml(p,teacher));
 list(q.alternatives).forEach(a=>h+=alternativeHtml(a,teacher));
 if(teacher)h+=teacherAnswerHtml(q.answerKey,q.markingScheme);
 return h+"</article>";
}
function buildDocumentHtml(paper,mode,baseHref){
 if(!paper||paper.kind!=="exam-paper-snapshot"||!Array.isArray(paper.questions))throw new TypeError("Valid paper snapshot required.");
 const teacher=mode==="teacher";
 const sections=(paper.blueprintSnapshot.sections||[]).map(s=>'<section><h2>'+esc(s.title)+' <small>('+esc(s.totalMarks)+' marks)</small></h2>'+paper.questions.filter(q=>q.sectionId===s.sectionId).map(q=>questionHtml(q,teacher)).join("")+"</section>").join("");
 const instructions=list(paper.blueprintSnapshot.generalInstructions);
 return'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(paper.title)+'</title>'+(baseHref?'<base href="'+esc(baseHref)+'">':"")+'<style>'+
 'body{font:11pt Arial,sans-serif;color:#171717;max-width:850px;margin:28px auto;padding:0 24px;line-height:1.45}h1{text-align:center;font-size:19pt;margin:0 0 5px}h2{font-size:14pt;border-bottom:1px solid #777;padding-bottom:5px;margin:24px 0 12px}.subtitle{text-align:center}.meta{display:flex;justify-content:space-between;border-block:1px solid #777;padding:9px 0;margin:14px 0}.instructions{margin:12px 0 20px}.question{break-inside:avoid;margin:0 0 15px}.marks{float:right;font-weight:600}.options{margin:7px 0 7px 25px;columns:2}.part{margin:7px 0 7px 18px}.stimulus{border:1px solid #999;padding:10px;margin:9px 0}.diagram{margin:10px 18px;break-inside:avoid}.diagram img{display:block;max-width:100%;max-height:420px;object-fit:contain}.diagram figcaption{font-size:9pt;color:#555}.or{text-align:center;font-weight:bold;margin:10px}.answer,.marking{background:#f3f3f3;padding:9px;margin:8px 0}.answer pre{white-space:pre-wrap;font:10pt Arial}.footer{border-top:1px solid #777;margin-top:30px;padding-top:8px;text-align:center}@media print{body{margin:0 auto;padding:0 12mm;max-width:none}h2{break-after:avoid}.question{break-inside:avoid}}</style></head><body>'+
 '<h1>'+esc(paper.title)+'</h1><div class="subtitle">Class '+esc(paper.classId)+' · Science (086) · '+esc(paper.academicYear)+(teacher?" · TEACHER COPY":"")+'</div><div class="meta"><span>Time: '+esc(paper.durationMinutes)+' minutes</span><span>Maximum Marks: '+esc(paper.totalMarks)+'</span><span>Questions: '+esc(paper.totalQuestions)+'</span></div>'+
 (instructions.length?'<div class="instructions"><b>General Instructions</b><ol>'+instructions.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ol></div>":"")+sections+'<div class="footer">End of Question Paper</div></body></html>';
}
function printPaper(paper,mode){const url=URL.createObjectURL(new Blob([buildDocumentHtml(paper,mode,document.baseURI)],{type:"text/html;charset=utf-8"}));const opened=window.open(url,"_blank");if(!opened)throw Error("Print window blocked. Allow pop-ups for ExamGuru and retry.");return{url,mode:mode||"student"};}
window.C10ExamPaperRenderer=Object.freeze({escapeHtml:esc,buildDocumentHtml,printPaper});
})();