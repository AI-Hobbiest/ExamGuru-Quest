"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const store=new Map();
const legacyAssignment={
 assignmentId:"legacy-preserved",assessmentId:"legacy-assessment",kind:"assigned-assessment",
 studentId:"student-legacy",studentName:"Legacy learner",parentId:"parent-legacy",
 classId:"6",subjectId:"science",subjectTitle:"Science",title:"Existing assigned test",
 status:"assigned",createdAt:"2026-01-01T00:00:00.000Z",questionCount:1,
 questionSnapshot:[{questionId:"legacy-q1",prompt:"Legacy question",options:[{optionId:"a",text:"A"},{optionId:"b",text:"B"}],correctOptionId:"a"}],
 attempts:[],activeAttemptId:null
};
store.set("eg_assessment_assignments_v1",JSON.stringify([legacyAssignment]));
const ctx={window:{},localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)},Math,Date,Array,String,Number,Set,Map,TypeError,Error,JSON,Uint8Array};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/storage.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("js/assessment-manager.js","utf8"),ctx);
const manager=ctx.window.C10AssessmentManager;
assert.equal(ctx.window.C10AssessmentService,manager,"the application service and legacy manager names share one lifecycle implementation");
assert.equal(manager.key,"eg_assessment_assignments_v1","legacy public key remains available for compatibility");
assert.equal(manager.get("legacy-preserved").title,"Existing assigned test","legacy assignments migrate without changing their record shape");
assert.equal(manager.listForStudent("student-legacy").length,1,"legacy assignments remain visible to their student");
assert.equal(store.has("eg_assessment_assignments_v1"),false,"legacy key is retired only after successful versioned persistence");
const migratedEnvelope=JSON.parse(store.get("c10playground:store:v1:assessment-assignments:all"));
assert.equal(migratedEnvelope.kind,"assessment-assignments");
assert.equal(migratedEnvelope.data[0].assignmentId,"legacy-preserved");

