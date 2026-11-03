"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const store=new Map();
const context={
  window:{},
  localStorage:{
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>store.set(key,String(value))
  },
  Math,Date,Array,String,Number,Set,Map,TypeError,Error,Object,JSON
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/assessment-manager.js","utf8"),context);
const manager=context.window.C10AssessmentManager;

const mcqAssignment=manager.createMcqAssignment({
  studentId:"student-1",studentName:"Learner",parentId:"parent-1",
  classId:"6",subjectId:"science-sof",subjectTitle:"Science · SOF",
  title:"Assigned Science revision",
  questions:[
    {questionId:"q-a",chapterId:"food-components",chapterTitle:"Food and Its Components",prompt:"Question A",options:[{optionId:"a",text:"A"},{optionId:"b",text:"B"}],correctOptionId:"b"},
    {questionId:"q-b",chapterId:"materials",chapterTitle:"Materials Around Us",prompt:"Question B",options:[{optionId:"a",text:"A"},{optionId:"b",text:"B"}],correctOptionId:"a"}
  ],
  durationMinutes:15
});
manager.start(mcqAssignment.assignmentId,"student-1");
manager.submit(mcqAssignment.assignmentId,"student-1",{"q-a":"b","q-b":"b"});
const mcqRows=manager.analyticsAttemptsForStudent("student-1");
assert.equal(mcqRows.length,1);
assert.equal(mcqRows[0].assessmentSource,"assigned");
assert.equal(mcqRows[0].score,1);
assert.equal(mcqRows[0].maxScore,2);
assert.equal(mcqRows[0].accuracyCount,1);
assert.equal(mcqRows[0].accuracyTotal,2);
assert.deepEqual(JSON.parse(JSON.stringify(mcqRows[0].chapterResults.map(x=>[x.chapterId,x.questionCount,x.correctCount]))),[
  ["food-components",1,1],["materials",1,0]
]);
assert.equal(manager.analyticsAttemptsForStudent("student-2").length,0);

const mixedPaper={
  kind:"exam-paper-snapshot",paperId:"paper-mixed",title:"Science written mock",
  classId:"10",totalQuestions:2,totalMarks:10,durationMinutes:60,
  questions:[
    {questionId:"paper-mcq",type:"mcq",marks:2,correctOptionId:"b",prompt:"Objective question"},
    {questionId:"paper-written",type:"short-answer",marks:8,prompt:"Written response"}
  ]
};
const mixed=manager.createPaperAssignment({
  studentId:"student-1",parentId:"parent-1",classId:"10",
  title:"Science written mock",subjectId:"science",subjectTitle:"Science (086)",
  deliveryMode:"hybrid",paperSnapshot:mixedPaper
});
manager.startPaper(mixed.assignmentId,"student-1");
manager.submitPaper(mixed.assignmentId,"student-1",{
  0:{optionId:"b",text:[]},1:{optionId:null,text:["Written answer"]}
});
assert.equal(manager.analyticsAttemptsForStudent("student-1").length,1,
  "a paper awaiting manual marking must not affect final score analytics");
manager.recordPaperEvaluation(mixed.assignmentId,"parent-1",7,"Good explanation.");
const afterEvaluation=manager.analyticsAttemptsForStudent("student-1");
assert.equal(afterEvaluation.length,2);
const evaluated=afterEvaluation.find(x=>x.assignmentId===mixed.assignmentId);
assert.equal(evaluated.score,7);
assert.equal(evaluated.maxScore,10);
assert.equal(evaluated.accuracyCount,1.4);
assert.equal(evaluated.accuracyTotal,2);
assert.equal(evaluated.assessmentTitle,"Science written mock");

const objectivePaper={
  kind:"exam-paper-snapshot",paperId:"paper-objective",title:"Objective mock",
  classId:"10",totalQuestions:2,totalMarks:5,durationMinutes:30,
  questions:[
    {questionId:"objective-a",type:"mcq",marks:2,correctOptionId:"a",prompt:"First"},
    {questionId:"objective-b",type:"assertion-reason",marks:3,correctOptionId:"c",prompt:"Second"}
  ]
};
const objective=manager.createPaperAssignment({
  studentId:"student-1",parentId:"parent-1",classId:"10",
  title:"Objective mock",subjectId:"science",subjectTitle:"Science",
  deliveryMode:"online",paperSnapshot:objectivePaper
});
manager.startPaper(objective.assignmentId,"student-1");
manager.submitPaper(objective.assignmentId,"student-1",{
  0:{optionId:"a",text:[]},1:{optionId:"b",text:[]}
});
const finalRows=manager.analyticsAttemptsForStudent("student-1");
const autoScored=finalRows.find(x=>x.assignmentId===objective.assignmentId);
assert.ok(autoScored);
assert.equal(autoScored.score,2);
assert.equal(autoScored.maxScore,5);
assert.equal(autoScored.correctCount,1);
assert.equal(autoScored.accuracyCount,1);
assert.equal(autoScored.accuracyTotal,2);

const gamificationContext={window:{},Date,Math,Number,String,Array,Object,JSON};
gamificationContext.globalThis=gamificationContext;
vm.createContext(gamificationContext);
vm.runInContext(fs.readFileSync("js/gamification.js","utf8"),gamificationContext);
const stats=gamificationContext.window.C10Gamification.calculate(finalRows,new Date());
assert.equal(stats.attempts,3);
assert.ok(stats.xp>0);
assert.ok(stats.subjectStats.some(x=>x.id==="science-sof"&&x.tests===1&&x.accuracy===50));
assert.ok(stats.subjectStats.some(x=>x.id==="science"&&x.tests===2&&x.accuracy===60));
assert.ok(stats.last10.some(x=>x.label.includes("Assigned Science revision")));

const dashboard=fs.readFileSync("js/dashboard-manager.js","utf8");
const parentDashboard=fs.readFileSync("js/parent-dashboard.js","utf8");
const parentHtml=fs.readFileSync("parent.html","utf8");
assert.ok(dashboard.includes("analyticsAttemptsForStudent"),"student XP and charts read assigned assessment results");
assert.ok(parentDashboard.includes("analyticsAttemptsForStudent"),"parent progress and PDF report read assigned assessment results");
assert.ok(parentDashboard.includes("Assigned:"),"parent recent activity labels assigned assessments");
assert.ok(parentHtml.indexOf("./js/assessment-manager.js")<parentHtml.indexOf("./js/parent-dashboard.js"),
  "parent assessment manager loads before parent report calculations");

console.log("Assessment analytics tests passed: assigned MCQs, SOF chapter breakdowns, auto-scored papers, manual paper evaluation, XP and student/parent report integration.");
