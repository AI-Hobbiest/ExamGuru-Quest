/* Student/parent-facing timed exam practice. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
let blueprint=null,bank=null,paper=null,answers={},remaining=10800,tick=null,submitted=false;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function status(s){$("loadStatus").textContent=s;}
async function load(){
 try{
  const [b,q]=await Promise.all([
   fetch("./data/exam-papers/blueprints/class-10-science-2026-27.json",{cache:"no-store"}),
   fetch("./data/exam-papers/question-banks/class-10-science-2026-27-v1.json",{cache:"no-store"})
  ]);
  if(!b.ok||!q.ok)throw Error("The published exam blueprint or question pool is unavailable.");
  blueprint=await b.json();bank=await q.json();
  const bc=C10ExamPaperGenerator.validateBlueprint(blueprint),qc=C10ExamPaperGenerator.validateQuestionBank(bank,{academicYear:"2026-27"});
  if(!bc.valid||!bc.readyForGeneration)throw Error("The exam blueprint is not approved for generation.");
  if(!qc.valid)throw Error(qc.errors.slice(0,4).join(" "));
  $("startBtn").disabled=false;status("Ready. Generate a paper when you are settled and have three uninterrupted hours.");
 }catch(e){status("Unable to prepare the paper: "+e.message);}
}
function makePaper(){paper=C10ExamPaperGenerator.generatePaper(blueprint,bank,{seed:"self-study-"+Date.now(),title:"CBSE Class 10 Science · Self-study Paper"});answers={};submitted=false;remaining=blueprint.durationMinutes*60;render();$("setup").classList.add("exam-hidden");$("review").classList.add("exam-hidden");$("attempt").classList.remove("exam-hidden");startTimer();window.scrollTo(0,0);}
function questionMarkup(q,i){
 let html='<article class="exam-question" data-q="'+i+'"><h3>Q'+(q.paperQuestionNumber||i+1)+'. '+esc(q.prompt)+' <span class="exam-muted">['+q.marks+' marks]</span></h3>';
 if(q.stimulus)html+='<p>'+esc(q.stimulus)+'</p>';
 (q.images||[]).forEach(im=>html+='<img src="./'+esc(im.src).replace(/^\.\//,"")+'" alt="'+esc(im.alt)+'">');
 if(q.type==="mcq"||q.type==="assertion-reason"){
  html+='<div class="exam-options">'+(q.options||[]).map(o=>'<label class="exam-option"><input type="radio" name="q'+i+'" value="'+esc(o.optionId)+'"><span>'+esc(o.text)+'</span></label>').join("")+'</div>';
 }else{
  html+='<textarea aria-label="Answer for question '+(i+1)+'" placeholder="Write your answer here…"></textarea>';
 }
 if(q.alternatives?.length)html+='<p class="exam-muted">Internal choice: You may answer the alternative instead.</p>'+q.alternatives.map((a,j)=>'<div class="exam-option"><label><input type="checkbox" data-alt="'+j+'" data-q="'+i+'"> Attempt alternative: '+esc(a.prompt)+'</label></div>').join("");
 if(q.parts?.length)q.parts.forEach((p,j)=>html+='<p><strong>('+String.fromCharCode(97+j)+')</strong> '+esc(p.prompt)+' ('+p.marks+' marks)</p><textarea aria-label="Answer part '+(j+1)+'" data-part="'+j+'" placeholder="Your answer…"></textarea>');
 return html+'</article>';
}
function render(){ $("paperTitle").textContent=paper.title;$("questions").innerHTML=paper.questions.map(questionMarkup).join("");$("questions").querySelectorAll("input,textarea").forEach(el=>{el.addEventListener("change",saveAnswers);el.addEventListener("input",saveAnswers);});updateProgress();}
function saveAnswers(){paper.questions.forEach((q,i)=>{const article=$("questions").querySelector('[data-q="'+i+'"]');if(!article)return;const radio=article.querySelector('input[type=radio]:checked');const textareas=[...article.querySelectorAll("textarea")].map(x=>x.value);const alt=article.querySelector('input[data-alt]:checked');answers[i]={optionId:radio?.value||null,text:textareas,alternative:alt?Number(alt.dataset.alt):null};});updateProgress();try{localStorage.setItem("eg_exam_attempt_v1",JSON.stringify({paperId:paper.paperId,answers,remaining}));}catch(_){}}
function updateProgress(){const count=Object.values(answers).filter(a=>a&&(a.optionId||a.text?.some(t=>t.trim()))).length;$("progress").textContent=count+" / "+paper.questions.length+" answered";}
function startTimer(){clearInterval(tick);tick=setInterval(()=>{remaining--;const h=String(Math.floor(remaining/3600)).padStart(2,"0"),m=String(Math.floor(remaining%3600/60)).padStart(2,"0"),s=String(remaining%60).padStart(2,"0");$("timer").textContent=h+":"+m+":"+s;if(remaining<=0){clearInterval(tick);submit(true);}},1000);}
function submit(auto=false){if(submitted)return;saveAnswers();submitted=true;clearInterval(tick);let mcq=0,correct=0,answered=0;paper.questions.forEach((q,i)=>{const a=answers[i];if(a&&(a.optionId||a.text?.some(t=>t.trim())))answered++;if(q.type==="mcq"||q.type==="assertion-reason"){mcq++;if(a?.optionId===q.correctOptionId)correct++;}});$("attempt").classList.add("exam-hidden");$("review").classList.remove("exam-hidden");$("score").textContent=(auto?"Time is up. ":"")+"Submitted "+answered+" of "+paper.questions.length+" questions. MCQ score: "+correct+" / "+mcq+". Written answers require self-review.";const box=$("reviewAnswers");box.innerHTML="";paper.questions.forEach((q,i)=>{const d=document.createElement("div");d.className="exam-question";const key=q.answerKey?.modelAnswer||q.answerKey?.answer||q.answerKey?.correctAnswer||"Refer to your textbook and marking points.";d.innerHTML='<h3>Q'+(i+1)+': '+esc(q.prompt)+'</h3><p><strong>Your answer:</strong> '+esc(answers[i]?.optionId||answers[i]?.text?.join(" / ")||"Not attempted")+'</p><p><strong>Model answer / review:</strong> '+esc(key)+'</p>';box.appendChild(d);});try{localStorage.setItem("eg_exam_last_result_v1",JSON.stringify({paperId:paper.paperId,answers,submittedAt:new Date().toISOString(),mcqCorrect:correct,mcqTotal:mcq}));localStorage.removeItem("eg_exam_attempt_v1");}catch(_){}window.scrollTo(0,0);}
$("startBtn").addEventListener("click",()=>{try{makePaper();}catch(e){status("Cannot generate this paper: "+e.message);}});
$("submitBtn").addEventListener("click",()=>{if(confirm("Submit your paper now? You cannot change answers after submission."))submit(false);});
$("printBtn").addEventListener("click",()=>window.print());
$("newBtn").addEventListener("click",()=>{$("review").classList.add("exam-hidden");$("setup").classList.remove("exam-hidden");status("Ready for another attempt.");window.scrollTo(0,0);});
load();
})();