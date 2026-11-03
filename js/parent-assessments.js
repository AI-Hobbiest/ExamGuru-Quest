/* Parent assessment workspace: creates frozen MCQ assignments from the child's existing banks. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const SUBJECTS = {science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi","science-sof":"Science · SOF","mathematics-sof":"Mathematics · SOF","english-sof":"English · SOF"};
  const subjectIds = c => String(c)==="3" ? ["mathematics","english"] : String(c)==="6" ? ["science","science-sof","mathematics","mathematics-sof","english","english-sof","social-science"] : ["science","mathematics","english","social-science","hindi"];
  const node = (tag,cls,value) => { const el=document.createElement(tag); if(cls)el.className=cls; if(value!==undefined)el.textContent=String(value); return el; };
  const esc = value => String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let parent=null, children=[];
  function assignedPanel(child){
    const section=node("section","detail-section parent-assigned-tests");section.appendChild(node("h3","","Assigned tests & examinations"));
    const items=window.C10AssessmentManager.listForParent(parent.parentId,child.studentId);
    if(!items.length){section.appendChild(node("div","detail-empty","No tests assigned to this child on this browser yet."));return section;}
    const list=node("div","assignment-list");
    items.forEach(item=>{
      const row=node("article","assignment-row"),copy=node("div",""),latest=item.attempts.filter(x=>x.status==="submitted").slice(-1)[0];
      copy.append(node("strong","",item.title),node("p","",item.subjectTitle+" · "+item.questionCount+(item.kind==="paper-assessment"?" questions · "+item.totalMarks+" marks":" MCQs")+(item.deadlineAt?" · Due "+new Date(item.deadlineAt).toLocaleString():" · No deadline")));
      if(item.kind==="paper-assessment"&&latest&&latest.evaluationStatus==="evaluated"){
        row.append(copy,node("span","assignment-status","Evaluated · "+latest.manualScore+"/"+latest.maxScore+" marks"));
        const feedback=node("p","assignment-help",latest.manualFeedback||"No feedback added.");copy.appendChild(feedback);
      }else if(item.kind==="paper-assessment"){
        const status=node("span","assignment-status",latest?"Submitted · awaiting manual evaluation":item.status==="in-progress"?"Online attempt in progress":"Assigned · awaiting handwritten submission");
        row.append(copy,status);
        const form=node("div","paper-evaluation-form");
        const score=document.createElement("input");score.type="number";score.min="0";score.max=String(item.totalMarks);score.step="0.5";score.placeholder="Marks / "+item.totalMarks;
        const feedback=document.createElement("textarea");feedback.rows=2;feedback.maxLength=2000;feedback.placeholder="Feedback for the student (optional)";
        const save=node("button","report-button secondary","Record paper result");save.type="button";
        const allowed=item.deliveryMode!=="online"||!!latest;
        score.disabled=feedback.disabled=save.disabled=!allowed;
        if(!allowed)form.append(node("p","assignment-help","The student must submit the online attempt before manual evaluation."));
        save.addEventListener("click",()=>{
          try{
            const updated=window.C10AssessmentManager.recordPaperEvaluation(item.assignmentId,parent.parentId,score.value,feedback.value);
            const replacement=assignedPanel(child);section.replaceWith(replacement);
            const message=node("p","assignment-status-note","Result recorded: "+updated.attempts.slice(-1)[0].manualScore+"/"+updated.totalMarks+" marks.");
            replacement.appendChild(message);
          }catch(e){form.appendChild(node("p","assignment-status-note",e.message||"Unable to record evaluation."));}
        });
        form.append(score,feedback,save);row.append(form);
      }else{
        row.append(copy,node("span","assignment-status",latest?"Completed · "+latest.scorePercent+"%":item.status==="in-progress"?"In progress":"Assigned"));
      }
      list.appendChild(row);
    });
    section.appendChild(list);return section;
  }
  function addField(label,control){
    const wrap=node("label","assignment-field");wrap.append(node("span","",label),control);return wrap;
  }
  function addComposer(child,detail){
    const section=node("section","detail-section assessment-composer");section.dataset.assessmentStudent=child.studentId;
    section.append(node("h3","","Create & assign an MCQ test"),node("p","assignment-help","Choose the topics covered in the latest study session, set the test rules, preview the available question count and assign it. Each test keeps a frozen copy of its questions."));
    const subject=document.createElement("select");
    const allowed=subjectIds(child.classId);
    allowed.forEach(id=>{const option=document.createElement("option");option.value=id;option.textContent=SUBJECTS[id]||id;subject.appendChild(option);});
    const topics=node("div","assignment-topics","Loading topics…");
    const count=document.createElement("input");count.type="number";count.min="1";count.max="50";count.value="10";
    const difficulty=document.createElement("select");
    [["all","Mixed (all levels)"],["easy","Easy"],["medium","Medium"],["hard","Hard"],["challenge","Challenge"]].forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;difficulty.appendChild(o);});
    const duration=document.createElement("input");duration.type="number";duration.min="0";duration.max="240";duration.value="20";
    const due=document.createElement("input");due.type="datetime-local";
    const title=document.createElement("input");title.type="text";title.maxLength=90;title.placeholder="e.g. Science · Chapter revision";
    const grid=node("div","assignment-options");grid.append(
      addField("Question count",count),addField("Difficulty",difficulty),
      addField("Time limit in minutes (0 = untimed)",duration),addField("Due date (optional)",due)
    );
    const topicWrap=node("div","assignment-field");topicWrap.append(node("span","","Chapters / topics"),topics);
    const latest=node("button","report-button secondary","Use latest study session");latest.type="button";
    const titleWrap=addField("Test title (optional)",title);
    const status=node("p","assignment-status-note","Loading the selected question bank…");
    const create=node("button","report-button","Create & assign test");create.type="button";
    section.append(addField("Subject / question bank",subject),topicWrap,latest,grid,titleWrap,create,status);
    let bank=null,latestAttempt=null;
    const attempts=(detail&&detail.allAttempts||[]).slice().sort((a,b)=>String(b.submittedAt||b.startedAt).localeCompare(String(a.submittedAt||a.startedAt)));
    latestAttempt=attempts[0]||null;
    function latestTopicIds(subjectId){
      if(!latestAttempt||String(latestAttempt.subjectId||"")!==String(subjectId))return[];
      const ids=new Set();
      (latestAttempt.questions||[]).forEach(q=>{const id=q.chapterKey||q.chapterId;if(id)ids.add(String(id));});
      (latestAttempt.chapterIds||latestAttempt.selectedChapterIds||[]).forEach(id=>ids.add(String(id)));
      return [...ids];
    }
    function drawTopics(selected){
      topics.innerHTML="";
      (bank||[]).forEach((chapter,index)=>{
        const key=String(chapter.key||chapter.chapterId||chapter.chapter_no||index+1);
        const row=node("label","assignment-topic"),box=document.createElement("input");
        box.type="checkbox";box.value=key;box.checked=Array.isArray(selected)?selected.includes(key):false;
        row.append(box,node("span","",chapter.title||key));topics.appendChild(row);
      });
      if(!bank||!bank.length)topics.textContent="No topics found in this question bank.";
    }
    async function loadBank(preselected){
      bank=null;topics.textContent="Loading topics…";status.textContent="Loading "+(SUBJECTS[subject.value]||subject.value)+" question bank…";
      try{
        const response=await fetch(window.C10AssessmentManager.bankPath(child.classId,subject.value),{cache:"no-store"});
        if(!response.ok)throw new Error("This question bank is not published for the selected class.");
        const value=await response.json();if(!Array.isArray(value))throw new Error("The selected question bank uses an unsupported format.");
        bank=value;drawTopics(preselected);
        const total=value.reduce((n,c)=>n+(c.questions||[]).length,0);
        status.textContent=total.toLocaleString()+" source questions across "+value.length+" topics. Only valid MCQs are eligible.";
      }catch(e){topics.textContent=e.message||"Unable to load this question bank.";status.textContent=e.message||"Unable to load this question bank.";}
    }
    subject.addEventListener("change",()=>loadBank([]));
    latest.addEventListener("click",()=>{
      if(!latestAttempt){status.textContent="No completed study/test session is available for this child on this browser.";return;}
      const recentSubject=String(latestAttempt.subjectId||"");
      if(allowed.includes(recentSubject))subject.value=recentSubject;
      const ids=latestTopicIds(subject.value);
      if(!ids.length){status.textContent="The latest session did not retain chapter-level details. Select topics manually.";return;}
      loadBank(ids);
    });
    create.addEventListener("click",()=>{
      try{
        if(!bank)throw new Error("Wait until the question bank has loaded.");
        const selected=[...topics.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value);
        if(!selected.length)throw new Error("Select at least one chapter or topic.");
        const amount=Math.max(1,Math.min(50,Number(count.value)||10));
        const pool=window.C10AssessmentManager.buildQuestionPool(bank,selected,difficulty.value);
        const questions=window.C10AssessmentManager.selectQuestions(pool,amount);
        if(questions.length<amount)throw new Error("Only "+questions.length+" valid MCQs match this selection. Reduce the question count or broaden the topics.");
        const deadline=due.value?new Date(due.value).toISOString():null;
        const created=window.C10AssessmentManager.createMcqAssignment({
          studentId:child.studentId,studentName:child.displayName||child.username,parentId:parent.parentId,
          createdBy:parent.username,classId:child.classId,subjectId:subject.value,subjectTitle:SUBJECTS[subject.value]||subject.value,
          title:title.value.trim()||((SUBJECTS[subject.value]||subject.value)+" · Custom MCQ Test"),
          questions,durationMinutes:duration.value,deadlineAt:deadline
        });
        status.textContent="Assigned: "+created.questionCount+" MCQs for "+(child.displayName||child.username)+". It will appear under Assigned Tests on this browser.";
        const old=section.parentNode.querySelector(".parent-assigned-tests");if(old)old.replaceWith(assignedPanel(child));else section.parentNode.insertBefore(assignedPanel(child),section);
      }catch(e){status.textContent=e.message||"Unable to create the assignment.";}
    });
    loadBank(latestAttempt?latestTopicIds(subject.value):[]);
    return section;
  }
  function addPaperBuilder(child){
    if(String(child.classId)!=="10")return null;
    const section=node("section","detail-section parent-paper-builder");
    section.append(node("h3","","Create & assign a CBSE examination paper"),node("p","assignment-help","Generate the approved Class 10 Science (086) 2026–27 paper using the same Paper Studio engine and question pool. Assign it as a handwritten PDF paper, online exam or hybrid assessment."));
    const delivery=document.createElement("select");
    [["printable","Printable · handwritten answer booklet (recommended)"],["online","Online · interactive examination"],["hybrid","Hybrid · printable + online"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;delivery.appendChild(option);});
    const due=document.createElement("input");due.type="datetime-local";
    const status=node("p","assignment-status-note","Loading approved blueprint and integrated question pool…");
    const generate=node("button","report-button","Generate & assign CBSE Science paper");generate.type="button";generate.disabled=true;
    const actions=node("div","report-actions");
    const printQuestion=node("button","report-button secondary","Question paper · Save PDF");printQuestion.type="button";
    const printBooklet=node("button","report-button secondary","Handwritten answer booklet · Save PDF");printBooklet.type="button";
    const printEvaluator=node("button","report-button secondary","Evaluator copy");printEvaluator.type="button";
    const openAssignment=node("a","report-button secondary","Open student assignment");openAssignment.hidden=true;openAssignment.href="#";
    actions.append(printQuestion,printBooklet,printEvaluator,openAssignment);
    section.append(addField("Delivery mode",delivery),addField("Due date (optional)",due),generate,status,actions);
    let blueprint=null,bank=null,paper=null,assignment=null;
    const updateActions=()=>{
      actions.hidden=!paper;
      printQuestion.hidden=delivery.value==="online";
      printBooklet.hidden=delivery.value==="online";
      printEvaluator.hidden=delivery.value==="online";
    };
    delivery.addEventListener("change",updateActions);
    Promise.all([
      fetch("./data/exam-papers/blueprints/class-10-science-2026-27.json",{cache:"no-store"}),
      fetch("./data/exam-papers/question-banks/class-10-science-2026-27-v1.json",{cache:"no-store"}),
      fetch("./data/science.json",{cache:"no-store"})
    ]).then(async responses=>{
      if(responses.some(r=>!r.ok))throw new Error("Approved CBSE blueprint or question pool is not available.");
      blueprint=await responses[0].json();
      const base=await responses[1].json(),practice=await responses[2].json();
      const bc=window.C10ExamPaperGenerator.validateBlueprint(blueprint);
      const qc=window.C10ExamPaperGenerator.validateQuestionBank(base,{academicYear:"2026-27"});
      if(!bc.valid||!bc.readyForGeneration)throw new Error("The CBSE blueprint is not approved for generation.");
      if(!qc.valid)throw new Error(qc.errors.slice(0,5).join(" "));
      const integrated=window.C10ExamPaperGenerator.mergeQuestionBanks(base,practice,blueprint);
      bank=integrated.bank;
      const coverage=window.C10ExamPaperGenerator.auditSlotCoverage(blueprint,bank,3);
      if(!coverage.valid)throw new Error("The integrated question pool needs at least three eligible candidates in one or more question slots.");
      generate.disabled=false;
      status.textContent="Ready · "+bank.questions.length.toLocaleString()+" approved pool records · 39 questions · 80 marks · 180 minutes.";
    }).catch(e=>{status.textContent=e.message||"Unable to load Paper Studio.";});
    function readHistory(){
      try{const rows=JSON.parse(localStorage.getItem("eg_exam_paper_history_v1")||"[]");return Array.isArray(rows)?rows:[];}catch(_){return[];}
    }
    function writeHistory(row){
      const rows=[...readHistory(),row].slice(-50);
      localStorage.setItem("eg_exam_paper_history_v1",JSON.stringify(rows));
    }
    generate.addEventListener("click",()=>{
      try{
        if(!blueprint||!bank)throw new Error("The approved paper pool has not finished loading.");
        const rows=readHistory(),recentMcqs=rows.slice(-2).flatMap(x=>x.mcqQuestionIds||[]);
        paper=window.C10ExamPaperGenerator.generateUniquePaper(blueprint,bank,{
          seed:"parent-paper-"+Date.now()+"-"+Math.random().toString(36).slice(2),
          title:"CBSE Class 10 Science · "+(child.displayName||child.username),
          recentPaperFingerprints:rows.map(x=>x.fingerprint||JSON.stringify(x.questionIds||[])),
          recentQuestionIds:recentMcqs,uniqueSearchAttempts:500
        });
        paper.deliveryMode=delivery.value;
        const dueAt=due.value?new Date(due.value).toISOString():null;
        const ids=paper.questions.map(q=>String(q.questionId));
        const fingerprint=paper.paperFingerprint||window.C10ExamPaperGenerator.paperFingerprint(paper);
        writeHistory({paperId:paper.paperId,generatedAt:paper.generatedAt,questionIds:ids,
          mcqQuestionIds:paper.questions.filter(q=>q.type==="mcq").map(q=>String(q.questionId)),fingerprint});
        try{
          assignment=window.C10AssessmentManager.createPaperAssignment({
            studentId:child.studentId,studentName:child.displayName||child.username,
            parentId:parent.parentId,createdBy:parent.username,
            title:paper.title,subjectId:"science",subjectTitle:"Science (086)",
            paperSnapshot:paper,deliveryMode:delivery.value,deadlineAt:dueAt
          });
        }catch(error){
          localStorage.setItem("eg_exam_paper_history_v1",JSON.stringify(rows));
          throw error;
        }
        openAssignment.href="./assigned-paper.html?id="+encodeURIComponent(assignment.assignmentId);
        openAssignment.hidden=false;updateActions();
        status.textContent="Paper assigned to "+(child.displayName||child.username)+". The paper and delivery choice are frozen. Print the question paper and answer booklet below, or open the assignment on the student's dashboard.";
        const listing=section.parentNode.querySelector(".parent-assigned-tests");
        if(listing)listing.replaceWith(assignedPanel(child));
      }catch(e){status.textContent=e.message||"Unable to generate and assign the paper.";}
    });
    printQuestion.addEventListener("click",()=>{if(paper)try{window.C10ExamPaperRenderer.printPaper(paper,"student");}catch(e){status.textContent=e.message||String(e);}});
    printBooklet.addEventListener("click",()=>{if(paper)try{window.C10ExamPaperRenderer.printAnswerBooklet(paper);}catch(e){status.textContent=e.message||String(e);}});
    printEvaluator.addEventListener("click",()=>{if(paper)try{window.C10ExamPaperRenderer.printPaper(paper,"teacher");}catch(e){status.textContent=e.message||String(e);}});
    updateActions();
    return section;
  }
  function enhanceDetail(){
    const box=$("childDetail");if(!box||box.hidden||box.querySelector(".assessment-composer"))return;
    const heading=box.querySelector(".detail-head h2");if(!heading)return;
    const display=heading.textContent.replace(/'s learning progress$/,"").replace(/’s learning progress$/,"");
    const child=children.find(x=>(x.displayName||x.username)===display||x.username===display);
    if(!child)return;
    const detail={allAttempts:[]};
    // The parent progress panel already computes the subject/chapter breakdown. The latest
    // attempt's chapter list is independently read from the same device-scoped attempt ledgers.
    try{
      const subjects=subjectIds(child.classId);
      subjects.forEach(subjectId=>{
        const recordId=String(child.classId)==="10"?subjectId:"class-"+child.classId+"-"+subjectId;
        const data=window.C10Storage.createLocalStore({kind:"test-attempt-ledger",recordId,studentId:child.studentId,defaults:()=>({attempts:[]}),validate:v=>!!v&&Array.isArray(v.attempts)}).load();
        (data.attempts||[]).forEach(attempt=>detail.allAttempts.push({...attempt,subjectId:attempt.subjectId||subjectId}));
      });
      detail.allAttempts.sort((a,b)=>String(b.submittedAt||b.startedAt).localeCompare(String(a.submittedAt||a.startedAt)));
    }catch(_){}
    box.append(assignedPanel(child),addComposer(child,detail));
    const paperBuilder=addPaperBuilder(child);if(paperBuilder)box.appendChild(paperBuilder);
  }
  async function init(){
    try{
      parent=await window.C10StudentAuth.restoreSession();
      if(!parent||parent.role!=="parent")return;
      children=await window.C10StudentAuth.getLinkedChildren();
      const box=$("childDetail");
      if(!box)return;
      const observer=new MutationObserver(()=>enhanceDetail());
      observer.observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
      enhanceDetail();
    }catch(_){}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
