"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const context={window:{},Math,Date,JSON,Object,Array,String,Number,TypeError,Error,Set,Map};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/learning-model.js","utf8"),context,{filename:"js/learning-model.js"});
const model=context.window.C10LearningModel;
const empty=model.emptyLibrary();
assert.equal(model.isValidLibrary(empty),true);
assert.equal(model.isValidLibrary({schemaVersion:1,kind:"wrong",mistakes:[],bookmarks:[],responses:[]}),false);

function question(id,chapterKey="fractions",difficulty="Medium"){
 return {
  id,questionKey:"class-6-mathematics/"+chapterKey+"/q-"+id,
  subjectId:"mathematics",chapterKey,chapterTitle:chapterKey==="fractions"?"Fractions":"Geometry",
  question:"What is the value of "+id+"?",options:["1","2","3","4"],answer:1,
  explanation:"The correct value is two.",difficulty
 };
}
const contextFor=(attemptId="attempt-1")=>({
 classId:"6",subjectId:"mathematics",subjectTitle:"Mathematics",attemptId,mode:"test"
});
let library=empty;
library=model.recordOutcome({
 library,question:question("q1"),context:contextFor("attempt-1"),
 outcome:{status:"answered",isCorrect:false,at:"2026-11-01T09:00:00.000Z"}
});
assert.equal(library.mistakes.length,1,"incorrect answer enters the shared Mistake Book");
assert.equal(library.mistakes[0].status,"open");
assert.equal(library.mistakes[0].wrongCount,1);
assert.equal(library.responses.length,1);

library=model.recordOutcome({
 library,question:question("q1"),context:contextFor("attempt-1"),
 outcome:{status:"answered",isCorrect:true,at:"2026-11-01T09:01:00.000Z"}
});
assert.equal(library.responses.length,1,"changing an answer updates the same attempt/question record");
assert.equal(library.mistakes.length,0,"a corrected answer before the same attempt is saved does not remain a mistake");

library=model.recordOutcome({
 library,question:question("q1"),context:contextFor("attempt-2"),
 outcome:{status:"answered",isCorrect:false,at:"2026-11-01T10:00:00.000Z"}
});
library=model.recordOutcome({
 library,question:question("q1"),context:contextFor("attempt-3"),
 outcome:{status:"answered",isCorrect:true,at:"2026-11-01T11:00:00.000Z"}
});
assert.equal(library.mistakes.length,1,"later correct practice does not silently delete a historical mistake");
assert.equal(library.mistakes[0].wrongCount,1);
assert.equal(library.mistakes[0].lastOutcome,"correct-after-mistake");
library=model.setMistakeStatus(library,question("q1").questionKey,"mastered");
assert.equal(library.mistakes[0].status,"mastered");
library=model.recordOutcome({
 library,question:question("q1"),context:contextFor("attempt-4"),
 outcome:{status:"answered",isCorrect:false,at:"2026-11-01T12:00:00.000Z"}
});
assert.equal(library.mistakes[0].status,"open","a new incorrect attempt reopens a mastered mistake");

library=model.recordOutcome({
 library,question:question("q2","geometry","Hard"),context:contextFor("attempt-5"),
 outcome:{status:"skipped",at:"2026-11-01T12:10:00.000Z"}
});
assert.equal(library.mistakes.length,2,"skipped questions are retained for review");
assert.equal(library.mistakes.find(item=>item.questionKey===question("q2","geometry","Hard").questionKey).skippedCount,1);

const firstBookmark=model.toggleBookmark({library,question:question("q3"),context:contextFor()});
assert.equal(firstBookmark.bookmarked,true);
assert.equal(firstBookmark.library.bookmarks.length,1);
const duplicateBookmark=model.toggleBookmark({library:firstBookmark.library,question:question("q3"),context:contextFor()});
assert.equal(duplicateBookmark.bookmarked,false,"toggling the same question removes the bookmark rather than duplicating it");
assert.equal(duplicateBookmark.library.bookmarks.length,0);
const saved=model.toggleBookmark({library,question:question("q3"),context:contextFor()});
library=model.removeBookmark(saved.library,question("q3").questionKey);
assert.equal(library.bookmarks.length,0);

const filtered=model.filterByDifficulty([
 question("a","fractions","Easy"),question("b","fractions","Medium"),
 question("c","fractions","Challenge"),question("d","fractions","Hard")
],"Hard");
assert.deepEqual(filtered.map(item=>item.id),["d"]);
assert.equal(model.filterByDifficulty([question("e")],"all").length,1);

const topics=model.summarizeTopics(library);
assert.ok(topics.some(item=>item.subjectId==="mathematics"&&item.chapterKey==="fractions"));
assert.ok(topics.some(item=>item.chapterKey==="geometry"&&item.skippedCount===1));
assert.ok(topics.every(item=>item.masteryPercent>=0&&item.masteryPercent<=100));
const adaptivePool=[
 question("a","fractions","Easy"),question("b","fractions","Medium"),
 question("c","geometry","Hard"),question("d","geometry","Challenge"),
 question("e","triangles","Hard"),question("f","triangles","Easy")
];
const adaptive=model.adaptiveOrder(adaptivePool,library,4,()=>0.1);
assert.equal(adaptive.length,4);
assert.equal(new Set(adaptive.map(item=>item.questionKey)).size,4,"adaptive selection never repeats a question within one session");
assert.ok(adaptive.some(item=>item.questionKey===question("a").questionKey)||adaptive.some(item=>item.questionKey===question("b").questionKey),
 "adaptive selection includes questions from the weak fractions topic or its recorded mistake");
assert.ok(model.recommendations(library).length>0);

const legacyProgress={
 missed:["legacy-1","1:q2"],
 answered:2,correct:1,
 attempts:[
  {id:"legacy-1",questionId:"legacy-1",attemptId:"old-attempt-1",correct:false,status:"answered",at:"2026-10-30T09:00:00.000Z"},
  {id:"2:q2",questionId:"2:q2",attemptId:"old-attempt-2",correct:true,status:"answered",at:"2026-10-30T09:05:00.000Z"}
 ]
};
const legacyQuestions=[
 {...question("legacy-1","fractions"),chapter_no:1,legacyId:"legacy-1"},
 {...question("q2","geometry"),chapter_no:1}
];
const migrated=model.importLegacyProgress({
 library:empty,progress:legacyProgress,questions:legacyQuestions,
 context:{classId:"6",subjectId:"mathematics",subjectTitle:"Mathematics"}
});
assert.equal(migrated.responses.length,2,"old per-subject answer events migrate to shared learning responses");
assert.ok(migrated.mistakes.some(item=>item.questionKey===legacyQuestions[0].questionKey),
 "existing missed IDs are included in the consolidated Mistake Book");
const migratedAgain=model.importLegacyProgress({
 library:migrated,progress:legacyProgress,questions:legacyQuestions,
 context:{classId:"6",subjectId:"mathematics",subjectTitle:"Mathematics"}
});
assert.equal(migratedAgain.responses.length,2,"legacy migration is idempotent");

const validStore=model.isValidLibrary(JSON.parse(JSON.stringify(library)));
assert.equal(validStore,true);
new Function(fs.readFileSync("js/learning-center.js","utf8"));
new Function(fs.readFileSync("js/quiz-engine.js","utf8"));
console.log("Learning model tests passed: consolidated mistake capture, answer correction, retained history, skip tracking, personal bookmarks, difficulty filtering, topic mastery, adaptive no-repeat selection and idempotent legacy migration.");
