"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");

const banks=[
  ["English","data/class-6-english.json"],
  ["Mathematics","data/class-6-mathematics.json"],
  ["Science","data/class-6-science.json"],
  ["Social Science","data/class-6-social-science.json"]
];
const expectedLevels={Easy:25,Medium:25,Hard:25,Challenge:25};
const problems=[];
const normalise=value=>String(value||"").toLowerCase()
  .replace(/[“”‘’"]/g,"")
  .replace(/\s+/g," ")
  .trim();

for(const [subject,path] of banks){
  const chapters=JSON.parse(fs.readFileSync(path,"utf8"));
  for(const chapter of chapters){
    const questions=chapter.questions||[];
    if(questions.length!==100){
      problems.push(subject+" / "+chapter.title+": expected 100 questions, found "+questions.length);
    }
    const levels={Easy:0,Medium:0,Hard:0,Challenge:0};
    const seen=new Set();
    for(const question of questions){
      if(Object.prototype.hasOwnProperty.call(levels,question.difficulty))levels[question.difficulty]++;
      else problems.push(subject+" / "+chapter.title+" / "+question.id+": unsupported difficulty "+String(question.difficulty));
      const stem=normalise(question.question);
      if(seen.has(stem))problems.push(subject+" / "+chapter.title+" / "+question.id+": repeated stem");
      seen.add(stem);
      if(!Array.isArray(question.options)||question.options.length!==4||
        new Set((question.options||[]).map(normalise)).size!==4||
        !Number.isInteger(question.answer)||question.answer<0||question.answer>3||
        !question.explanation){
        problems.push(subject+" / "+chapter.title+" / "+question.id+": invalid MCQ structure or answer key");
      }
      if((question.options||[]).some(option=>["h","t","n/a"].includes(normalise(option)))){
        problems.push(subject+" / "+chapter.title+" / "+question.id+": placeholder distractor");
      }
    }
    for(const [level,count] of Object.entries(expectedLevels)){
      if(levels[level]!==count){
        problems.push(subject+" / "+chapter.title+": "+level+" target is "+count+", found "+levels[level]);
      }
    }
  }
}

// English prompts must be passage-specific. Strip only the chapter title to expose
// templates that have been copied unchanged from one chapter into another.
const english=JSON.parse(fs.readFileSync("data/class-6-english.json","utf8"));
const englishTemplates=new Map();
for(const chapter of english){
  const escaped=String(chapter.title).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  for(const question of chapter.questions||[]){
    const template=normalise(question.question.replace(new RegExp(escaped,"gi"),"[chapter]"));
    const rows=englishTemplates.get(template)||[];
    rows.push(chapter.title+" / "+question.id);
    englishTemplates.set(template,rows);
  }
}
for(const [template,rows] of englishTemplates){
  if(rows.length>1)problems.push("English cross-chapter template ("+rows.length+" copies): "+rows.slice(0,4).join("; "));
}

if(problems.length){
  console.error("Class 6 core question-bank quality gate failed. The bank rebuild must pass before release.");
  console.error("Issue count: "+problems.length);
  console.error(problems.slice(0,80).join("\n"));
  if(problems.length>80)console.error("... "+(problems.length-80)+" additional issues omitted");
}
assert.equal(problems.length,0,"Class 6 core banks must have 25 Easy, 25 Medium, 25 Hard and 25 Challenge items per chapter, distinct stems, and valid answer data.");
console.log("Class 6 core question-bank quality gate passed.");
