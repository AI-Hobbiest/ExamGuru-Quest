"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const bank=JSON.parse(fs.readFileSync("data/class-6-science.json","utf8"));
assert.equal(bank.length,12,"Class 6 Science follows all 12 NCERT Curiosity chapters");
assert.equal(bank.reduce((sum,chapter)=>sum+chapter.questions.length,0),1200,"Science bank includes 100 MCQs per chapter");
const prompts=new Set(),ids=new Set();
for(const chapter of bank){
  assert.ok(chapter.title,"every chapter has a title");
  assert.ok(Array.isArray(chapter.questions)&&chapter.questions.length===100,"each Science chapter has 100 questions");
  for(const question of chapter.questions){
    assert.ok(question.id&&question.question&&question.explanation,"question ID, prompt and explanation are present");
    assert.ok(!ids.has(question.id),"question IDs are unique");
    ids.add(question.id);
    assert.equal(question.options.length,4,"each MCQ has four options");
    assert.equal(new Set(question.options).size,4,"each MCQ has four distinct options");
    assert.ok(!question.options.some(option=>["h","t","n/a"].includes(String(option).trim().toLowerCase())),"Science options must not contain malformed placeholder tokens");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"answer index is valid");
    assert.ok(!prompts.has(question.question),"question prompts are unique");
    prompts.add(question.question);
  }
}
const socialBank=JSON.parse(fs.readFileSync("data/class-6-social-science.json","utf8"));
assert.equal(socialBank.length,14,"Class 6 Social Science follows the 14 NCERT Exploring Society chapters");
assert.equal(socialBank.reduce((sum,chapter)=>sum+chapter.questions.length,0),1400,"Class 6 Social Science includes 100 MCQs per chapter");
const socialPrompts=new Set(),socialIds=new Set();
for(const chapter of socialBank){
  assert.ok(chapter.title,"every Social Science chapter has a title");
  assert.equal(chapter.questions.length,100,"each Social Science chapter has 100 questions");
  for(const question of chapter.questions){
    assert.ok(question.id&&question.question&&question.explanation,"Social Science question ID, prompt and explanation are present");
    assert.ok(!socialIds.has(question.id),"Social Science question IDs are unique");
    socialIds.add(question.id);
    assert.equal(question.options.length,4,"each Social Science MCQ has four options");
    assert.equal(new Set(question.options).size,4,"each Social Science MCQ has four distinct options");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"Social Science answer index is valid");
    assert.ok(!socialPrompts.has(question.question),"Social Science prompts are unique");
    socialPrompts.add(question.question);
  }
}
const mathBank=JSON.parse(fs.readFileSync("data/class-6-mathematics.json","utf8"));
assert.equal(mathBank.length,10,"Class 6 Mathematics follows all 10 Ganita Prakash chapters");
assert.equal(mathBank.reduce((sum,chapter)=>sum+chapter.questions.length,0),1000,"Mathematics bank includes 100 MCQs per chapter");
for(const chapter of mathBank){
  assert.ok(chapter.title,"every Mathematics chapter has a title");
  assert.equal(chapter.questions.length,100,"each Mathematics chapter has 100 questions");
  for(const question of chapter.questions){
    assert.ok(question.id&&question.question&&question.explanation,"question ID, prompt and explanation are present");
    assert.equal(question.options.length,4,"each Mathematics MCQ has four options");
    assert.equal(new Set(question.options).size,4,"each Mathematics MCQ has four distinct options");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"Mathematics answer index is valid");
  }
}
const catalog=JSON.parse(fs.readFileSync("data/classes.json","utf8"));
assert.deepEqual(catalog.classes.find(row=>row.classId==="6").subjects,["science","mathematics","english","social-science","mathematics-sof","science-sof","english-sof"],"Class 6 includes CBSE subjects plus separate SOF Mathematics and Science subjects");
assert.deepEqual(catalog.classes.find(row=>row.classId==="10").subjects,["science","mathematics","english","social-science","hindi"],"Class 10 subjects remain unchanged");
const context={window:{}};context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync("js/question-bank.js","utf8"),context,{filename:"js/question-bank.js"});
const normalized=context.window.C10QuestionBank.normalize(bank,"class-6-science");
const questions=normalized.flatMap(chapter=>chapter.questions);
assert.equal(questions.length,1200);
assert.equal(new Set(questions.map(question=>question.questionKey)).size,1200,"Class 6 Science question keys are unique");
const normalizedSocial=context.window.C10QuestionBank.normalize(socialBank,"class-6-social-science");
const socialQuestions=normalizedSocial.flatMap(chapter=>chapter.questions);
assert.equal(socialQuestions.length,1400);
assert.equal(new Set(socialQuestions.map(question=>question.questionKey)).size,1400,"Class 6 Social Science question keys are unique");

