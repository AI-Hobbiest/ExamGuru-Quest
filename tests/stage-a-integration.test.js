"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const read=p=>fs.readFileSync(p,"utf8"),load=p=>{const c={window:{},Date,Math,Number,String,Array,Object,JSON,Map,Set,RegExp};c.globalThis=c;vm.createContext(c);vm.runInContext(read(p),c,{filename:p});return c.window;};
const model=load("js/gamification.js").C10Gamification,now=new Date(2026,10,2,12);
const make=(id,subject,score,max)=>({attemptId:id,subjectId:subject,status:"submitted",startedAt:now.toISOString(),submittedAt:now.toISOString(),score,maxScore:max,correctCount:score,questionCount:max,answeredCount:max});
const stats=model.calculate([make("base","science",7,10),make("s","science-sof",9,10),make("m","mathematics-sof",8,10),make("e","english-sof",6,10)],now);
for(const id of ["science-sof","mathematics-sof","english-sof"])assert.ok(stats.subjectStats.some(x=>x.id===id&&x.tests===1));
assert.equal(stats.subjectStats.find(x=>x.id==="science-sof").accuracy,90);
const session=load("js/session-model.js").C10SessionModel;
const attempt={attemptId:"chapter-test-01",subjectId:"class-6-science-sof",startedAt:"2026-11-02T10:00:00.000Z",questions:[
{id:"a",questionKey:"class-6-science-sof/food-components/q-a",chapterKey:"food-components",chapterTitle:"Food and Its Components",answer:0,options:["A","B","C","D"],optionIds:["a","b","c","d"],correctOptionId:"a"},
{id:"b",questionKey:"class-6-science-sof/food-components/q-b",chapterKey:"food-components",chapterTitle:"Food and Its Components",answer:0,options:["A","B","C","D"],optionIds:["a","b","c","d"],correctOptionId:"a"},
{id:"c",questionKey:"class-6-science-sof/materials-around-us/q-c",chapterKey:"materials-around-us",chapterTitle:"Materials Around Us",answer:0,options:["A","B","C","D"],optionIds:["a","b","c","d"],correctOptionId:"a"}],answers:[
{questionId:"class-6-science-sof/food-components/q-a",status:"answered",isCorrect:true,answerRecordId:"1"},
{questionId:"class-6-science-sof/food-components/q-b",status:"answered",isCorrect:false,answerRecordId:"2"},
{questionId:"class-6-science-sof/materials-around-us/q-c",status:"skipped",isCorrect:null,answerRecordId:"3"}]};
const result=session.summarize(attempt,{submittedAt:"2026-11-02T10:05:00.000Z"});
assert.deepEqual(JSON.parse(JSON.stringify(result.attempt.chapterResults.map(x=>[x.chapterId,x.questionCount,x.correctCount,x.accuracy]))),[["food-components",2,1,50],["materials-around-us",1,0,0]]);
const pm=load("js/profile-model.js").C10ProfileModel,profile=pm.normalizeProfile({displayName:"Learner",school:"School",classLevel:"6",city:"Chennai",state:"Tamil Nadu",profileId:"integration-profile"},"integration-profile");profile.studentId="C10-INTEG123";
const ids=["class-6-science","class-6-mathematics","class-6-english","class-6-social-science","class-6-science-sof","class-6-mathematics-sof","class-6-english-sof"],empty={progress:{missed:[],answered:0,correct:0,attempts:[]},ledger:{attempts:[],activeAttempt:null,answerRecords:[]}};
assert.equal(pm.isValidBackup({schemaVersion:1,kind:"c10-playground-backup",profile,subjectData:Object.fromEntries(ids.map(id=>[id,empty]))}),true);
assert.equal(pm.isValidBackup({schemaVersion:1,kind:"c10-playground-backup",profile,subjectData:Object.fromEntries(["science","mathematics","english","social-science","hindi"].map(id=>[id,empty]))}),true);
assert.ok(read("js/quiz-engine.js").includes('"3":["mathematics","english"]'));
assert.ok(read("js/dashboard-manager.js").includes('? ["mathematics","english"]'));
for(const id of ids)assert.ok(read("js/profile-manager.js").includes(id));
assert.match(read("profile.html"),/id="exportBtn" type="button">Export JSON backup/);
assert.match(read("profile.html"),/id="importBtn" type="button">Import JSON backup/);
for(const name of ["class-6-science-sof.json","class-6-mathematics-sof.json","class-6-english-sof.json"])assert.ok(read("js/admin-manager.js").includes(name));
assert.equal((read("admin.html").match(/id="familyAccessPanel"/g)||[]).length,1);
for(const id of ["science-sof","mathematics-sof","english-sof"])assert.ok(read("admin.html").includes('value="'+id+'"'));
assert.ok(read("js/parent-dashboard.js").includes("chapterResults"));
assert.ok(read("js/parent-dashboard.js").includes("answerRecords"));
assert.ok(read("js/parent-dashboard.js").includes('?["mathematics","english"]'));
const family=JSON.parse(read("data/family-access.json"));assert.equal(family.kind,"c10-family-access");assert.ok(Array.isArray(family.parents)&&Array.isArray(family.parentStudentLinks));
assert.match(read("index.html"),/Student &amp; Parent sign in/);
console.log("Stage A integration passed: SOF analytics/reporting, class-specific backups, chapter attribution, Class 3 English, Admin SOF banks and Parent sign-in.");