assert.equal(manager.bankPath("6","science"),"./data/class-6-science.json");
assert.equal(manager.bankPath("10","science"),"./data/science.json");
assert.throws(()=>manager.bankPath("5","science"),/Classes 3, 6 and 10/);
const chapters=[
 {key:"ch-a",title:"Chapter A",questions:[
  {id:"q1",question:"Easy question",options:["A","B","C","D"],answer:1,difficulty:"Easy",competency:"application",competencyTagStatus:"inferred",competencyTagReason:"Context clue."},
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
assert.equal(pool[0].competency,"application");
assert.equal(pool[0].competencyTagStatus,"inferred");
assert.equal(manager.buildQuestionPool(chapters,["ch-b"],"all").length,1);
assert.equal(manager.selectQuestions(pool,10).length,1);
const cbseQuestion={
 id:"CBSE-2023-086-Q1",question:"Which gas is released during photosynthesis?",
 options:["Nitrogen","Oxygen","Hydrogen","Methane"],answer:1,difficulty:"Medium",
 explanation:"Photosynthesis releases oxygen.",
 source:{type:"CBSE_PYQ",reference:"CBSE 2023 Main Board Science · Q1",year:"2023",
  examType:"Main Board",paperId:"2023-main-board-science",questionNumber:"Q1",subjectCode:"086"}
};
const cbseParentPool=manager.buildQuestionPool([
 {key:"plant-life",title:"Plant Life",questions:[cbseQuestion]}
],["plant-life"],"all");
assert.equal(cbseParentPool[0].source.year,"2023","Parent-created test pools preserve CBSE source provenance");
assert.equal(cbseParentPool[0].source.questionNumber,"Q1");
assert.ok(fs.readFileSync("js/assigned-test.js","utf8").includes("CBSE-")&&fs.readFileSync("js/assigned-test.js","utf8").includes("question-source-wrap"),
 "Parent-assigned student tests display the same CBSE year badge");

const duplicateChapters=[
 {key:"dup-a",title:"Duplicate A",questions:[{id:"dup-a1",question:"Which planet is known as the Red Planet?",options:["Earth","Mars","Venus","Jupiter"],answer:1,difficulty:"Medium",explanation:"Mars appears red."}]},
 {key:"dup-b",title:"Duplicate B",questions:[{id:"dup-b1",question:"Which planet is known as the Red Planet?",options:["Jupiter","Venus","Mars","Earth"],answer:2,difficulty:"Medium",explanation:"Mars appears red."}]}
];
const deduplicatedParentPool=manager.buildQuestionPool(duplicateChapters,["dup-a","dup-b"],"all");
assert.equal(deduplicatedParentPool.length,1,"parent assignment pool removes duplicate prompts even when IDs and option order differ");
const sameLocalIdDifferentQuestions=manager.buildQuestionPool([
 {key:"same-id-a",title:"First",questions:[{id:"q1",question:"What is photosynthesis?",options:["A","B","C","D"],answer:0,difficulty:"Medium",explanation:"Plant food production."}]},
 {key:"same-id-b",title:"Second",questions:[{id:"q1",question:"Which gas is released by plants?",options:["Oxygen","Nitrogen","Hydrogen","Carbon dioxide"],answer:0,difficulty:"Medium",explanation:"Plants release oxygen."}]}
],["same-id-a","same-id-b"],"all");
assert.equal(sameLocalIdDifferentQuestions.length,2,"reused local question IDs in different chapters do not hide distinct questions");

assert.equal(manager.selectQuestions([...deduplicatedParentPool,...deduplicatedParentPool],10).length,1,
 "random selection cannot introduce duplicate questions from a repeated input pool");
assert.throws(()=>manager.createMcqAssignment({
 studentId:"student-duplicate",classId:"6",subjectId:"science",
 questions:[{...deduplicatedParentPool[0]},{...deduplicatedParentPool[0],questionId:"copy-with-new-id"}]
}),/duplicate questions/i,"assignment creation rejects duplicate content even when question IDs differ");

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
 subjectId:"science",subjectTitle:"Science",examProfileId:"class-10-science-2026-27",subjectCode:"086",academicYear:"2026-27",deliveryMode:"hybrid",paperSnapshot
});
assert.equal(paperAssignment.kind,"paper-assessment");
assert.equal(paperAssignment.examProfileId,"class-10-science-2026-27","paper assignment retains the originating examination profile");
assert.equal(paperAssignment.subjectCode,"086","paper assignment retains its subject code");
assert.equal(paperAssignment.academicYear,"2026-27","paper assignment retains its academic year");
const mathPaperAssignment=manager.createPaperAssignment({
 studentId:"student-4",parentId:"parent-1",deliveryMode:"online",
 paperSnapshot:{...paperSnapshot,paperId:"paper-math-1",subjectId:"mathematics",subjectTitle:"Mathematics",subjectCode:"041",blueprintSnapshot:{subjectTitle:"Mathematics",subjectCode:"041",sections:[{sectionId:"science",title:"Mathematics",totalMarks:10}]}}
});
assert.equal(mathPaperAssignment.subjectId,"mathematics","assignment subject should default to the frozen paper's subject");
assert.equal(mathPaperAssignment.subjectTitle,"Mathematics","assignment title should default to the frozen paper's subject label");
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


// A fresh page context must read the migrated global assignments, regardless of student session scope.
const reloadCtx={window:{},localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)},Math,Date,Array,String,Number,Set,Map,TypeError,Error,JSON,Uint8Array};
reloadCtx.globalThis=reloadCtx;vm.createContext(reloadCtx);
vm.runInContext(fs.readFileSync("js/storage.js","utf8"),reloadCtx);
vm.runInContext(fs.readFileSync("js/assessment-manager.js","utf8"),reloadCtx);
assert.equal(reloadCtx.window.C10AssessmentManager.listForStudent("student-legacy").length,1,
 "migrated assignments remain available after a full page reload");
assert.equal(reloadCtx.window.C10AssessmentManager.listForStudent("student-1").length,1,
 "global assignment storage remains shared between parent and student sessions");
console.log("Assessment manager tests passed: legacy migration, cross-session persistence, MCQ and full-paper assignments, frozen snapshots, student scoping, attempt limits, auto-score and manual evaluation.");
