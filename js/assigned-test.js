/* Student attempt experience for parent-assigned MCQ tests. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let assignment = null, remaining = 0, timer = null, submitted = false;
  const params = new URLSearchParams(location.search);
  const assignmentId = params.get("id") || "";
  let student = null;
  function showStatus(message, tone) { const el=$("testStatus");el.textContent=message;el.className="test-status"+(tone?" "+tone:""); }
  function render() {
    $("testTitle").textContent=assignment.title;
    $("testMeta").textContent=assignment.subjectTitle+" · Class "+assignment.classId+" · "+assignment.questionCount+" questions · "+(assignment.durationMinutes?assignment.durationMinutes+" minutes":"No timer");
    $("testQuestions").innerHTML=assignment.questionSnapshot.map((q,i)=>{
      const options=q.options.map(o=>'<label class="test-option"><input type="radio" name="q'+i+'" value="'+esc(o.optionId)+'"><span>'+esc(o.text)+'</span></label>').join("");
      return '<article class="test-question"><h3>Q'+(i+1)+'. '+esc(q.prompt)+'</h3><div class="test-options">'+options+'</div></article>';
    }).join("");
    $("testAttempt").hidden=false;$("testSetup").hidden=true;
    $("testQuestions").querySelectorAll("input[type=radio]").forEach(input=>input.addEventListener("change",updateProgress));
    updateProgress();
  }
  function updateProgress() {
    const chosen=$("testQuestions").querySelectorAll("input[type=radio]:checked").length;
    $("testProgress").textContent=chosen+" / "+assignment.questionCount+" answered";
  }
  function startTimer() {
    if(!assignment.durationMinutes)return;
    const active=assignment.attempts.find(x=>x.attemptId===assignment.activeAttemptId);
    const deadline=new Date(active.startedAt).getTime()+assignment.durationMinutes*60000;
    const tick=()=>{remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));const m=String(Math.floor(remaining/60)).padStart(2,"0"),s=String(remaining%60).padStart(2,"0");$("testTimer").textContent=m+":"+s;if(!remaining){clearInterval(timer);submit(true);}};
    tick();timer=setInterval(tick,1000);
  }
  function submit(auto) {
    if(submitted)return;
    const answers={};
    assignment.questionSnapshot.forEach((q,i)=>{const selected=$("testQuestions").querySelector('input[name="q'+i+'"]:checked');answers[q.questionId]=selected?selected.value:"";});
    try {
      const completed=window.C10AssessmentManager.submit(assignment.assignmentId,student.studentId,answers);
      submitted=true;clearInterval(timer);$("testAttempt").hidden=true;$("testResult").hidden=false;
      const attempt=completed.attempts[completed.attempts.length-1];
      $("testResultSummary").textContent=(auto?"Time is up. ":"")+"You answered "+attempt.answered+" of "+attempt.total+" questions and scored "+attempt.correct+"/"+attempt.total+" ("+attempt.scorePercent+"%).";
      $("testResultNote").textContent="Your result is saved in this browser and is visible from the Parent/Teacher dashboard on this device.";
    } catch(e) { showStatus(e.message||"Unable to submit this test.","error"); }
  }
  async function init() {
    try {
      student=await window.C10StudentAuth.restoreSession();
      if(!student||student.role!=="student"){location.replace("./index.html");return;}
      assignment=window.C10AssessmentManager.get(assignmentId);
      if(!assignment||assignment.studentId!==student.studentId){showStatus("This assigned test is not available to the signed-in student.","error");return;}
      $("testTitle").textContent=assignment.title;
      $("testMeta").textContent=assignment.subjectTitle+" · Class "+assignment.classId+" · "+assignment.questionCount+" questions";
      if(assignment.deadlineAt&&new Date(assignment.deadlineAt).getTime()<Date.now()){showStatus("The deadline for this test has passed.","error");return;}
      $("startAssignedTest").disabled=false;
      showStatus("Assigned by your Parent/Teacher. Your answers will be submitted for automatic MCQ scoring.");
    } catch(e) { showStatus(e.message||"Unable to load this assigned test.","error"); }
  }
  $("startAssignedTest").addEventListener("click",()=>{
    try {
      assignment=window.C10AssessmentManager.start(assignmentId,student.studentId);
      const active=assignment.attempts.find(x=>x.attemptId===assignment.activeAttemptId);
      remaining=assignment.durationMinutes*60;render();startTimer();
      if(active&&active.startedAt)showStatus("Test started. You can change your answers until you submit.");
    } catch(e) { showStatus(e.message||"Unable to start this test.","error"); }
  });
  $("submitAssignedTest").addEventListener("click",()=>{if(confirm("Submit this test now? You cannot change answers after submission."))submit(false);});
  init();
})();
