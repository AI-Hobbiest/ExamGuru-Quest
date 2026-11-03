"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,TypeError};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-renderer.js","utf8"),ctx);
const r=ctx.window.C10ExamPaperRenderer;
const p={kind:"exam-paper-snapshot",title:"Test <Paper>",classId:"10",subjectId:"mathematics",subjectCode:"041",academicYear:"2026-27",durationMinutes:180,totalMarks:2,totalQuestions:1,blueprintSnapshot:{subjectTitle:"Mathematics",sections:[{sectionId:"biology",title:"Section A",totalMarks:2}]},questions:[{paperQuestionNumber:1,questionId:"q1",sectionId:"biology",marks:2,prompt:"Pick one",options:[{optionId:"a",text:"A & B"},{optionId:"b",text:"<script>alert(1)</script>"}],correctOptionId:"a",answerKey:{modelAnswer:"A"},markingScheme:[{criterion:"Correct choice",marks:2}]}]};
p.questions[0].images=[{src:"./assets/questions/circuit.png",alt:"Circuit diagram",caption:"Simple circuit"}];
const student=r.buildDocumentHtml(p,"student","https://ai-hobbiest.github.io/ExamGuru-Quest/admin.html"),teacher=r.buildDocumentHtml(p,"teacher","https://ai-hobbiest.github.io/ExamGuru-Quest/admin.html");
assert.ok(student.includes("Test &lt;Paper&gt;"));assert.ok(student.includes("Mathematics (041)"),"printed paper must render its selected subject and subject code");assert.ok(!student.includes("Science (086)"),"renderer must not hardcode the Science subject");assert.ok(student.includes("A &amp; B"));assert.ok(!student.includes("modelAnswer"));assert.ok(!student.includes("Correct choice"));assert.ok(!student.includes("<script>alert(1)</script>"));assert.ok(teacher.includes("Expected answer:"));assert.ok(teacher.includes("Correct choice"));assert.ok(student.includes("circuit.png"));assert.ok(student.includes("Circuit diagram"));assert.ok(student.includes("<base href="));const booklet=r.buildAnswerBookletHtml(p,"https://ai-hobbiest.github.io/ExamGuru-Quest/admin.html");assert.ok(booklet.includes("Answer Booklet"));assert.ok(booklet.includes("Student Name:"));assert.ok(booklet.includes("answer-line"));assert.ok(!booklet.includes("Expected answer:"));assert.ok(!booklet.includes("Correct choice"));
const casePaper={...p,totalMarks:4,questions:[{paperQuestionNumber:1,questionId:"case1",sectionId:"biology",marks:4,prompt:"Read the case and answer the subparts.",stimulus:"A diagram-free case stimulus.",parts:[
 {partId:"a",prompt:"State one fact.",marks:1,answerKey:"One fact."},
 {partId:"b",prompt:"Give a reason.",marks:1},
 {partId:"c",prompt:"Calculate the result.",marks:2,alternatives:[{prompt:"Use the alternative values to calculate the result."}]}
]}]};
const caseStudent=r.buildDocumentHtml(casePaper,"student");
const caseTeacher=r.buildDocumentHtml(casePaper,"teacher");
assert.ok(caseStudent.includes("Use the alternative values to calculate the result."));
assert.ok(caseStudent.includes(">OR</div>"),"student paper should visibly render part-level internal choice");
assert.ok(caseTeacher.includes("Expected answer:"));
const caseBooklet=r.buildAnswerBookletHtml(casePaper);
assert.ok(caseBooklet.includes("Choose either the main or alternative version of this subpart."));
assert.ok(caseBooklet.includes("(c)"),"answer booklet should show individual case-study subparts");
console.log("Exam paper renderer tests passed: safe HTML escaping, student/teacher separation and blank answer booklet output.");