/* Student view for a Parent/Teacher-assigned full examination paper. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const id=new URLSearchParams(location.search).get("id")||"";
  let assignment=null,student=null;
  async function init(){
    try{
      student=await window.C10StudentAuth.restoreSession();
      if(!student||student.role!=="student"){location.replace("./index.html");return;}
      assignment=window.C10AssessmentManager.get(id);
      if(!assignment||assignment.kind!=="paper-assessment"||assignment.studentId!==student.studentId)throw new Error("This paper is not assigned to the signed-in student.");
      const paper=assignment.paperSnapshot;
      const blueprintResponse=await fetch("./data/exam-papers/blueprints/class-10-science-2026-27.json",{cache:"no-store"});
      if(!blueprintResponse.ok)throw new Error("The approved blueprint is unavailable for validation.");
      const blueprint=await blueprintResponse.json();
      const valid=window.C10ExamPaperGenerator.validatePaper(paper,blueprint);
      if(!valid.valid)throw new Error("The frozen paper failed validation: "+valid.errors.slice(0,3).join(" "));
      $("paperTitle").textContent=assignment.title;
      $("paperMeta").textContent=assignment.subjectTitle+" · Class "+assignment.classId+" · "+assignment.questionCount+" questions · "+assignment.totalMarks+" marks · "+assignment.durationMinutes+" minutes · "+assignment.deliveryMode+" delivery";
      const completed=assignment.attempts.filter(x=>x.status==="submitted");
      const latest=completed[completed.length-1]||null;
      if(!latest&&assignment.deadlineAt&&new Date(assignment.deadlineAt).getTime()<Date.now())throw new Error("The deadline for this paper has passed.");
      $("printQuestionPaper").hidden=assignment.deliveryMode==="online";
      $("printAnswerBooklet").hidden=assignment.deliveryMode==="online";
      if(!latest&&(assignment.deliveryMode==="online"||assignment.deliveryMode==="hybrid")){
        $("startOnlinePaper").hidden=false;
        $("startOnlinePaper").href="./exam-practice.html?assignment="+encodeURIComponent(assignment.assignmentId);
      }
      $("paperStatus").textContent=latest
        ?"This examination was submitted on "+new Date(latest.submittedAt).toLocaleString()+". "+(latest.hasWrittenResponses?"Descriptive responses are awaiting manual evaluation. ":"")+"MCQ score: "+latest.mcqCorrect+" / "+latest.mcqTotal+"."
        :assignment.deliveryMode==="printable"
          ?"Complete this examination by hand. Print the question paper and separate answer booklet, then submit the handwritten work to your Parent/Teacher for evaluation."
          :assignment.deliveryMode==="hybrid"
            ?"You may print and write the paper, or start the online examination. Scanned answer-sheet submission is not yet available."
            :"Start the timed examination online. You may revisit questions and change answers before submitting.";
      $("paperActions").hidden=false;
    }catch(e){$("paperStatus").textContent=e.message||"Unable to load assigned paper.";}
  }
  $("printQuestionPaper").addEventListener("click",()=>{if(assignment)try{window.C10ExamPaperRenderer.printPaper(assignment.paperSnapshot,"student");}catch(e){$("paperStatus").textContent=e.message||String(e);}});
  $("printAnswerBooklet").addEventListener("click",()=>{if(assignment)try{window.C10ExamPaperRenderer.printAnswerBooklet(assignment.paperSnapshot);}catch(e){$("paperStatus").textContent=e.message||String(e);}});
  init();
})();
