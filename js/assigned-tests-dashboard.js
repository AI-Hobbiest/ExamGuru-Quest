/* Student dashboard panel for parent-assigned assessments. */
(() => {
  "use strict";
  const root=document.getElementById("assignedTestList");
  if(!root||!window.C10AssessmentManager||!window.C10StudentAuth)return;
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function render(){
    const student=await window.C10StudentAuth.restoreSession();
    if(!student||student.role!=="student")return;
    const rows=window.C10AssessmentManager.listForStudent(student.studentId);
    root.innerHTML="";
    if(!rows.length){root.textContent="No tests have been assigned yet. Your Parent/Teacher can create a test from your recent study topics.";return;}
    rows.forEach(item=>{
      const latest=item.attempts.filter(x=>x.status==="submitted").slice(-1)[0];
      const card=document.createElement("article");card.className="assigned-test-card";
      const title=document.createElement("strong");title.textContent=item.title;
      const meta=document.createElement("p");meta.textContent=item.subjectTitle+" · "+item.questionCount+" MCQs · "+(item.durationMinutes?item.durationMinutes+" min":"Untimed")+" · "+(item.deadlineAt?"Due "+new Date(item.deadlineAt).toLocaleDateString():"No deadline");
      const state=document.createElement("span");state.className="assigned-test-state";state.textContent=latest?"Completed · "+latest.scorePercent+"%":item.status==="in-progress"?"In progress":"Assigned";
      const link=document.createElement("a");link.className="btn"+(latest&&item.attempts.filter(x=>x.status==="submitted").length>=item.attemptsAllowed?" secondary":"");link.href="./assigned-test.html?id="+encodeURIComponent(item.assignmentId);link.textContent=latest&&item.attempts.filter(x=>x.status==="submitted").length>=item.attemptsAllowed?"View status":"Open test";
      card.append(title,meta,state,link);root.appendChild(card);
    });
  }
  render().catch(()=>{root.textContent="Assigned tests could not be loaded. Please refresh the page.";});
})();
