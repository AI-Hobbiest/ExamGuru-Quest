"use strict";
const fs=require("node:fs");
const path=require("node:path");
const tagger=require("../js/competency-tagger.js");
const ROOT=process.argv[2]||"_site/data";
const BANKS=[
 ["science","science",1400],["mathematics","mathematics",1400],["english","english",3700],
 ["social-science","social-science",2200],["hindi","hindi",254],
 ["class-3-mathematics","mathematics",1400],["class-3-english","english",120],
 ["class-6-science","science",1200],["class-6-mathematics","mathematics",1000],
 ["class-6-english","english",1600],["class-6-social-science","social-science",1400],
 ["class-6-science-sof","science-sof",600],["class-6-mathematics-sof","mathematics-sof",550],
 ["class-6-english-sof","english-sof",600]
];
const totals={banks:0,chapters:0,questions:0,byCompetency:Object.fromEntries(tagger.values.map(v=>[v,0])),byStatus:Object.fromEntries(tagger.statuses.map(v=>[v,0]))};
for(const [file,subjectId,expected] of BANKS){
 const full=path.join(ROOT,file+".json");
 if(!fs.existsSync(full))throw Error("Required deployed MCQ bank is missing: "+full);
 const data=JSON.parse(fs.readFileSync(full,"utf8"));
 if(!Array.isArray(data)||!data.length)throw Error("MCQ bank must be a non-empty chapter array: "+file);
 const chapters=data.length;let count=0;
 for(const chapter of data){
  if(!chapter.title||!Array.isArray(chapter.questions))throw Error("Malformed chapter in "+file+": "+(chapter.title||"(untitled)"));
  chapter.questions=chapter.questions.map((question,index)=>{
   const tagged=tagger.tagQuestion(question,{subjectId,section:question.section||chapter.section,chapterTitle:chapter.title,chapterId:chapter.key});
   const problem=tagger.validate(tagged);
   if(problem)throw Error(file+" / "+chapter.title+" / "+(question.id||index+1)+": "+problem);
   count++;totals.questions++;
   totals.byCompetency[tagged.competency]++;
   totals.byStatus[tagged.competencyTagStatus]++;
   return tagged;
  });
 }
 if(count!==expected)throw Error(file+" expected "+expected+" MCQs after chapter merges, got "+count);
 fs.writeFileSync(full,JSON.stringify(data,null,2)+String.fromCharCode(10));
 totals.banks++;totals.chapters+=chapters;
 console.log(file+": "+chapters+" chapters / "+count+" MCQs tagged.");
}
if(totals.banks!==BANKS.length||totals.questions!==17424)throw Error("Cross-subject tagging coverage mismatch: "+JSON.stringify(totals));
console.log("Cross-subject MCQ competency tagging complete: "+totals.banks+" banks, "+totals.chapters+" chapters, "+totals.questions+" MCQs.");
console.log("Competency totals: "+JSON.stringify(totals.byCompetency));
console.log("Tag status totals: "+JSON.stringify(totals.byStatus));
