"use strict";
const fs=require("node:fs");
const zlib=require("node:zlib");
const output="_site/data/science.json";
fs.mkdirSync("_site/data",{recursive:true});
if(fs.existsSync("data/science.json")){
 fs.copyFileSync("data/science.json",output);
 console.log("Using committed data/science.json as the Science bank source of truth.");
}else{
 const encoded=fs.readFileSync("science-payload/part-01.txt","utf8").trim()
  +Array.from({length:16},(_,i)=>fs.readFileSync("science-payload/part-"+String(i+2).padStart(2,"0")+".txt","utf8").trim()).join("");
 const html=zlib.gunzipSync(Buffer.from(encoded,"base64")).toString("utf8");
 const match=html.match(/const EMBEDDED_CHAPTERS = (\[[\s\S]*?\]);\s*\nlet chapters/);
 if(!match)throw Error("Embedded Science chapter data was not found.");
 const chapters=JSON.parse(match[1]);
 const count=chapters.reduce((sum,chapter)=>sum+(chapter.questions||[]).length,0);
 if(chapters.length!==14||count!==1400)throw Error("Expected 14 Science chapters / 1,400 MCQs; found "+chapters.length+" / "+count+".");
 const sharedChapters=chapters.map((chapter,chapterIndex)=>({
  chapter_no:chapter.chapter_no||chapter.chapterNo||chapterIndex+1,
  title:chapter.title,
  key:chapter.key||chapter.chapterKey,
  questions:(chapter.questions||[]).map((question,questionIndex)=>{
   const options=question.options||question.choices;
   const rawAnswer=question.answer??question.correctAnswer??question.correctOption??question.correct_option;
   let answer=Number(rawAnswer);
   if(!Number.isInteger(answer)&&typeof rawAnswer==="string"){
    const letter=rawAnswer.trim().toUpperCase();
    if(/^[A-D]$/.test(letter))answer=letter.charCodeAt(0)-65;
    else answer=Array.isArray(options)?options.findIndex(option=>String(option).trim()===rawAnswer.trim()):-1;
   }
   return{
    id:question.id??question.questionId??questionIndex+1,
    question:question.question||question.prompt||question.text,
    options,answer,
    explanation:question.explanation||question.rationale||"Review the related concept in your textbook, then try this question again.",
    difficulty:question.difficulty||"Medium"
   };
  })
 }));
 for(const chapter of sharedChapters){
  if(!chapter.title||!Array.isArray(chapter.questions)||!chapter.questions.length)throw Error("Science shared bank has an empty chapter.");
  for(const question of chapter.questions){
   if(!question.question||!Array.isArray(question.options)||question.options.length!==4||!Number.isInteger(question.answer)||question.answer<0||question.answer>3||!question.explanation){
    throw Error("Malformed Science MCQ in chapter "+chapter.title+", id "+question.id);
   }
  }
 }
 fs.writeFileSync(output,JSON.stringify(sharedChapters,null,2)+"\n");
 console.log("Built shared Science question bank from compressed payload: "+chapters.length+" chapters / "+count+" MCQs.");
}
const bank=JSON.parse(fs.readFileSync(output,"utf8"));
const total=bank.reduce((sum,chapter)=>sum+(chapter.questions||[]).length,0);
if(bank.length!==14||total!==1400)throw Error("Shared Science bank output must contain 14 chapters / 1,400 MCQs.");
console.log("Shared Science bank fixture ready: "+bank.length+" chapters / "+total+" MCQs.");
