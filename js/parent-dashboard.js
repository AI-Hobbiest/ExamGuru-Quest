/* Parent family view: reads only student accounts linked to the signed-in parent. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const SUBJECTS={science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi",
    "science-sof":"Science · SOF","mathematics-sof":"Mathematics · SOF","english-sof":"English · SOF"};
  function node(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=String(text);
    return element;
  }
  function subjectIds(classId){
    if(String(classId)==="6")return ["science","science-sof","mathematics","mathematics-sof","english","english-sof","social-science"];
    if(String(classId)==="3")return ["mathematics"];
    return ["science","mathematics","english","social-science","hindi"];
  }
  function readLedger(studentId,bankId){
    return window.C10Storage.createLocalStore({
      kind:"test-attempt-ledger",recordId:bankId,studentId,
      defaults:()=>({attempts:[],activeAttempt:null,answerRecords:[]}),
      validate:value=>!!value&&Array.isArray(value.attempts)&&Array.isArray(value.answerRecords)&&
        (value.activeAttempt===null||typeof value.activeAttempt==="object")
    }).load();
  }
  function summarize(student){
    const attempts=[];
    subjectIds(student.classId).forEach(subject=>{
      const bankId=String(student.classId)==="10"?subject:"class-"+student.classId+"-"+subject;
      const ledger=readLedger(student.studentId,bankId);
      (ledger.attempts||[]).forEach(attempt=>{
        if(["submitted","timed-out"].includes(attempt.status)&&Number(attempt.maxScore)>0)
          attempts.push({...attempt,subjectTitle:SUBJECTS[subject]||subject});
      });
    });
    attempts.sort((a,b)=>String(b.submittedAt||b.startedAt).localeCompare(String(a.submittedAt||a.startedAt)));
    const percentages=attempts.map(item=>Math.max(0,Math.min(100,Math.round(Number(item.score||0)/Number(item.maxScore)*100))));
    return {attempts:attempts.length,average:percentages.length?Math.round(percentages.reduce((sum,v)=>sum+v,0)/percentages.length):null,latest:attempts[0]||null};
  }
  function renderCard(student){
    const summary=summarize(student),card=node("article","family-card");
    card.appendChild(node("h2","",student.displayName||student.username));
    card.appendChild(node("div","class-tag",student.username+" · Class "+student.classId));
    const metrics=node("div","family-metrics");
    const tests=node("div","family-metric");tests.append(node("strong","",summary.attempts),node("span","","Completed tests"));
    const average=node("div","family-metric");average.append(node("strong","",summary.average===null?"—":summary.average+"%"),node("span","","Average accuracy"));
    metrics.append(tests,average);card.appendChild(metrics);
    const latest=node("div","family-latest");
    if(summary.latest){
      const when=summary.latest.submittedAt||summary.latest.startedAt;
      latest.textContent="Latest: "+summary.latest.subjectTitle+" · "+summary.latest.score+"/"+summary.latest.maxScore+" · "+(when?new Date(when).toLocaleString():"Date unavailable");
    }else latest.textContent="No completed practice has been recorded for this child on this device yet.";
    card.appendChild(latest);return card;
  }
  async function init(){
    try{
      const parent=await window.C10StudentAuth.restoreSession();
      if(!parent||parent.role!=="parent"){location.replace("./index.html");return;}
      $("parentGreeting").textContent="Welcome, "+(parent.displayName||parent.username);
      const children=await window.C10StudentAuth.getLinkedChildren(),grid=$("familyChildrenGrid");
      grid.innerHTML="";
      if(!children.length){
        $("parentStatus").textContent="No children are currently linked to this parent account. Please ask the administrator to configure family access.";
        grid.appendChild(node("div","family-empty","Your family dashboard is ready. Once the administrator links student accounts to this parent, their learning summaries will appear here."));
        return;
      }
      children.forEach(student=>grid.appendChild(renderCard(student)));
      $("parentStatus").textContent=children.length+" linked student account(s). Progress is read locally from this device.";
    }catch(error){$("parentStatus").textContent=error.message||"Unable to load family information.";}
  }
  init();
})();