const englishBank=JSON.parse(fs.readFileSync("data/class-6-english.json","utf8"));
assert.equal(englishBank.length,16,"Class 6 English follows the 16 reading pieces in Poorvi (2026-27)");
assert.equal(englishBank.reduce((sum,chapter)=>sum+chapter.questions.length,0),1600,"Class 6 English contains 100 MCQs per reading piece");
const englishPrompts=new Set(),englishIds=new Set();
for(const chapter of englishBank){
  assert.ok(chapter.title,"every English topic has a title");
  assert.equal(chapter.questions.length,100,"each English topic has 100 distinct questions");
  assert.ok(chapter.section&&chapter.section.startsWith("Unit "),"each English topic records the source unit");
  for(const question of chapter.questions){
    assert.ok(question.id&&question.question&&question.explanation,"English question ID, prompt and explanation are present");
    assert.ok(!englishIds.has(question.id),"English question IDs are unique");englishIds.add(question.id);
    assert.equal(question.options.length,4,"each English MCQ has four options");
    assert.equal(new Set(question.options).size,4,"each English MCQ has four distinct options");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"English answer index is valid");
    assert.ok(!englishPrompts.has(question.question),"English question stems are unique");englishPrompts.add(question.question);
  }
}


const normalizedEnglish=context.window.C10QuestionBank.normalize(englishBank,"class-6-english");
const englishQuestions=normalizedEnglish.flatMap(chapter=>chapter.questions);
assert.equal(englishQuestions.length,1600);
assert.equal(new Set(englishQuestions.map(question=>question.questionKey)).size,1600,"Class 6 English question keys are unique");

const normalizedMath=context.window.C10QuestionBank.normalize(mathBank,"class-6-mathematics");
const mathQuestions=normalizedMath.flatMap(chapter=>chapter.questions);
assert.equal(mathQuestions.length,1000);
assert.equal(new Set(mathQuestions.map(question=>question.questionKey)).size,1000,"Class 6 Mathematics question keys are unique");
for(const question of questions)assert.ok(question.options.includes(question.options[question.answer])&&question.explanation);
const engine=fs.readFileSync("js/quiz-engine.js","utf8");
assert.ok(engine.includes('const bankId = classId === "10" ? subject : "class-" + classId + "-" + subject'),"non-Class-10 learners use class-prefixed question-bank files");
assert.ok(engine.includes('"3":["mathematics","mathematics-sof","english"]'),"Class 3 exposes Mathematics, SOF IMO and English banks");
assert.ok(engine.includes('"6":["science","science-sof","mathematics","mathematics-sof","english","english-sof","social-science"]'),"Class 6 subject banks stay explicitly mapped including Mathematics - SOF");
assert.ok(engine.includes('if(!(CLASS_SUBJECTS[classId]||[]).includes(subject))'),"unpublished class-subject combinations are blocked");
assert.ok(engine.includes('sessionStorage.getItem("c10playground_static_student_v1")'),"quiz engine reads the same static student session as the navigation");
assert.ok(engine.includes('recordId:bankId'),"progress and attempts are isolated by class-specific bank");
assert.ok(engine.includes('fetch("./data/"+bankId+".json"'),"the shared engine loads the selected class bank");


