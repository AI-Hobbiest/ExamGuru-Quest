/* CLAT learner progress model. Derived from submitted CLAT attempts; no extra progress store. */
(function(root){
"use strict";
const LEVELS=Object.freeze([
 {level:1,title:"Curious Starter",xp:0,emoji:"🌱"},
 {level:2,title:"Practice Scout",xp:100,emoji:"🧭"},
 {level:3,title:"Concept Builder",xp:250,emoji:"🧱"},
 {level:4,title:"Quiz Challenger",xp:450,emoji:"⚡"},
 {level:5,title:"Knowledge Ranger",xp:700,emoji:"🗺️"},
 {level:6,title:"Subject Champion",xp:1000,emoji:"🏅"},
 {level:7,title:"Master Learner",xp:1400,emoji:"🎓"},
 {level:8,title:"Learning Legend",xp:1900,emoji:"🌟"},
 {level:9,title:"Grand Scholar",xp:2500,emoji:"👑"}
]);
const SECTIONS=Object.freeze([
 {id:"english",title:"English Language"},
 {id:"current-affairs",title:"Current Affairs & General Knowledge"},
 {id:"legal",title:"Legal Reasoning"},
 {id:"logical",title:"Logical Reasoning"},
 {id:"quantitative",title:"Quantitative Techniques"}
]);
const dateKey=value=>{
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return "";
 return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
};
const addDays=(key,delta)=>{
 const parts=key.split("-").map(Number),date=new Date(parts[0],parts[1]-1,parts[2]);
 date.setDate(date.getDate()+delta);
 return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
};
function validAttempt(record){
 return !!(record&&record.status==="submitted"&&record.score&&Number(record.score.maxMarks)>0);
}
function accuracyOf(record){
 const supplied=Number(record&&record.score&&record.score.accuracy);
 if(Number.isFinite(supplied)&&supplied>=0)return Math.min(100,supplied);
 const score=record&&record.score||{},attempted=Math.max(0,Number(score.correct||0)+Number(score.wrong||0));
 return attempted?Math.round(Number(score.correct||0)/attempted*1000)/10:0;
}
function xpFor(record){
 if(!validAttempt(record))return 0;
 const score=record.score,correct=Math.max(0,Math.floor(Number(score.correct)||0)),accuracy=accuracyOf(record);
 return 10+correct*2+(accuracy>=70?5:0)+(accuracy>=90?10:0);
}
function levelFor(xp){
 let current=LEVELS[0];
 for(const level of LEVELS){if(xp>=level.xp)current=level;else break;}
 const next=LEVELS.find(item=>item.level===current.level+1)||null;
 const progress=next?Math.max(0,Math.min(100,Math.round((xp-current.xp)/(next.xp-current.xp)*100))):100;
 return {...current,nextLevel:next?next.level:null,nextTitle:next?next.title:null,nextXp:next?next.xp:null,
  currentLevelXp:current.xp,xpToNext:next?Math.max(0,next.xp-xp):0,progressPercent:progress,maxLevel:!next};
}
function streakStats(attempts,now){
 const dates=[...new Set(attempts.map(item=>dateKey(item.submittedAt||item.startedAt)).filter(Boolean))].sort();
 const set=new Set(dates);let best=0,running=0,prior="";
 dates.forEach(date=>{running=prior&&addDays(prior,1)===date?running+1:1;best=Math.max(best,running);prior=date;});
 const today=dateKey(now||new Date()),yesterday=addDays(today,-1);
 let current=0,cursor=set.has(today)?today:set.has(yesterday)?yesterday:"";
 while(cursor&&set.has(cursor)){current++;cursor=addDays(cursor,-1);}
 return{current,best,activeDays:dates.length};
}
function build(history,now){
 const attempts=(Array.isArray(history)?history:[]).filter(validAttempt).map(record=>({
  ...record,accuracy:accuracyOf(record),xpEarned:xpFor(record)
 })).sort((a,b)=>String(a.submittedAt||a.startedAt).localeCompare(String(b.submittedAt||b.startedAt)));
 const xp=attempts.reduce((sum,item)=>sum+item.xpEarned,0),level=levelFor(xp),streak=streakStats(attempts,now);
 const totalCorrect=attempts.reduce((sum,item)=>sum+Number(item.score.correct||0),0);
 const totalWrong=attempts.reduce((sum,item)=>sum+Number(item.score.wrong||0),0);
 const totalUnanswered=attempts.reduce((sum,item)=>sum+Number(item.score.unanswered||0),0);
 const totalQuestions=attempts.reduce((sum,item)=>sum+Number(item.score.maxMarks||0),0);
 const sectionStats=SECTIONS.map(section=>{
  const rows=attempts.flatMap(attempt=>(attempt.sectionScores||[]).filter(item=>item.sectionId===section.id));
  const correct=rows.reduce((sum,item)=>sum+Number(item.correct||0),0);
  const wrong=rows.reduce((sum,item)=>sum+Number(item.wrong||0),0);
  const unanswered=rows.reduce((sum,item)=>sum+Number(item.unanswered||0),0);
  const marks=rows.reduce((sum,item)=>sum+Number(item.marks||0),0);
  const maxMarks=rows.reduce((sum,item)=>sum+Number(item.maxMarks||0),0);
  const answered=correct+wrong;
  return{...section,tests:rows.length,correct,wrong,unanswered,marks,maxMarks,accuracy:answered?Math.round(correct/answered*1000)/10:0,
   scorePercent:maxMarks?Math.max(0,Math.round(marks/maxMarks*1000)/10):0};
 });
 const accuracies=attempts.map(item=>item.accuracy);
 const averageAccuracy=accuracies.length?Math.round(accuracies.reduce((sum,item)=>sum+item,0)/accuracies.length*10)/10:0;
 const bestAccuracy=accuracies.length?Math.max(...accuracies):0;
 const bestScore=attempts.reduce((best,item)=>!best||Number(item.score.marks)>Number(best.score.marks)?item:best,null);
 const fiveSections=sectionStats.every(section=>section.tests>0);
 const badges=[
  {id:"first-paper",title:"First Paper",emoji:"👣",description:"Complete your first CLAT paper",earned:attempts.length>=1},
  {id:"three-papers",title:"Practice Rhythm",emoji:"🔥",description:"Complete 3 CLAT papers",earned:attempts.length>=3},
  {id:"ten-papers",title:"Committed Candidate",emoji:"🏅",description:"Complete 10 CLAT papers",earned:attempts.length>=10},
  {id:"accuracy-70",title:"Accuracy Builder",emoji:"🎯",description:"Reach 70% accuracy on a paper",earned:bestAccuracy>=70},
  {id:"accuracy-90",title:"Sharp Thinker",emoji:"💎",description:"Reach 90% accuracy on a paper",earned:bestAccuracy>=90},
  {id:"five-sections",title:"All-Round Reasoner",emoji:"⚖️",description:"Practise all five CLAT sections",earned:fiveSections},
  {id:"streak-three",title:"Three-Day Spark",emoji:"📅",description:"Practise on 3 consecutive days",earned:streak.best>=3},
  {id:"streak-five",title:"Five-Day Streak",emoji:"🚀",description:"Practise on 5 consecutive days",earned:streak.best>=5},
  {id:"level-five",title:"Knowledge Ranger",emoji:"🗺️",description:"Reach Level 5",earned:level.level>=5},
  {id:"xp-500",title:"500 XP Club",emoji:"✨",description:"Earn 500 experience points",earned:xp>=500},
  {id:"xp-1000",title:"1000 XP Club",emoji:"👑",description:"Earn 1,000 experience points",earned:xp>=1000}
 ];
 return{attempts,xp,level,streak,totalCorrect,totalWrong,totalUnanswered,totalQuestions,averageAccuracy,bestAccuracy,
  bestScore,badges,earnedBadges:badges.filter(item=>item.earned).length,sectionStats,recent:attempts.slice(-8).reverse()};
}
root.C10ClatDashboardModel=Object.freeze({levels:LEVELS,sections:SECTIONS,validAttempt,accuracyOf,xpFor,levelFor,streakStats,build});
if(typeof module!=="undefined"&&module.exports)module.exports=root.C10ClatDashboardModel;
})(typeof window!=="undefined"?window:globalThis);
