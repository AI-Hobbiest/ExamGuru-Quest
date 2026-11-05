/* Parent assessment workspace: creates frozen MCQ assignments from the child's existing banks. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const SUBJECTS = {science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi","science-sof":"Science · SOF","mathematics-sof":"Mathematics · SOF","english-sof":"English · SOF"};
  const subjectIds = c => String(c)==="3" ? ["mathematics","mathematics-sof","english"] : String(c)==="6" ? ["science","science-sof","mathematics","mathematics-sof","english","english-sof","social-science"] : ["science","mathematics","english","social-science","hindi"];
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
    const topics=node("div","assignment-topics","Loading chapters…");
    const topicSearch=document.createElement("input");topicSearch.type="search";topicSearch.placeholder="Search chapters…";topicSearch.setAttribute("aria-label","Search chapters");
    const topicTools=node("div","assignment-topic-tools");
    const selectVisible=node("button","report-button secondary","Select all");selectVisible.type="button";
    const clearTopics=node("button","report-button secondary","Clear");clearTopics.type="button";
    const topicCount=node("span","assignment-topic-count","0 selected");
    topicTools.append(selectVisible,clearTopics,topicCount);
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
    const topicWrap=node("div","assignment-field assignment-topic-picker");
    const topicHeading=node("div","assignment-topic-heading");
    topicHeading.append(node("span","","Chapters / topics"),node("span","assignment-topic-hint","Choose one or more"));
    topicWrap.append(topicHeading,topicTools,topicSearch,topics);
    const latest=node("button","report-button secondary assignment-latest-btn","Use latest study session");latest.type="button";
    const titleWrap=addField("Test title (optional)",title);
    const status=node("p","assignment-status-note","Loading the selected question bank…");
    const create=node("button","report-button assignment-create-btn","Create & assign test");create.type="button";
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
    function updateTopicPicker(){
      const rows=[...topics.querySelectorAll(".assignment-topic")];
      const selected=rows.filter(row=>row.querySelector("input")?.checked).length;
      topicCount.textContent=selected+" of "+rows.length+" selected";
      const query=topicSearch.value.trim().toLocaleLowerCase();
      rows.forEach(row=>{row.hidden=!!query&&!row.dataset.search.includes(query);});
      selectVisible.textContent=query?"Select matches":"Select all";
    }
    function drawTopics(selected){
      topics.innerHTML="";
      (bank||[]).forEach((chapter,index)=>{
        const key=String(chapter.key||chapter.chapterId||chapter.chapter_no||index+1);
        const title=String(chapter.title||chapter.chapterTitle||("Chapter "+(index+1)));
        const row=node("label","assignment-topic"),box=document.createElement("input");
        box.type="checkbox";box.value=key;box.checked=Array.isArray(selected)?selected.includes(key):false;
        const label=node("span","",title);
        row.dataset.search=(title+" "+key).toLocaleLowerCase();
        box.addEventListener("change",updateTopicPicker);
        row.append(box,label);topics.appendChild(row);
      });
      if(!bank||!bank.length)topics.textContent="No chapters found in this question bank.";
      updateTopicPicker();
    }
    topicSearch.addEventListener("input",updateTopicPicker);
    selectVisible.addEventListener("click",()=>{
      const query=topicSearch.value.trim().toLocaleLowerCase();
      topics.querySelectorAll(".assignment-topic").forEach(row=>{
        if(!query||!row.hidden)row.querySelector("input").checked=true;
      });
      updateTopicPicker();
    });
    clearTopics.addEventListener("click",()=>{
      topics.querySelectorAll('input[type="checkbox"]').forEach(box=>{box.checked=false;});
      updateTopicPicker();
    });
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
    const section=node("section","detail-section parent-paper-builder");
    const registryUrl="./data/exam-papers/profile-registry.json";
    const generator=()=>window.ExamPaperGenerator||window.C10ExamPaperGenerator;
    const renderer=()=>window.ExamPaperRenderer||window.C10ExamPaperRenderer;
    const safePath=value=>typeof value==="string"&&value.startsWith("./data/")&&!value.split("/").includes("..");
    const historyKey=profileId=>profileId===defaultProfileId?"eg_exam_paper_history_v1":"eg_exam_paper_history_v1_"+String(profileId).replace(/[^a-z0-9_-]/gi,"_");
    let registry=null,profiles=[],profile=null,blueprint=null,bank=null,paper=null,assignment=null,defaultProfileId="";
    section.append(node("h3","","Create & assign an examination paper"),node("p","assignment-help","Choose an approved examination profile for this child, generate a paper using its verified blueprint and question pool, then assign the frozen paper as a handwritten PDF, online exam or hybrid assessment."));
    const profileSelect=document.createElement("select");
    const delivery=document.createElement("select");
    [["printable","Printable · handwritten answer booklet (recommended)"],["online","Online · interactive examination"],["hybrid","Hybrid · printable + online"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;delivery.appendChild(option);});
    const due=document.createElement("input");due.type="datetime-local";
    const status=node("p","assignment-status-note","Loading enabled examination profiles…");
    const generate=node("button","report-button","Generate & assign examination paper");generate.type="button";generate.disabled=true;
    const actions=node("div","report-actions");
    const printQuestion=node("button","report-button secondary","Question paper · Save PDF");printQuestion.type="button";
    const printBooklet=node("button","report-button secondary","Handwritten answer booklet · Save PDF");printBooklet.type="button";
    const printEvaluator=node("button","report-button secondary","Evaluator copy");printEvaluator.type="button";
    const openAssignment=node("a","report-button secondary","Open student assignment");openAssignment.hidden=true;openAssignment.href="#";
    actions.append(printQuestion,printBooklet,printEvaluator,openAssignment);
    section.append(addField("Examination profile",profileSelect),addField("Delivery mode",delivery),addField("Due date (optional)",due),generate,status,actions);
    const updateActions=()=>{
      actions.hidden=!paper;
      printQuestion.hidden=delivery.value==="online";
      printBooklet.hidden=delivery.value==="online";
      printEvaluator.hidden=delivery.value==="online";
    };
    function readHistory(){
      try{const rows=JSON.parse(localStorage.getItem(historyKey(profile.profileId))||"[]");return Array.isArray(rows)?rows:[];}catch(_){return[];}
    }
    function writeHistory(rows,row){
      localStorage.setItem(historyKey(profile.profileId),JSON.stringify([...rows,row].slice(-50)));
    }
    async function loadProfile(selected){
      profile=selected;blueprint=null;bank=null;paper=null;assignment=null;actions.hidden=true;openAssignment.hidden=true;generate.disabled=true;
      status.textContent="Loading "+profile.title+" blueprint and question pool…";
      if(!safePath(profile.blueprintUrl)||!safePath(profile.questionBankUrl)||(profile.practiceBankUrl&&!safePath(profile.practiceBankUrl)))throw new Error("The selected profile contains an unsafe data path.");
      const responses=await Promise.all([fetch(profile.blueprintUrl,{cache:"no-store"}),fetch(profile.questionBankUrl,{cache:"no-store"}),profile.practiceBankUrl?fetch(profile.practiceBankUrl,{cache:"no-store"}):Promise.resolve(null)]);
      if(!responses[0].ok||!responses[1].ok||(responses[2]&&!responses[2].ok))throw new Error("The selected profile blueprint or question bank is unavailable.");
      blueprint=await responses[0].json();blueprint.subjectTitle=blueprint.subjectTitle||profile.subjectTitle||blueprint.subjectId;
      const base=await responses[1].json(),practice=responses[2]?await responses[2].json():null,g=generator();
      if(String(blueprint.classId)!==String(profile.classId)||String(blueprint.subjectId)!==String(profile.subjectId))throw new Error("Profile metadata does not match the selected blueprint.");
      if(String(blueprint.classId)!==String(child.classId))throw new Error("This examination profile does not match the selected child's class.");
      if(profile.subjectCode&&String(blueprint.subjectCode||"")!==String(profile.subjectCode))throw new Error("Profile subject code does not match its blueprint.");
      if(profile.academicYear&&String(blueprint.academicYear)!==String(profile.academicYear))throw new Error("Profile academic year does not match its blueprint.");
      const bc=g.validateBlueprint(blueprint),qc=g.validateQuestionBank(base,{classId:blueprint.classId,subjectId:blueprint.subjectId,academicYear:blueprint.academicYear});
      if(!bc.valid||!bc.readyForGeneration)throw new Error("The selected blueprint is not approved for generation: "+bc.errors.slice(0,4).join(" "));
      if(!qc.valid)throw new Error("The selected question pool is invalid: "+qc.errors.slice(0,5).join(" "));
      const integrated=g.mergeQuestionBanks(base,practice,blueprint,{minimumCandidatesPerSlot:profile.minimumCandidatesPerSlot||20});
      bank=integrated.bank;
      const coverage=g.auditSlotCoverage(blueprint,bank,profile.minimumCandidatesPerSlot||20);
      if(!coverage.valid)throw new Error("The integrated question pool does not meet minimum candidate coverage: "+coverage.errors.slice(0,4).join(" "));
      generate.disabled=false;
      status.textContent="Ready · "+profile.title+" · "+bank.questions.length.toLocaleString()+" approved pool records · "+blueprint.totalQuestions+" questions · "+blueprint.totalMarks+" marks · "+blueprint.durationMinutes+" minutes.";
    }
    profileSelect.addEventListener("change",()=>{
      const selected=profiles.find(item=>String(item.profileId)===profileSelect.value);if(!selected)return;
      loadProfile(selected).catch(e=>{generate.disabled=true;status.textContent=e.message||"Unable to load examination profile.";});
    });
    delivery.addEventListener("change",updateActions);
    Promise.resolve().then(async()=>{
      const response=await fetch(registryUrl,{cache:"no-store"});if(!response.ok)throw new Error("The shared examination profile registry is unavailable.");
      registry=await response.json();
      if(!registry||registry.schemaVersion!==1||registry.kind!=="exam-paper-profile-registry"||!Array.isArray(registry.profiles))throw new Error("The shared examination profile registry is invalid.");
      defaultProfileId=String(registry.defaultProfileId||"");
      profiles=registry.profiles.filter(item=>item&&item.enabled!==false&&String(item.classId)===String(child.classId));
      if(!profiles.length){
        if(String(child.classId)==="6"){
          section.replaceChildren();
          section.append(node("h3","","Class 6 · Exam Paper Practice"));
          section.append(node("p","assignment-help","Class 6 CBSE full-paper profiles are not published yet. Your child can take the available SOF full mocks from their own student account: Science ISO, Mathematics IMO and English IEO."));
          const link=node("a","report-button secondary","View Class 6 exam practice guide");link.href="./parent.html#exam-paper-practice";
          section.appendChild(link);
        }else section.remove();
        return;
      }
      profileSelect.innerHTML="";
      profiles.forEach(item=>{const option=document.createElement("option");option.value=String(item.profileId);option.textContent=String(item.title||("Class "+item.classId+" · "+item.subjectTitle));profileSelect.appendChild(option);});
      const initial=profiles.find(item=>String(item.profileId)===defaultProfileId)||profiles[0];profileSelect.value=initial.profileId;
      await loadProfile(initial);
    }).catch(e=>{status.textContent=e.message||"Unable to load the examination profile registry.";});
    generate.addEventListener("click",()=>{
      try{
        if(!profile||!blueprint||!bank)throw new Error("The selected approved paper pool has not finished loading.");
        const g=generator(),rows=readHistory(),recentQuestionIdSets=rows.slice(-5).map(x=>x.questionIds||[]);
        paper=g.generateUniquePaper(blueprint,bank,{
          seed:"parent-paper-"+profile.profileId+"-"+Date.now()+"-"+Math.random().toString(36).slice(2),
          title:profile.title+" · "+(child.displayName||child.username),
          recentPaperFingerprints:rows.map(x=>x.fingerprint||JSON.stringify(x.questionIds||[])),
          recentQuestionIdSets,uniqueSearchAttempts:500
        });
        paper.deliveryMode=delivery.value;
        const dueAt=due.value?new Date(due.value).toISOString():null;
        const ids=paper.questions.map(q=>String(q.questionId));
        const fingerprint=paper.paperFingerprint||g.paperFingerprint(paper);
        const nextHistory=[...rows,{paperId:paper.paperId,generatedAt:paper.generatedAt,questionIds:ids,
          questionIds:paper.questions.map(question=>question.questionId),mcqQuestionIds:paper.questions.filter(q=>q.type==="mcq").map(q=>String(q.questionId)),fingerprint}].slice(-50);
        writeHistory(rows,nextHistory[nextHistory.length-1]);
        try{
          assignment=window.C10AssessmentManager.createPaperAssignment({
            studentId:child.studentId,studentName:child.displayName||child.username,
            parentId:parent.parentId,createdBy:parent.username,
            title:paper.title,subjectId:profile.subjectId,subjectTitle:profile.subjectTitle||blueprint.subjectTitle||profile.subjectId,
            examProfileId:profile.profileId,subjectCode:profile.subjectCode||blueprint.subjectCode||null,academicYear:profile.academicYear||blueprint.academicYear,
            paperSnapshot:paper,deliveryMode:delivery.value,deadlineAt:dueAt
          });
        }catch(error){
          localStorage.setItem(historyKey(profile.profileId),JSON.stringify(rows));
          throw error;
        }
        openAssignment.href="./assigned-paper.html?id="+encodeURIComponent(assignment.assignmentId);
        openAssignment.hidden=false;updateActions();
        status.textContent="Paper assigned to "+(child.displayName||child.username)+". "+profile.title+" is frozen with its blueprint and delivery choice. Print the question paper and answer booklet below, or open the assignment on the student's dashboard.";
        const listing=section.parentNode.querySelector(".parent-assigned-tests");
        if(listing)listing.replaceWith(assignedPanel(child));
      }catch(e){status.textContent=e.message||"Unable to generate and assign the paper.";}
    });
    printQuestion.addEventListener("click",()=>{if(paper)try{renderer().printPaper(paper,"student");}catch(e){status.textContent=e.message||String(e);}});
    printBooklet.addEventListener("click",()=>{if(paper)try{renderer().printAnswerBooklet(paper);}catch(e){status.textContent=e.message||String(e);}});
    printEvaluator.addEventListener("click",()=>{if(paper)try{renderer().printPaper(paper,"teacher");}catch(e){status.textContent=e.message||String(e);}});
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
