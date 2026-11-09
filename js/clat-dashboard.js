/* Render the CLAT learner dashboard from the existing per-student local attempt history. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),model=window.C10ClatDashboardModel;
const HISTORY_KEY="eg_clat_attempt_history_v1";
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function studentAccount(){
 try{
  const current=window.C10StudentAuth&&window.C10StudentAuth.currentUser&&window.C10StudentAuth.currentUser();
  if(current&&current.role==="student")return current;
  const cached=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");
  return cached&&cached.role==="student"?cached:null;
 }catch(_){return null;}
}
function historyKey(student){
 const id=String(student.studentId||student.username||"local-student").toLowerCase().replace(/[^a-z0-9_-]/g,"_");
 return HISTORY_KEY+"_"+id;
}
function loadHistory(student){
 try{
  const rows=JSON.parse(localStorage.getItem(historyKey(student))||"[]");
  return Array.isArray(rows)?rows:[];
 }catch(_){return[];}
}
function formatDate(value){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"Date unavailable":date.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}
function number(value){return Number(value||0).toLocaleString();}
function renderTrend(rows){
 const target=$("scoreTrend");
 if(!rows.length){target.innerHTML='<div class="clat-empty">Your completed paper scores will appear here.</div>';return;}
 const ceiling=Math.max(1,...rows.map(item=>Number(item.score.maxMarks)||120));
 target.innerHTML=rows.map((item,index)=>{
  const marks=Number(item.score.marks)||0,ratio=Math.max(3,Math.min(100,marks/ceiling*100));
  return '<div class="clat-trend-item" title="'+esc(item.paperTitle)+'"><div class="clat-trend-value">'+esc(marks.toFixed(2).replace(/\.00$/,""))+'</div><div class="clat-trend-track"><div class="clat-trend-fill" style="height:'+ratio+'%"></div></div><div class="clat-trend-label">#'+(index+1)+'</div></div>';
 }).join("");
}
function renderSections(sections){
 const target=$("sectionStrength");
 target.innerHTML=sections.map(section=>{
  const hasData=section.tests>0,accuracy=hasData?section.accuracy:0;
  return '<article class="clat-section-row"><div class="clat-section-heading"><strong>'+esc(section.title)+'</strong><span>'+ (hasData?accuracy.toFixed(1)+'%':'No attempts')+'</span></div><div class="clat-section-track"><span style="width:'+accuracy+'%"></span></div><p>'+ (hasData?number(section.correct)+' correct · '+number(section.wrong)+' incorrect · '+number(section.unanswered)+' unanswered across '+section.tests+' paper(s)':'Try a paper to start tracking this section')+'</p></article>';
 }).join("");
}
function renderRecent(rows){
 const target=$("recentAttemptList");
 if(!rows.length){target.innerHTML='<div class="clat-empty">No completed papers yet. Your first result will appear here.</div>';return;}
 target.innerHTML=rows.map(item=>{
  const score=item.score||{},title=item.paperTitle||"CLAT practice paper";
  return '<article class="clat-recent-row"><div><strong>'+esc(title)+'</strong><span>'+esc(formatDate(item.submittedAt||item.startedAt))+' · '+number(score.correct)+' correct · '+number(score.wrong)+' incorrect</span></div><div class="clat-recent-score"><strong>'+esc(Number(score.marks||0).toFixed(2).replace(/\.00$/,""))+'</strong><span>/ '+number(score.maxMarks)+' · '+Number(item.accuracy||0).toFixed(1)+'%</span></div></article>';
 }).join("");
}
function renderBadges(badges){
 $("badgeList").innerHTML=badges.map(badge=>'<article class="clat-badge '+(badge.earned?"earned":"locked")+'"><span>'+badge.emoji+'</span><strong>'+esc(badge.title)+'</strong><small>'+esc(badge.description)+'</small></article>').join("");
}
function init(){
 const student=studentAccount();
 if(!student||String(student.classId||"").toUpperCase()!=="CLAT"){ $("dashboardStatus").textContent="This dashboard is available to CLAT candidates only.";return; }
 $("candidateName").textContent=student.displayName||student.username||"Candidate";
 const rows=loadHistory(student),summary=model.build(rows);
 $("totalXp").textContent=number(summary.xp);
 $("levelValue").textContent=String(summary.level.level);
 $("levelTitle").textContent=summary.level.emoji+" "+summary.level.title;
 $("papersCompleted").textContent=number(summary.attempts.length);
 $("streakValue").textContent=summary.streak.current+" day"+(summary.streak.current===1?"":"s");
 $("bestAccuracy").textContent=summary.bestAccuracy.toFixed(1)+"%";
 $("averageAccuracy").textContent=summary.averageAccuracy.toFixed(1)+"% average accuracy";
 $("badgeCount").textContent=summary.earnedBadges+" / "+summary.badges.length+" unlocked";
 $("levelProgressFill").style.width=summary.level.progressPercent+"%";
 $("xpProgressLabel").textContent=summary.level.maxLevel?"Maximum level reached":number(summary.xp-summary.level.currentLevelXp)+" / "+number(summary.level.nextXp-summary.level.currentLevelXp)+" XP";
 $("xpNextHint").textContent=summary.level.maxLevel?"You have reached the highest learner level.":number(summary.level.xpToNext)+" XP to Level "+summary.level.nextLevel+" · "+summary.level.nextTitle;
 $("bestScore").textContent=summary.bestScore?Number(summary.bestScore.score.marks||0).toFixed(2).replace(/\.00$/,"")+" / "+number(summary.bestScore.score.maxMarks):"—";
 $("dashboardStatus").textContent=summary.attempts.length?summary.totalCorrect.toLocaleString()+" correct answers · "+summary.totalQuestions.toLocaleString()+" questions included in your completed CLAT papers.":"Complete a CLAT paper to start earning XP and tracking your progress.";
 renderTrend(summary.attempts.slice(-8));
 renderSections(summary.sectionStats);
 renderRecent(summary.recent);
 renderBadges(summary.badges);
}
init();
})();
