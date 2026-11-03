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
console.log("Assessment manager tests passed: bank filtering, immutable snapshots, student scoping, attempt limits and MCQ scoring.");
