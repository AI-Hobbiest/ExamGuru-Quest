/* Parent Family Level 1: local family overview with XP, level, streak and recent activity. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const SUBJECTS={science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi",
    "science-sof":"Science · SOF","mathematics-sof":"Mathematics · SOF","english-sof":"English · SOF"};
  function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=String(text);return e;}
  function subjectIds(classId){
    if(String(classId)==="6")return ["science","science-sof","mathematics","mathematics-sof","english","english-sof","social-science"];
    if(String(classId)==="3")return ["mathematics"];
    return ["science","mathematics","english","social-science","hindi"];
  }
  function readLedger(studentId,bankId){
    return window.C10Storage.createLocalStore({
      kind:"test-attempt-ledger",recordId:bankId,studentId,
      defaults:()=>({attempts:[],activeAttempt:null,answerRecords:[]}),
      validate:v=>!!v&&Array.isArray(v.attempts)&&Array.isArray(v.answerRecords)&&(v.activeAttempt===null||typeof v.activeAttempt==="object")
    }).load();
  }
  function attemptsFor(student){
    const attempts=[];
    subjectIds(student.classId).forEach(subject=>{
      const bankId=String(student.classId)==="10"?subject:"class-"+student.classId+"-"+subject;
      const ledger=readLedger(student.studentId,bankId);
      (ledger.attempts||[]).forEach(attempt=>attempts.push({...attempt,subjectId:attempt.subjectId||subject,subjectTitle:SUBJECTS[attempt.subjectId||subject]||subject}));
    });
    return attempts.filter(a=>["submitted","timed-out"].includes(a.status)&&Number(a.maxScore)>0)
      .sort((a,b)=>String(b.submittedAt||b.startedAt).localeCompare(String(a.submittedAt||a.startedAt)));
  }
  function summarize(student){
    const attempts=attemptsFor(student);
    const summary=window.C10Gamification&&window.C10Gamification.calculate
      ?window.C10Gamification.calculate(attempts):{attempts:attempts.length,xp:0,level:{level:1,title:"Curious Starter",emoji:"🌱"},streak:{current:0},allTimeAverage:null};
    return {...summary,recent:attempts.slice(0,3)};
  }
  function metric(value,label){const box=node("div","family-metric");box.append(node("strong","",value),node("span","",label));return box;}
  function formatWhen(value){
    if(!value)return "Recently";
    const date=new Date(value);if(Number.isNaN(date.getTime()))return "Recently";
    return date.toLocaleDateString(undefined,{day:"numeric",month:"short"});
  }
  function renderCard(student){
    const summary=summarize(student),card=node("article","family-card");
    card.append(node("h2","",student.displayName||student.username),node("div","class-tag",student.username+" · Class "+student.classId));
    const level=node("div","family-level");
    const left=node("div","");left.append(node("strong","",(summary.level.emoji||"🏅")+" Level "+summary.level.level),node("span","",summary.level.title||"Learning journey"));
    level.append(left,node("strong","",summary.xp+" XP"));card.appendChild(level);
    const metrics=node("div","family-metrics");
    metrics.append(metric(summary.attempts,"Completed tests"),metric(summary.allTimeAverage===null?"—":summary.allTimeAverage+"%","Average accuracy"),metric(summary.streak.current+" day"+(summary.streak.current===1?"":"s"),"Current streak"),metric(summary.activeSubjects||0,"Subjects practised"));
    card.appendChild(metrics);
    const recent=node("section","family-recent");recent.appendChild(node("h3","","Recent activity"));
    const activity=node("div","family-activity");
    if(summary.recent.length){
      summary.recent.forEach(attempt=>{
        const row=node("div","family-activity-item");
        row.append(node("span","",attempt.subjectTitle+" · "+attempt.score+"/"+attempt.maxScore),node("strong","",formatWhen(attempt.submittedAt||attempt.startedAt)));
        activity.appendChild(row);
      });
    }else activity.appendChild(node("div","family-empty-activity","No completed practice has been recorded for this child on this device yet."));
    recent.appendChild(activity);card.appendChild(recent);
    return card;
  }
  async function init(){
    try{
      const parent=await window.C10StudentAuth.restoreSession();
      if(!parent||parent.role!=="parent"){location.replace("./index.html");return;}
      $("parentGreeting").textContent="Welcome, "+(parent.displayName||parent.username);
      const children=await window.C10StudentAuth.getLinkedChildren(),grid=$("familyChildrenGrid");grid.innerHTML="";
      if(!children.length){
        $("parentStatus").textContent="No children are currently linked to this parent account. Please ask the administrator to configure family access.";
        grid.appendChild(node("div","family-empty","Your family dashboard is ready. Once the administrator links student accounts to this parent, their learning summaries will appear here."));return;
      }
      children.forEach(student=>grid.appendChild(renderCard(student)));
      $("parentStatus").textContent=children.length+" linked child"+(children.length===1?"":"ren")+" · Level, XP, streak and activity are read locally from this device.";
    }catch(error){$("parentStatus").textContent=error.message||"Unable to load family information.";}
  }
  init();
})();