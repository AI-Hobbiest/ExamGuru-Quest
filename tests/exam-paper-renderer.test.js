"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,TypeError};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-renderer.js","utf8"),ctx);
const r=ctx.window.C10ExamPaperRenderer;
const p={kind:"exam-paper-snapshot",title:"Test <Paper>",classId:"10",academicYear:"2026-27",durationMinutes:180,totalMarks:2,totalQuestions:1,blueprintSnapshot:{sections:[{sectionId:"biology",title:"Section A",totalMarks:2}]},questions:[{paperQuestionNumber:1,questionId:"q1",sectionId:"biology",marks:2,prompt:"Pick one",options:[{optionId:"a",text:"A & B"},{optionId:"b",text:"<script>alert(1)</script>"}],correctOptionId:"a",answerKey:{modelAnswer:"A"},markingScheme:[{criterion:"Correct choice",marks:2}]}]};
const student=r.buildDocumentHtml(p,"student"),teacher=r.buildDocumentHtml(p,"teacher");
assert.ok(student.includes("Test &lt;Paper&gt;"));assert.ok(student.includes("A &amp; B"));assert.ok(!student.includes("modelAnswer"));assert.ok(!student.includes("Correct choice"));assert.ok(!student.includes("<script>alert(1)</script>"));assert.ok(teacher.includes("Answer key"));assert.ok(teacher.includes("Correct choice"));
console.log("Exam paper renderer tests passed: safe HTML escaping and student/teacher answer separation.");