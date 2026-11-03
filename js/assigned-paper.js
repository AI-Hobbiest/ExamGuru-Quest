/* Student view for a Parent/Teacher-assigned full examination paper. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const id=new URLSearchParams(location.search).get("id")||"";
  const safePath=value=>typeof value==="string"&&value.startsWith("./data/")&&!value.split("/").includes("..");
  const generator=()=>window.ExamPaperGenerator||window.C10ExamPaperGenerator;
  const renderer=()=>window.ExamPaperRenderer||window.C10ExamPaperRenderer;
  let assignment=null,student=null;
  async function init(){
    try{
      student=await window.C10StudentAuth.restoreSession();
      if(!student||student.role!=="student"){location.replace("./index.html");return;}
      assignment=window.C10AssessmentManager.get(id);
      if(!assignment||assignment.kind!=="paper-assessment"||assignment.studentId!==student.studentId)throw new Error("This paper is not assigned to the signed-in student.");
      const paper=assignment.paperSnapshot;
      const registryResponse=await fetch("./data/exam-papers/profile-registry.json",{cache:"no-store"});
      if(!registryResponse.ok)throw new Error("The examination profile registry is unavailable for validation.");
      const registry=await registryResponse.json();
      if(!registry||registry.schemaVersion!==1||registry.kind!=="exam-paper-profile-registry"||!Array.isArray(registry.profiles))throw new Error("The examination profile registry is invalid.");
      let profile=assignment.examProfileId?registry.profiles.find(item=>String(item.profileId)===String(assignment.examProfileId)):null;
      if(!profile)profile=registry.profiles.find(item=>String(item.classId)===String(assignment.classId)&&String(item.subjectId)===String(assignment.subjectId)&&(!assignment.academicYear||String(item.academicYear)===String(assignment.academicYear)));
      if(!profile)throw new Error("The examination profile used to create this paper is no longer available. Contact your Parent/Teacher.");
      if(!safePath(profile.blueprintUrl))throw new Error("The examination profile has an unsafe blueprint path.");
      const blueprintResponse=await fetch(profile.blueprintUrl,{cache:"no-store"});
      if(!blueprintResponse.ok)throw new Error("The approved blueprint is unavailable for validation.");
      const blueprint=await blueprintResponse.json();
      if(String(blueprint.classId)!==String(assignment.classId)||String(blueprint.subjectId)!==String(assignment.subjectId))throw new Error("The assigned paper profile does not match the student's assignment metadata.");
      if(assignment.subjectCode&&String(blueprint.subjectCode||"")!==String(assignment.subjectCode))throw new Error("The assigned paper subject code does not match its approved blueprint.");
      if(assignment.academicYear&&String(blueprint.academicYear)!==String(assignment.academicYear))throw new Error("The assigned paper academic year does not match its approved blueprint.");
      const valid=generator().validatePaper(paper,blueprint);
      if(!valid.valid)throw new Error("The frozen paper failed validation: "+valid.errors.slice(0,3).join(" "));
      $("paperTitle").textContent=assignment.title;
      $("paperMeta").textContent=assignment.subjectTitle+" · Class "+assignment.classId+(assignment.subjectCode?" ("+assignment.subjectCode+")":"")+(assignment.academicYear?" · "+assignment.academicYear:"")+" · "+assignment.questionCount+" questions · "+assignment.totalMarks+" marks · "+assignment.durationMinutes+" minutes · "+assignment.deliveryMode+" delivery";
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
        ?(latest.evaluationStatus==="evaluated"?"Your paper has been evaluated: "+latest.manualScore+"/"+latest.maxScore+" marks. "+(latest.manualFeedback||""):"This examination was submitted on "+new Date(latest.submittedAt).toLocaleString()+". "+(latest.hasWrittenResponses?"Descriptive responses are awaiting manual evaluation. ":"")+"MCQ score: "+latest.mcqCorrect+" / "+latest.mcqTotal+".")
        :assignment.deliveryMode==="printable"
          ?"Complete this examination by hand. Print the question paper and separate answer booklet, then submit the handwritten work to your Parent/Teacher for evaluation."
          :assignment.deliveryMode==="hybrid"
            ?"You may print and write the paper, or start the online examination. Scanned answer-sheet submission is not yet available."
            :"Start the timed examination online. You may revisit questions and change answers before submitting.";
      $("paperActions").hidden=false;
    }catch(e){$("paperStatus").textContent=e.message||"Unable to load assigned paper.";}
  }
  $("printQuestionPaper").addEventListener("click",()=>{if(assignment)try{renderer().printPaper(assignment.paperSnapshot,"student");}catch(e){$("paperStatus").textContent=e.message||String(e);}});
  $("printAnswerBooklet").addEventListener("click",()=>{if(assignment)try{renderer().printAnswerBooklet(assignment.paperSnapshot);}catch(e){$("paperStatus").textContent=e.message||String(e);}});
  init();
})();
