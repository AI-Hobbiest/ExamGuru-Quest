/* Student dashboard panel for parent-assigned assessments. */
(() => {
  "use strict";
  const root=document.getElementById("assignedTestList");
  if(!root||!window.C10AssessmentManager||!window.C10StudentAuth)return;
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function render(){
    const student=await window.C10StudentAuth.restoreSession();
    if(!student||student.role!=="student")return;
    root.innerHTML="";
    const prepared=(()=>{try{return JSON.parse(localStorage.getItem("eg_exam_paper_delivery_v1")||"null");}catch(_){return null;}})();
    if(prepared&&String(prepared.classId)===String(student.classId)){
      const card=document.createElement("article");card.className="assigned-test-card";
      const title=document.createElement("strong");title.textContent=prepared.title||"Prepared examination paper";
      const meta=document.createElement("p");meta.textContent="CBSE Class "+prepared.classId+" · "+prepared.totalQuestions+" questions · "+prepared.totalMarks+" marks · Prepared for this browser";
      const state=document.createElement("span");state.className="assigned-test-state";state.textContent="Ready to attempt";
      const link=document.createElement("a");link.className="btn";link.href="./exam-practice.html?delivery=latest";link.textContent="Start prepared paper";
      card.append(title,meta,state,link);root.appendChild(card);
    }
    const rows=window.C10AssessmentManager.listForStudent(student.studentId);
    if(!rows.length&&!prepared){root.textContent="No tests have been assigned yet. Your Parent/Teacher can create a test from your recent study topics.";return;}
    rows.forEach(item=>{
      const card=document.createElement("article");card.className="assigned-test-card";
      const title=document.createElement("strong");title.textContent=item.title;
      const latest=item.attempts.filter(x=>x.status==="submitted").slice(-1)[0];
      const isPaper=item.kind==="paper-assessment";
      const meta=document.createElement("p");meta.textContent=item.subjectTitle+" · "+item.questionCount+(isPaper?" questions · "+item.totalMarks+" marks":" MCQs")+" · "+(item.durationMinutes?item.durationMinutes+" min":"Untimed")+" · "+(item.deadlineAt?"Due "+new Date(item.deadlineAt).toLocaleDateString():"No deadline");
      const state=document.createElement("span");state.className="assigned-test-state";state.textContent=latest?(isPaper?"Submitted · pending evaluation": "Completed · "+latest.scorePercent+"%"):item.status==="in-progress"?"In progress":"Assigned";
      const link=document.createElement("a");link.className="btn";link.href=(isPaper?"./assigned-paper.html?id=":"./assigned-test.html?id=")+encodeURIComponent(item.assignmentId);link.textContent=latest&&item.attempts.filter(x=>x.status==="submitted").length>=item.attemptsAllowed?"View status":isPaper?"Open paper":"Open test";
      card.append(title,meta,state,link);root.appendChild(card);
    });
  }
  render().catch(()=>{root.textContent="Assigned tests could not be loaded. Please refresh the page.";});
})();