const sofBank=JSON.parse(fs.readFileSync("data/class-6-mathematics-sof.json","utf8"));
const expectedSofTopics=[
  "Patterns in Mathematics","Lines and Angles","Number Play","Data Handling and Presentation","Prime Time",
  "Perimeter and Area","Fractions","Playing with Constructions","Symmetry","The Other Side of Zero",
  "Verbal and Non-Verbal Reasoning"
];
assert.deepEqual(sofBank.slice(0,11).map(chapter=>chapter.title),expectedSofTopics,"Class 6 IMO topic groups remain intact");
assert.equal(sofBank.length,13,"IMO bank includes eleven current-class topics plus two Class 5 supplements");
assert.equal(sofBank[11].title,"Previous Class 5 — Mathematics Syllabus");
assert.equal(sofBank[12].title,"Previous Class 5 — Logical Reasoning");
assert.equal(sofBank.reduce((sum,chapter)=>sum+chapter.questions.length,0),635,"Class 6 SOF IMO bank contains 635 MCQs");
assert.ok(sofBank.slice(0,11).every(chapter=>chapter.questions.length===50),"the eleven original Class 6 IMO groups retain 50 questions each");
assert.equal(sofBank[11].questions.length,60,"Class 5 Maths supplement supplies 40 Mathematical Reasoning and 20 Everyday Mathematics questions");
assert.equal(sofBank[12].questions.length,25,"Class 5 reasoning supplement supplies 25 Logical Reasoning questions");
const sofIds=new Set(),sofPrompts=new Set(),sofTemplates=new Set();
const normalizeSofStem=value=>String(value).toLowerCase().replace(/[−–]/g,"-").replace(/\b\d[\d,]*(?:\.\d+)?\b/g,"#").replace(/\s+/g," ").replace(/[“”‘’"]/g,"").trim();
const sofQuestions=sofBank.flatMap(chapter=>chapter.questions);
for(const chapter of sofBank){
  assert.ok(chapter.title&&Array.isArray(chapter.questions)&&chapter.questions.length>0,"each SOF IMO topic group has questions");
  for(const question of chapter.questions){
    assert.ok(question&&question.id&&question.question&&question.explanation,"SOF question has ID, prompt and explanation");
    assert.ok(!sofIds.has(question.id),"SOF question IDs are unique");sofIds.add(question.id);
    assert.ok(Array.isArray(question.options)&&question.options.length===4,"SOF MCQs have four options");
    assert.equal(new Set(question.options).size,4,"SOF MCQ options are distinct");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"SOF answer index is valid");
    assert.ok(!sofPrompts.has(question.question.trim().toLowerCase()),"SOF question stems are unique");sofPrompts.add(question.question.trim().toLowerCase());
    const template=normalizeSofStem(question.question);
    assert.ok(!sofTemplates.has(template),"SOF question templates do not repeat after numeric values are normalised");
    sofTemplates.add(template);
    assert.ok(["Easy","Medium","Hard","Challenge"].includes(question.difficulty),"SOF difficulty is controlled");
    assert.ok(["Science","Achievers Section","Logical Reasoning","Mathematical Reasoning","Everyday Mathematics"].includes(question.section),"SOF section tag is controlled");
    assert.ok(question.syllabusClass&&question.syllabusOrigin&&question.syllabusTopic&&question.syllabusSource,"SOF syllabus provenance is complete");
    assert.ok((question.syllabusOrigin==="current-class"&&question.syllabusClass===6)||(question.syllabusOrigin==="previous-class"&&question.syllabusClass===5),"SOF grade and origin tags agree");
  }
}
assert.equal(sofIds.size,635,"all IMO question IDs are unique across the whole bank");
assert.equal(sofQuestions.filter(question=>question.syllabusOrigin==="current-class").length,550,"all 550 original IMO questions remain current-class");
assert.equal(sofQuestions.filter(question=>question.syllabusOrigin==="previous-class").length,85,"the previous-class IMO supplements total 85 questions");
for(const chapter of sofBank.slice(0,11)){
  const difficultyCounts=["Easy","Medium","Hard","Challenge"].map(level=>[level,chapter.questions.filter(q=>q.difficulty===level).length]);
  assert.deepEqual(difficultyCounts,[["Easy",5],["Medium",17],["Hard",20],["Challenge",8]],"each original Class 6 IMO group retains its difficulty balance");
}
assert.ok(sofBank[11].questions.every(q=>q.syllabusClass===5&&q.syllabusOrigin==="previous-class"&&q.syllabusSource==="SOF Class 5 IMO syllabus"),"Class 5 Maths supplement is origin-tagged");
assert.equal(sofBank[11].questions.filter(q=>q.section==="Mathematical Reasoning").length,40);
assert.equal(sofBank[11].questions.filter(q=>q.section==="Everyday Mathematics").length,20);
assert.ok(sofBank[12].questions.every(q=>q.section==="Logical Reasoning"&&q.syllabusClass===5&&q.syllabusOrigin==="previous-class"),"Class 5 reasoning supplement is tagged correctly");
const sofSectionCounts=sofQuestions.reduce((counts,q)=>(counts[q.section]=(counts[q.section]||0)+1,counts),{});
assert.deepEqual(sofSectionCounts,{
  "Logical Reasoning":75,
  "Mathematical Reasoning":340,
  "Everyday Mathematics":140,
  "Achievers Section":80
},"IMO section pools include the current and previous class supplements");
assert.ok(sofQuestions.filter(q=>q.section==="Achievers Section").every(q=>q.syllabusClass===6&&q.syllabusOrigin==="current-class"),"all IMO Achievers items are current-class");
const normalizedSof=context.window.C10QuestionBank.normalize(sofBank,"class-6-mathematics-sof");
const normalizedMathSofQuestions=normalizedSof.flatMap(chapter=>chapter.questions);
assert.equal(normalizedMathSofQuestions.length,635,"SOF Maths bank normalizes through shared engine");
assert.equal(new Set(normalizedMathSofQuestions.map(question=>question.questionKey)).size,635,"SOF Maths question keys are unique");
assert.ok(engine.includes('"mathematics-sof": { title:"Mathematics - SOF"'),"SOF has its own named subject entry");


const sofScienceBank=JSON.parse(fs.readFileSync("data/class-6-science-sof.json","utf8"));
const expectedIsoTopics=[
  "The Wonderful World of Science","Food and Its Components","Materials Around Us",
  "A Journey through States of Water","Methods of Separation","The Living World and Its Diversity",
  "Exploring Magnets","Measurement of Length and Motion","Temperature and Its Measurement",
  "Beyond Earth","Natural Resources","Verbal and Non-Verbal Reasoning"
];
assert.deepEqual(sofScienceBank.slice(0,12).map(chapter=>chapter.title),expectedIsoTopics,"the original twelve Class 6 ISO topic groups remain intact");
assert.equal(sofScienceBank.length,14,"ISO bank includes twelve Class 6 groups plus two Class 5 supplements");
assert.equal(sofScienceBank[12].title,"Previous Class 5 — Science Syllabus");
assert.equal(sofScienceBank[13].title,"Previous Class 5 — Logical Reasoning");
assert.equal(sofScienceBank.reduce((sum,chapter)=>sum+chapter.questions.length,0),685,"Class 6 SOF ISO bank contains 685 MCQs");
assert.ok(sofScienceBank.slice(0,12).every(chapter=>chapter.questions.length===50),"the original twelve Class 6 ISO groups retain 50 questions each");
assert.equal(sofScienceBank[12].questions.length,60,"Class 5 Science supplement supplies 60 previous-class questions");
assert.equal(sofScienceBank[13].questions.length,25,"Class 5 reasoning supplement supplies 25 previous-class questions");
const sofScienceIds=new Set(),sofSciencePrompts=new Set(),sofScienceTemplates=new Set();
const normalizeIsoStem=value=>String(value).toLowerCase().replace(/[−–]/g,"-").replace(/\b\d[\d,]*(?:\.\d+)?\b/g,"#").replace(/\s+/g," ").replace(/[“”‘’"]/g,"").trim();
const allIsoQuestions=sofScienceBank.flatMap(chapter=>chapter.questions);
for(const chapter of sofScienceBank){
  assert.ok(chapter.title&&Array.isArray(chapter.questions)&&chapter.questions.length>0,"every ISO topic set has questions");
  for(const question of chapter.questions){
    assert.ok(question&&question.id&&question.question&&question.explanation,"ISO question has ID, prompt and explanation");
    assert.ok(!sofScienceIds.has(question.id),"ISO question IDs are unique");sofScienceIds.add(question.id);
    assert.ok(Array.isArray(question.options)&&question.options.length===4,"ISO MCQs have four options");
    assert.equal(new Set(question.options).size,4,"ISO options are distinct");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"ISO answer index is valid");
    assert.ok(!sofSciencePrompts.has(question.question.trim().toLowerCase()),"ISO stems are unique");sofSciencePrompts.add(question.question.trim().toLowerCase());
    const template=normalizeIsoStem(question.question);
    assert.ok(!sofScienceTemplates.has(template),"ISO question templates do not repeat after numeric values are normalised");
    sofScienceTemplates.add(template);
    assert.ok(["Easy","Medium","Hard","Challenge"].includes(question.difficulty),"ISO difficulty is controlled");
    assert.ok(["Science","Achievers Section","Logical Reasoning"].includes(question.section),"ISO section tag is controlled");
    assert.ok(question.syllabusClass&&question.syllabusOrigin&&question.syllabusTopic&&question.syllabusSource,"ISO syllabus provenance is complete");
    assert.ok((question.syllabusOrigin==="current-class"&&question.syllabusClass===6)||(question.syllabusOrigin==="previous-class"&&question.syllabusClass===5),"ISO grade and origin tags agree");
  }
}
assert.equal(sofScienceIds.size,685,"all ISO question IDs are unique across the whole bank");
assert.equal(allIsoQuestions.filter(question=>question.syllabusOrigin==="current-class").length,600,"all 600 original ISO items remain current-class");
assert.equal(allIsoQuestions.filter(question=>question.syllabusOrigin==="previous-class").length,85,"the previous-class ISO supplements total 85 items");
for(const chapter of sofScienceBank.slice(0,12)){
  const difficultyCounts=["Easy","Medium","Hard","Challenge"].map(level=>[level,chapter.questions.filter(q=>q.difficulty===level).length]);
  assert.deepEqual(difficultyCounts,[["Easy",5],["Medium",17],["Hard",20],["Challenge",8]],"each original Class 6 ISO group retains its difficulty balance");
}
assert.ok(sofScienceBank[12].questions.every(q=>q.section==="Science"&&q.syllabusClass===5&&q.syllabusOrigin==="previous-class"&&q.syllabusSource==="SOF Class 5 ISO syllabus"),"Class 5 Science supplement is origin-tagged");
assert.ok(sofScienceBank[13].questions.every(q=>q.section==="Logical Reasoning"&&q.syllabusClass===5&&q.syllabusOrigin==="previous-class"),"Class 5 reasoning supplement is origin-tagged");
const isoSectionCounts=allIsoQuestions.reduce((counts,q)=>(counts[q.section]=(counts[q.section]||0)+1,counts),{});
assert.deepEqual(isoSectionCounts,{
  "Science":560,
  "Achievers Section":50,
  "Logical Reasoning":75
},"ISO section pools include current- and previous-class supplements");
assert.deepEqual(
  Object.fromEntries(["Science","Logical Reasoning","Achievers Section"].map(section=>[section,
    Object.fromEntries(["current-class","previous-class"].map(origin=>[origin,
      allIsoQuestions.filter(q=>q.section===section&&q.syllabusOrigin===origin).length
    ]))
  ])),
  {
    "Science":{"current-class":500,"previous-class":60},
    "Logical Reasoning":{"current-class":50,"previous-class":25},
    "Achievers Section":{"current-class":50,"previous-class":0}
  },"ISO section pools preserve their origin counts"
);
assert.ok(allIsoQuestions.filter(q=>q.section==="Achievers Section").every(q=>q.syllabusClass===6&&q.syllabusOrigin==="current-class"),"all ISO Achievers items are current-class");
assert.ok(sofScienceBank.slice(0,5).every(chapter=>chapter.questions[45].section==="Science"&&chapter.questions.slice(46).every(q=>q.section==="Achievers Section")),"the first five Class 6 science topics reserve four questions each for Achievers");
assert.ok(sofScienceBank.slice(5,11).every(chapter=>chapter.questions.slice(45).every(q=>q.section==="Achievers Section")),"the remaining six Class 6 science topics reserve five questions each for Achievers");
assert.ok(sofScienceBank[11].questions.every(q=>q.section==="Logical Reasoning"),"the original Class 6 reasoning group is separately tagged");
const normalizedSofScience=context.window.C10QuestionBank.normalize(sofScienceBank,"class-6-science-sof");
const normalizedSofScienceQuestions=normalizedSofScience.flatMap(chapter=>chapter.questions);
assert.equal(normalizedSofScienceQuestions.length,685,"SOF Science bank normalizes through shared engine");
assert.equal(new Set(normalizedSofScienceQuestions.map(question=>question.questionKey)).size,685,"SOF Science question keys are unique");
assert.ok(engine.includes('"science-sof": { title:"Science - SOF"'),"SOF Science has its own named subject entry");


const languageFiller = /For a language note connected|correct plural of friend|the chapter’s main idea/i;
assert.equal(englishBank.some(chapter=>chapter.questions.some(question=>languageFiller.test(question.question))),false,"Class 6 English should not contain generic repeated grammar filler");
const explanationFiller=/The textbook uses .* in this context; the correct choice is/i;
assert.equal(englishBank.some(chapter=>chapter.questions.some(question=>explanationFiller.test(question.explanation))),false,"Class 6 English should use informative explanations rather than boilerplate answer-key text");
const ramaChapter=englishBank.find(chapter=>chapter.key==="rama-to-the-rescue");
assert.ok(ramaChapter.questions.some(question=>question.question.includes("Who arrests the robber") && /kotwal/i.test(question.options[question.answer])),"Rama to the Rescue correctly identifies the kotwal as the person who arrests the thief");
const kiteChapter=englishBank.find(chapter=>chapter.key==="the-kites");
assert.ok(kiteChapter.questions.some(question=>question.question.includes("example of alliteration") && question.options[question.answer]==="Stand and stare"),"The Kites correctly identifies stand and stare as alliteration, not rhyme");

const sofEnglishBank=JSON.parse(fs.readFileSync("data/class-6-english-sof.json","utf8"));
assert.equal(sofEnglishBank.length,12,"Class 6 SOF IEO bank has twelve section/topic sets");
assert.equal(sofEnglishBank.reduce((sum,chapter)=>sum+chapter.questions.length,0),600,"Class 6 SOF IEO bank contains 600 practice MCQs");
const sofEnglishIds=new Set(),sofEnglishPrompts=new Set();
for(const chapter of sofEnglishBank){
  assert.equal(chapter.questions.length,50,"each SOF IEO topic has fifty questions");
  for(const question of chapter.questions){
    assert.ok(question.id&&question.question&&question.explanation&&question.section,"SOF IEO question has ID, prompt, explanation and exam section");
    assert.ok(!sofEnglishIds.has(question.id),"SOF IEO question IDs are unique");sofEnglishIds.add(question.id);
    assert.ok(!sofEnglishPrompts.has(question.question),"SOF IEO prompts are unique");sofEnglishPrompts.add(question.question);
    assert.equal(question.options.length,4,"SOF IEO MCQs have four options");
    assert.equal(new Set(question.options).size,4,"SOF IEO options are distinct");
    assert.ok(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4,"SOF IEO answer index is valid");
  }
}
const sofEnglishSections=sofEnglishBank.flatMap(chapter=>chapter.questions).reduce((counts,question)=>(counts[question.section]=(counts[question.section]||0)+1,counts),{});
assert.deepEqual(sofEnglishSections,{
  "Word and Structure Knowledge":446,
  "Reading":50,
  "Spoken and Written Expression":54,
  "Achievers Section":50
},"SOF IEO has complete official section-tagged pools for Level 1 mock assembly");
const normalizedSofEnglish=context.window.C10QuestionBank.normalize(sofEnglishBank,"class-6-english-sof");
assert.equal(normalizedSofEnglish.flatMap(chapter=>chapter.questions).length,600,"SOF English bank normalizes through shared engine");
assert.equal(new Set(normalizedSofEnglish.flatMap(chapter=>chapter.questions).map(question=>question.questionKey)).size,600,"SOF English question keys are unique");
assert.ok(engine.includes('"english-sof": { title:"English - SOF"'),"SOF English has its own named subject entry");
assert.ok(engine.includes('"english","english-sof","social-science"'),"Class 6 English - SOF is included in class-subject routing");

console.log("Class 6 banks passed content review: NCERT Science 12/1,200, Mathematics 10/1,000, English 16/1,600, Social Science 14/1,400; SOF IEO 12/600; unique IDs, question keys, valid MCQ structures and class-specific routing.");
