"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const store=new Map();
const ctx={window:{},localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value))},Math,Date,Array,String,Number,Set,Map,TypeError,Error};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/assessment-manager.js","utf8"),ctx);
const manager=ctx.window.C10AssessmentManager;
assert.equal(manager.bankPath("6","science"),"./data/class-6-science.json");
assert.equal(manager.bankPath("10","science"),"./data/science.json");
assert.throws(()=>manager.bankPath("5","science"),/Classes 3, 6 and 10/);
const chapters=[
 {key:"ch-a",title:"Chapter A",questions:[
  {id:"q1",question:"Easy question",options:["A","B","C","D"],answer:1,difficulty:"Easy"},
  {id:"q2",question:"Hard question",options:["A","B","C","D"],answer:2,difficulty:"Hard"},
  {id:"bad",question:"Invalid answer",options:["A","B"],answer:4,difficulty:"Easy"}
 ]},
 {key:"ch-b",title:"Chapter B",questions:[
  {id:"q3",question:"Another easy question",options:["Yes","No"],answer:0,difficulty:"Easy"}
 ]}
];
const pool=manager.buildQuestionPool(chapters,["ch-a"],"easy");
assert.equal(pool.length,1);
assert.equal(pool[0].questionId,"q1");
assert.equal(pool[0].correctOptionId,"b");
assert.equal(manager.buildQuestionPool(chapters,["ch-b"],"all").length,1);
assert.equal(manager.selectQuestions(pool,10).length,1);
const assignment=manager.createMcqAssignment({
 studentId:"student-1",studentName:"Learner",parentId:"parent-1",createdBy:"parent",
 classId:"6",subjectId:"science",subjectTitle:"Science",title:"Chapter A test",
 questions:[{...pool[0]}],durationMinutes:10,attemptsAllowed:1
});
assert.equal(manager.listForStudent("student-1").length,1);
assert.equal(manager.listForStudent("student-2").length,0);
assert.equal(manager.listForParent("parent-1")[0].assignmentId,assignment.assignmentId);
assert.throws(()=>manager.start(assignment.assignmentId,"student-2"),/not assigned/);
const started=manager.start(assignment.assignmentId,"student-1");
assert.equal(started.status,"in-progress");
const completed=manager.submit(assignment.assignmentId,"student-1",{q1:"b"});
assert.equal(completed.status,"completed");
assert.equal(completed.attempts[0].correct,1);
assert.equal(completed.attempts[0].scorePercent,100);
assert.throws(()=>manager.start(assignment.assignmentId,"student-1"),/allowed number of attempts/);
assert.throws(()=>manager.submit(assignment.assignmentId,"student-1",{}),/no active attempt/);

const paperSnapshot={
 kind:"exam-paper-snapshot",paperId:"paper-1",title:"CBSE Science mock",classId:"10",
 durationMinutes:60,totalMarks:10,totalQuestions:2,
 blueprintSnapshot:{sections:[{sectionId:"science",title:"Science",totalMarks:10}]},
 questions:[
  {questionId:"paper-q1",paperQuestionNumber:1,sectionId:"science",type:"mcq",marks:2,correctOptionId:"b",prompt:"One MCQ"},
  {questionId:"paper-q2",paperQuestionNumber:2,sectionId:"science",type:"short-answer",marks:8,prompt:"One written answer"}
 ]
};
const paperAssignment=manager.createPaperAssignment({
 studentId:"student-2",parentId:"parent-1",classId:"10",title:"CBSE Science mock",
 subjectId:"science",subjectTitle:"Science",deliveryMode:"hybrid",paperSnapshot
});
assert.equal(paperAssignment.kind,"paper-assessment");
assert.equal(manager.listForStudent("student-2").length,1);
assert.throws(()=>manager.startPaper(paperAssignment.assignmentId,"student-1"),/not assigned/);
const paperStarted=manager.startPaper(paperAssignment.assignmentId,"student-2");
assert.equal(paperStarted.status,"in-progress");
const paperSubmitted=manager.submitPaper(paperAssignment.assignmentId,"student-2",{
  0:{optionId:"b",text:[]},1:{optionId:null,text:["Written response"]}
});
assert.equal(paperSubmitted.status,"completed");
assert.equal(paperSubmitted.attempts[0].mcqCorrect,1);
assert.equal(paperSubmitted.attempts[0].mcqTotal,1);
assert.equal(paperSubmitted.attempts[0].hasWrittenResponses,true);
assert.equal(paperSubmitted.attempts[0].evaluationStatus,"pending-manual-review");
assert.throws(()=>manager.startPaper(paperAssignment.assignmentId,"student-2"),/allowed number of attempts/);

assert.throws(()=>manager.recordPaperEvaluation(paperAssignment.assignmentId,"parent-2",7,""),/not authorised/);
assert.throws(()=>manager.recordPaperEvaluation(paperAssignment.assignmentId,"parent-1",11,""),/Enter marks/);
const evaluated=manager.recordPaperEvaluation(paperAssignment.assignmentId,"parent-1",7,"Good method; improve the final explanation.");
assert.equal(evaluated.status,"evaluated");
assert.equal(evaluated.attempts[0].manualScore,7);
assert.equal(evaluated.attempts[0].maxScore,10);
assert.equal(evaluated.attempts[0].evaluationStatus,"evaluated");
assert.match(evaluated.attempts[0].manualFeedback,/Good method/);
const printable=manager.createPaperAssignment({
 studentId:"student-3",parentId:"parent-1",classId:"10",title:"Handwritten Science",
 subjectId:"science",subjectTitle:"Science",deliveryMode:"printable",paperSnapshot:{...paperSnapshot,paperId:"paper-2"}
});
assert.throws(()=>manager.startPaper(printable.assignmentId,"student-3"),/handwritten/);
const offlineEvaluated=manager.recordPaperEvaluation(printable.assignmentId,"parent-1",8,"Strong written responses.");
assert.equal(offlineEvaluated.status,"evaluated");
assert.equal(offlineEvaluated.attempts[0].completionMode,"handwritten-offline");
assert.equal(offlineEvaluated.attempts[0].manualScore,8);


console.log("Assessment manager tests passed: MCQ and full-paper assignments, frozen snapshots, student scoping, attempt limits, auto-score and manual evaluation.");
