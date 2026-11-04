"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{},Object,Array,String,Number,Set,Map,Math,Date,TypeError,Error};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/exam-paper-generator.js","utf8"),ctx);
const m=ctx.window.C10ExamPaperGenerator;
const socialBlueprint=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-10-social-science-2026-27.json","utf8"));
const socialCheck=m.validateBlueprint(socialBlueprint);
assert.equal(socialCheck.valid,true,socialCheck.errors.join("; "));
assert.equal(socialBlueprint.status,"draft","Social Science remains locked until its content audit and slot-depth gate pass");
assert.equal(socialBlueprint.totalQuestions,38);
assert.equal(socialBlueprint.totalMarks,80);
assert.equal(socialBlueprint.slotPlan.length,38);
assert.deepEqual(socialBlueprint.sections.map(s=>s.totalMarks),[20,20,20,20]);
assert.equal(socialBlueprint.slotPlan.filter(s=>s.competency==="map-skill").length,2);
assert.deepEqual(socialBlueprint.officialAssessmentDesign.internalChoiceQuestionNumbers,[6,7,17,27,38]);
assert.deepEqual(socialBlueprint.officialAssessmentDesign.caseBasedQuestionNumbers,[8,18,28]);
assert.deepEqual(socialBlueprint.slotPlan.find(s=>s.questionNumber===38).allowedTypes,["long-answer"]);
assert.deepEqual(socialBlueprint.mcqPracticeExclusions,["the-age-of-industrialisation","consumer-rights"]);
assert.deepEqual(socialBlueprint.mcqSubtopicRestrictions["the-making-of-a-global-world"].allowedSubtopics,["1","1.1","1.2","1.3"]);
assert.deepEqual(socialBlueprint.mcqSubtopicRestrictions["globalisation-and-the-indian-economy"].allowedSubtopics,["what-is-globalisation","factors-that-have-enabled-globalisation"]);
assert.deepEqual(socialBlueprint.mcqSubtopicRestrictions["lifelines-of-national-economy"].allowedQuestionTypes,["map-skill"]);
assert.ok(m.competencies.includes("map-skill"),"the shared generator must support map-skill competency targets");
const socialMcqPaths=["data/social-science-topics-01-06.json","data/social-science-topics-07-12.json","data/social-science-topics-13-17.json","data/social-science-topics-18-22.json"];
let socialMcqCount=0,socialNeedsReview=0;const socialChapters=[];
for(const file of socialMcqPaths){
 const groups=JSON.parse(fs.readFileSync(file,"utf8"));socialChapters.push(...groups);
 for(const chapter of groups){
  const answerCounts=[0,0,0,0];
  for(const item of chapter.questions||[]){
   socialMcqCount++;
   assert.equal(item.options.length,4,"Social Science MCQs must retain four options");
   assert.ok(Number.isInteger(item.answer)&&item.answer>=0&&item.answer<4,"Social Science MCQ answer index must remain valid");
   answerCounts[item.answer]++;
   if(/^(Which statement best describes|What is a key feature or consequence|How is .* best understood|Which description of .* is accurate)/i.test(item.question||"")){
    assert.equal(item.competencyTagStatus,"needs-review","generic templated Social Science stems must be held out of exam-paper integration");
    socialNeedsReview++;
   }
  }
  assert.ok(Math.max(...answerCounts)-Math.min(...answerCounts)<=1,"each Social Science chapter set must have balanced correct-answer positions");
 }
}
assert.equal(socialMcqCount,2216,"the four source files should contain 2,216 Social Science MCQs after NCERT-verified replacement additions");
assert.equal(socialNeedsReview,1673,"all generic template-pattern MCQs should be held for review");
const boardMcqChapterNos=[1,2,3,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21];
for(const chapterNo of boardMcqChapterNos){
 const chapter=socialChapters.find(item=>item.chapter_no===chapterNo);
 assert.ok(chapter,"expected Social Science source chapter "+chapterNo);
 const eligible=chapter.questions.filter(item=>item.competencyTagStatus!=="needs-review").length;
 assert.ok(eligible>=20,"board-scope Social Science chapter "+chapterNo+" must retain at least 20 non-template, non-duplicate candidates; found "+eligible);
}
assert.ok(socialBlueprint.mcqPracticeExclusions.includes("the-age-of-industrialisation"));
assert.ok(socialBlueprint.mcqPracticeExclusions.includes("consumer-rights"));
assert.deepEqual(socialBlueprint.mcqSubtopicRestrictions["lifelines-of-national-economy"].allowedQuestionTypes,["map-skill"]);
assert.deepEqual(socialBlueprint.officialAssessmentDesign.caseBasedQuestionNumbers,[8,18,28]);
assert.deepEqual(socialBlueprint.officialAssessmentDesign.longAnswerQuestionNumbers,[7,17,27,38]);
const socialBank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-social-science-2026-27-v1.json","utf8"));
const socialBankCheck=m.validateQuestionBank(socialBank,{classId:"10",subjectId:"social-science",academicYear:"2026-27"});
assert.equal(socialBankCheck.valid,true,socialBankCheck.errors.join("; "));
assert.equal(socialBank.questions.length,767,"Social Science bank should contain 626 original candidates, 80 long-answer, 40 map and 21 additional NCERT-verified MCQs");
assert.equal(new Set(socialBank.questions.map(q=>q.questionId)).size,767,"Social Science question IDs must be unique");
assert.equal(socialBank.questions.filter(q=>q.type==="mcq").length,407,"the Social Science board-scope MCQ pool must contain 407 verified candidates");
assert.ok(socialBank.questions.filter(q=>q.type==="mcq").every(q=>q.approvalStatus==="approved"),"all verified board-scope MCQs must be approved");
const normaliseMcqStem=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const auditedMcqStems=socialBank.questions.filter(q=>q.type==="mcq").map(q=>normaliseMcqStem(q.prompt));
assert.equal(new Set(auditedMcqStems).size,407,"the 407 approved Social Science MCQs must have distinct stems");
assert.equal(socialBank.questions.filter(q=>q.type==="assertion-reason"&&q.approvalStatus==="approved").length,60,"all three one-mark Assertion–Reason pools must be approved");
assert.ok(socialBank.questions.filter(q=>["very-short-answer","short-answer","case-based"].includes(q.type)).every(q=>q.approvalStatus==="review"),"VSA, short-answer and case-based pools remain in review pending their own release checks");
const socialLong=socialBank.questions.filter(q=>q.type==="long-answer");
assert.equal(socialLong.length,80);
for(const slot of ["Q7","Q17","Q27","Q38"]){const pool=socialLong.filter(q=>q.questionId.startsWith("SST10-"+slot+"-LA-"));assert.equal(pool.length,20);assert.ok(pool.every(q=>q.approvalStatus==="approved"&&q.prompt.length>=70&&q.alternatives?.length===1&&q.alternatives[0].prompt.length>=70&&q.marks===5&&q.markingScheme.length===5&&q.markingScheme.reduce((s,m)=>s+m.marks,0)===5&&q.alternatives[0].markingScheme.reduce((s,m)=>s+m.marks,0)===5));}
const socialMaps=socialBank.questions.filter(q=>q.type==="diagram-based"&&q.competency==="map-skill");assert.equal(socialMaps.length,40);
for(const slot of ["Q9","Q19"]){const pool=socialMaps.filter(q=>q.questionId.startsWith("SST10-"+slot+"-MAP-"));assert.equal(pool.length,20);assert.ok(pool.every(q=>q.images?.[0]?.src==="./assets/exam-papers/social-science/india-outline-map.svg"&&q.mapTasks?.length>=(slot==="Q9"?2:4)));}
assert.ok(socialMaps.filter(q=>q.questionId.startsWith("SST10-Q19-MAP-")).every(q=>q.approvalStatus==="approved"&&q.parts?.length===3&&q.parts.reduce((s,p)=>s+p.marks,0)===3&&q.parts.filter(p=>p.alternatives?.length===1).length===1));
const geographyMaps=socialMaps.filter(q=>q.questionId.startsWith("SST10-Q19-MAP-"));
const officialGeoMapIds=new Set(geographyMaps.flatMap(q=>q.mapTasks.map(t=>t.mapWorkId)));
assert.equal(officialGeoMapIds.size,79,"all 79 CBSE Geography map-work items must be represented without duplicate item identities");
for(const required of ["Durg","Bellary","Bokaro","Naharkatia","Hyderabad"])assert.ok(geographyMaps.some(q=>q.mapTasks.some(t=>t.acceptedLabel===required)),"missing required map-work label: "+required);
assert.ok(geographyMaps.every(q=>q.mapTasks.every(t=>t.acceptedLabel&&t.mapWorkId&&Number.isFinite(t.latitude)&&Number.isFinite(t.longitude))),"every Geography map task needs a specific answer label and plotting coordinates");
assert.ok(socialMaps.every(q=>q.images?.[0]?.alt?.includes("state and Union Territory boundaries")),"map image alt text must describe the state/UT outline shown");
assert.ok(fs.existsSync("assets/exam-papers/social-science/india-outline-map.svg"));assert.ok(fs.statSync("assets/exam-papers/social-science/india-outline-map.svg").size<70000);

assert.ok(socialBank.questions.every(q=>q.type!=="mcq"||!["the-age-of-industrialisation","lifelines-of-national-economy","consumer-rights"].includes(q.chapterId)),"excluded or map-only chapters must not enter the MCQ examination bank");
const oneMarkSlots=socialBlueprint.slotPlan.filter(s=>s.marks===1);
assert.equal(oneMarkSlots.length,20,"the board blueprint must contain 20 one-mark MCQ/Assertion–Reason slots");
const oneMarkAudit=m.auditSlotCoverage(socialBlueprint,socialBank,20);
for(const slot of oneMarkSlots){const coverage=oneMarkAudit.coverage.find(x=>x.slotId===slot.slotId);assert.ok(coverage&&coverage.eligibleCount>=20,"one-mark slot "+slot.slotId+" must have at least 20 eligible approved candidates; found "+(coverage?.eligibleCount||0));}

const socialAr=socialBank.questions.filter(q=>q.type==="assertion-reason");
assert.equal(socialAr.length,60,"three Social Science assertion-reason slots must each have 20 candidates");
for(const chapterId of ["manufacturing-industries","power-sharing","globalisation-and-the-indian-economy"]){
 const pool=socialAr.filter(q=>q.chapterId===chapterId);
 assert.equal(pool.length,20,"Assertion–Reason pool "+chapterId+" must contain 20 candidates");
 assert.ok(pool.every(q=>q.assertionReason&&q.assertionReason.assertion&&q.assertionReason.reason),"Assertion–Reason candidates need separate assertion and reason fields");
 const distribution=["A","B","C","D"].map(answer=>pool.filter(q=>q.correctOptionId===answer).length);
 assert.deepEqual(distribution,[5,5,5,5],"Assertion–Reason answer categories must be balanced for "+chapterId);
}
assert.deepEqual(socialBank.generationDesign.repeatProtection.includes("five-paper"),true);
const socialCases=socialBank.questions.filter(q=>q.type==="case-based");
assert.equal(socialCases.length,60,"three Social Science case-based slots must each have 20 candidates");
for(const slot of ["q8","q18","q28"]){
 const pool=socialCases.filter(q=>q.questionId.startsWith("SST10-"+slot.toUpperCase()+"-CB-"));
 assert.equal(pool.length,20,"case-based slot "+slot+" must contain 20 candidates");
 assert.ok(pool.every(q=>q.stimulus&&q.parts?.length===3&&q.parts.reduce((sum,p)=>sum+p.marks,0)===4),"case-based questions need a source and a four-mark part structure");
}
const socialShort=socialBank.questions.filter(q=>q.type==="short-answer");
assert.equal(socialShort.length,40,"two Social Science short-answer slots must each have 20 candidates");
for(const slot of ["q6","q26"]){
 const pool=socialShort.filter(q=>q.questionId.startsWith("SST10-"+slot.toUpperCase()+"-SA-"));
 assert.equal(pool.length,20,"short-answer slot "+slot+" must contain 20 candidates");
 assert.ok(pool.every(q=>q.marks===3&&q.markingScheme.reduce((sum,m)=>sum+m.marks,0)===3&&q.alternatives?.length===1&&q.alternatives[0].markingScheme.reduce((sum,m)=>sum+m.marks,0)===3),"short-answer internal-choice marking schemes must total three marks");
}
const socialVsa=socialBank.questions.filter(q=>q.type==="very-short-answer");
assert.equal(socialVsa.length,80,"four Social Science VSA slots must each have 20 candidates");
for(const slot of ["q5","q16","q24","q25"]){
 const pool=socialVsa.filter(q=>q.questionId.startsWith("SST10-"+slot.toUpperCase()+"-VSA-"));
 assert.equal(pool.length,20,"VSA slot "+slot+" must contain 20 candidates");
 assert.ok(pool.every(q=>q.marks===2&&q.markingScheme.reduce((sum,m)=>sum+m.marks,0)===2),"VSA marking schemes must total two marks");
}
for(const restricted of ["the-age-of-industrialisation","consumer-rights"]){
 assert.ok(socialBlueprint.mcqPracticeExclusions.includes(restricted),"non-board chapter "+restricted+" must not be auto-imported into the MCQ pool");
}
const production=JSON.parse(fs.readFileSync("data/exam-papers/blueprints/class-10-science-2026-27.json","utf8"));
const pcheck=m.validateBlueprint(production);assert.equal(pcheck.valid,true);assert.equal(pcheck.readyForGeneration,true);
assert.throws(()=>m.generatePaper(production,{schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"science",academicYear:"2026-27",bankVersion:"x",questions:[]}),/Question pool shortage/);
const bp={schemaVersion:1,kind:"exam-paper-blueprint",blueprintId:"fixture",version:1,title:"Fixture",academicYear:"2026-27",classId:"10",subjectId:"science",durationMinutes:180,totalQuestions:4,totalMarks:10,status:"ready",sections:[{sectionId:"biology",title:"Biology",questionCount:2,totalMarks:5},{sectionId:"chemistry",title:"Chemistry",questionCount:1,totalMarks:2},{sectionId:"physics",title:"Physics",questionCount:1,totalMarks:3}],slotPlan:[{slotId:"B1",questionNumber:1,sectionId:"biology",marks:2,count:1,allowedTypes:["short-answer"]},{slotId:"B2",questionNumber:2,sectionId:"biology",marks:3,count:1,allowedTypes:["case-based"]},{slotId:"C1",questionNumber:3,sectionId:"chemistry",marks:2,count:1,allowedTypes:["mcq"]},{slotId:"P1",questionNumber:4,sectionId:"physics",marks:3,count:1,allowedTypes:["numerical"]}]};
function q(id,sectionId,marks,type,extra={}){return{questionId:id,sectionId,chapterId:"ch-"+sectionId,type,marks,prompt:"Prompt "+id,difficulty:"medium",competency:"application",approvalStatus:"approved",answerKey:{modelAnswer:"Answer "+id},markingScheme:Array.from({length:marks},(_,i)=>({criterion:"Point "+(i+1),marks:1})),...extra};}
const bank={schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"science",academicYear:"2026-27",bankVersion:"test-1",questions:[
 q("bio1","biology",2,"short-answer"),q("bio2","biology",3,"case-based",{stimulus:"Passage",parts:[{partId:"a",prompt:"Part A",marks:1},{partId:"b",prompt:"Part B",marks:2}]}),
 q("chem1","chemistry",2,"mcq",{options:[{optionId:"a",text:"A"},{optionId:"b",text:"B"}],correctOptionId:"b"}),
 q("phys1","physics",3,"numerical"),q("draft","biology",2,"short-answer",{approvalStatus:"draft"})]};
assert.equal(m.validateQuestionBank(bank).valid,true);
const diagramQuestion=q("diagram","physics",3,"diagram-based",{images:[{src:"./assets/questions/science/circuit.png",alt:"Simple electric circuit"}]});
assert.equal(m.validateQuestion(diagramQuestion).length,0);
const mapSkillQuestion=q("map-skill","geography",2,"diagram-based",{competency:"map-skill",images:[{src:"./assets/exam-papers/social-science/india-outline-map.svg",alt:"Outline map of India for map-skill assessment"}]});
assert.equal(m.validateQuestion(mapSkillQuestion).length,0,"map-based diagram questions must accept the dedicated map-skill competency");
assert.ok(m.competencies.includes("map-skill"),"the shared generator must support CBSE map-skill competency targets");
const unsafeDiagram=q("bad-diagram","physics",3,"diagram-based",{images:[{src:"../private.png",alt:"Unsafe path"}]});
assert.ok(m.validateQuestion(unsafeDiagram).length>0,"diagram assets must use safe relative paths");
const paper=m.generatePaper(bp,bank,{seed:"same",generatedAt:"2026-11-02T00:00:00.000Z"});
assert.equal(paper.totalQuestions,4);assert.equal(paper.totalMarks,10);assert.equal(m.validatePaper(paper,bp).valid,true);
assert.deepEqual(JSON.parse(JSON.stringify(paper.sectionResults.map(s=>[s.sectionId,s.questionCount,s.totalMarks]))),[["biology",2,5],["chemistry",1,2],["physics",1,3]]);
assert.deepEqual(JSON.parse(JSON.stringify(m.generatePaper(bp,bank,{seed:"same"}).questions.map(x=>x.questionId))),JSON.parse(JSON.stringify(m.generatePaper(bp,bank,{seed:"same"}).questions.map(x=>x.questionId))));
assert.throws(()=>m.generatePaper(bp,{...bank,questions:bank.questions.filter(x=>x.questionId!=="bio2")},{seed:"short"}),/Question pool shortage/);
assert.equal(m.validateQuestionBank({...bank,questions:[...bank.questions,bank.questions[0]]}).valid,false);
assert.equal(m.validateBlueprint({...bp,totalMarks:11}).valid,false);
const choiceBp={...bp,totalQuestions:1,totalMarks:2,sections:[{sectionId:"biology",title:"Bio",questionCount:1,totalMarks:2}],slotPlan:[{slotId:"choice",questionNumber:1,sectionId:"biology",marks:2,count:1,allowedTypes:["short-answer"],requiresInternalChoice:true}]};
const choiceQ=q("choice","biology",2,"short-answer",{alternatives:[{prompt:"Equivalent alternative",answerKey:{modelAnswer:"Alternative answer"},markingScheme:[{criterion:"Alternative point 1",marks:1},{criterion:"Alternative point 2",marks:1}]}]});
assert.equal(m.generatePaper(choiceBp,{...bank,questions:[choiceQ]},{seed:"choice"}).questions[0].alternatives.length,1);
assert.throws(()=>m.generatePaper(choiceBp,{...bank,questions:[q("no-choice","biology",2,"short-answer")]},{seed:"x"}),/Question pool shortage/);

// The same core generator must accept another class-10 subject without a code change.
const mathBp={...bp,blueprintId:"math-fixture",title:"CBSE Class 10 Mathematics (041)",subjectId:"mathematics",subjectTitle:"Mathematics",subjectCode:"041",sections:[{sectionId:"algebra",title:"Algebra",questionCount:1,totalMarks:1}],totalQuestions:1,totalMarks:1,slotPlan:[{slotId:"M1",questionNumber:1,sectionId:"algebra",marks:1,allowedTypes:["mcq"],chapterIds:["linear-equations"]}]};
const mathQuestion=q("math-q1","algebra",1,"mcq",{chapterId:"linear-equations",options:[{optionId:"A",text:"2"},{optionId:"B",text:"3"},{optionId:"C",text:"4"},{optionId:"D",text:"5"}],correctOptionId:"B"});
const mathBank={schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"mathematics",subjectCode:"041",academicYear:"2026-27",bankVersion:"math-test-1",questions:[mathQuestion]};
assert.equal(m.validateBlueprint(mathBp).valid,true);
assert.equal(m.validateQuestionBank(mathBank).valid,true);
assert.equal(m.validateQuestionBank(mathBank,{classId:"10",subjectId:"science"}).valid,false,"a bank from another subject must not be accepted");
const mathPaper=m.generatePaper(mathBp,mathBank,{seed:"math-subject-neutral"});
assert.equal(mathPaper.subjectId,"mathematics");
assert.equal(mathPaper.subjectCode,"041");
assert.equal(mathPaper.totalMarks,1);
assert.equal(m.validatePaper(mathPaper,mathBp).valid,true);
const mathPractice=m.adaptChapterMcqBank([{key:"linear-equations",title:"Linear Equations",questions:[{id:"math-practice-1",question:"Solve x + 2 = 5.",options:["2","3","4","5"],answer:1,explanation:"Subtract 2 from both sides.",competency:"application"}]}],mathBp);
assert.equal(mathPractice.subjectId,"mathematics");
assert.equal(mathPractice.questions.length,1);
assert.ok(mathPractice.questions[0].questionId.startsWith("EG10-MATHEMATICS-"));
assert.ok(m.normalizeStem("प्रकाश का परावर्तन").length>0,"duplicate-stem normalisation must preserve Indic-language text");
const mathTemplate=m.createQuestionBankTemplate({classId:"10",subjectId:"mathematics",subjectCode:"041",subjectTitle:"Mathematics"});
assert.equal(mathTemplate.subjectId,"mathematics");
assert.equal(mathTemplate.subjectCode,"041");


// Part-level internal choice and assessment-profile filtering are shared engine features.
const levelBp={schemaVersion:1,kind:"exam-paper-blueprint",blueprintId:"level-fixture",version:1,title:"Level fixture",academicYear:"2026-27",classId:"10",subjectId:"mathematics",subjectCode:"041",assessmentLevel:"standard",durationMinutes:180,totalQuestions:1,totalMarks:4,status:"ready",sections:[{sectionId:"E",title:"Section E",questionCount:1,totalMarks:4}],slotPlan:[{slotId:"E1",questionNumber:1,sectionId:"E",marks:4,allowedTypes:["case-based"],unitId:"geometry",chapterIds:["circles"],requiresPartInternalChoiceMarks:[2]}]};
function partChoiceQuestion(id,assessmentLevels=["standard"]){
 return q(id,"E",4,"case-based",{chapterId:"circles",unitId:"geometry",assessmentLevels,stimulus:"A circular park has a walking path around it.",parts:[
  {partId:"a",prompt:"State the relevant formula.",marks:1,answerKey:"Formula."},
  {partId:"b",prompt:"Give a relevant observation.",marks:1,answerKey:"Observation."},
  {partId:"c",prompt:"Find the area of the path.",marks:2,answerKey:"Area difference.",markingScheme:[{criterion:"Correct method and substitution",marks:1},{criterion:"Correct result with unit",marks:1}],alternatives:[{prompt:"Calculate the area using the other given radius.",answerKey:"Use the alternate radius and subtract areas.",markingScheme:[{criterion:"Correct alternate method",marks:1},{criterion:"Correct result with unit",marks:1}]}]}
 ]});
}
const partChoiceBank={schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"mathematics",academicYear:"2026-27",bankVersion:"part-choice-test",questions:[
 partChoiceQuestion("standard-1"),partChoiceQuestion("standard-2"),partChoiceQuestion("standard-3"),partChoiceQuestion("basic-only",["basic"])
]};
assert.equal(m.validateBlueprint(levelBp).valid,true);
assert.equal(m.validateQuestion(partChoiceQuestion("part-choice")).length,0,"part-level alternatives need valid answer keys and mark schemes");
const missingPartChoice=partChoiceQuestion("missing-choice");
missingPartChoice.parts[2].alternatives=[];
assert.ok(m.validateQuestion(missingPartChoice).length>0,"part alternatives cannot be empty");
const partCoverage=m.auditSlotCoverage(levelBp,partChoiceBank,3);
assert.equal(partCoverage.valid,true,partCoverage.errors.join(" "));
const partPaper=m.generatePaper(levelBp,partChoiceBank,{seed:"part-choice"});
assert.equal(m.validatePaper(partPaper,levelBp).valid,true);
assert.equal(partPaper.questions[0].parts[2].alternatives.length,1);
const basicBpForFilter={...levelBp,assessmentLevel:"basic",slotPlan:levelBp.slotPlan.map(slot=>({...slot,assessmentLevel:"basic"}))};
assert.equal(m.auditSlotCoverage(basicBpForFilter,partChoiceBank,1).valid,true,"level-tagged bank should allow Basic-only candidates for a Basic profile");
assert.equal(partCoverage.coverage[0].eligibleCount,3,"Standard coverage must exclude questions tagged only for Basic");

const productionBank=JSON.parse(fs.readFileSync("data/exam-papers/question-banks/class-10-science-2026-27-v1.json","utf8"));
const productionCoverage=m.auditSlotCoverage(production,productionBank,3);
assert.equal(productionCoverage.valid,true,productionCoverage.errors.join(" "));
assert.equal(productionCoverage.slotCount,39);
assert.equal(productionCoverage.questionCount, 565, "Science bank must contain 565 unique approved question records");
assert.ok(productionCoverage.coverage.every(slot=>slot.eligibleCount>=3),"every paper slot must have at least three eligible approved candidates");
assert.equal(m.validateQuestionBank(productionBank,{academicYear:"2026-27"}).valid,true);
const seenPapers=[];
for(let attempt=1;attempt<=6;attempt++){
 const recentQuestionIds=seenPapers.slice(-2).flatMap(ids=>ids);
 const generated=m.generatePaper(production,productionBank,{seed:"science-repeat-guard-"+attempt,recentQuestionIds});
 assert.equal(m.validatePaper(generated,production).valid,true);
 const currentIds=generated.questions.map(question=>question.questionId);
 assert.equal(new Set(currentIds).size,39,"a paper must not repeat a question internally");
 for(const previousIds of seenPapers.slice(-2)){
  assert.equal(currentIds.some(id=>previousIds.includes(id)),false,"a paper must not reuse any question from either of the previous two papers");
 }
 seenPapers.push(currentIds);
}
const selfStudySource=fs.readFileSync("js/exam-paper-self-study.js","utf8");
assert.ok(selfStudySource.includes('eg_exam_paper_history_v1'),"self-study should persist recent paper history locally");
assert.ok(selfStudySource.includes("profile-registry.json"),"self-study must load exam profiles from the registry");
assert.ok(selfStudySource.includes("mergeQuestionBanks(baseBank,practiceChapters,blueprint,{minimumCandidatesPerSlot:minimum})"),"self-study must merge an optional chapter-wise bank before profile-specific slot-coverage validation");
assert.ok(!selfStudySource.includes("class-10-science-2026-27"),"self-study must not hardcode the Science profile");
assert.ok(selfStudySource.includes("integrated.stats.coverage"),"self-study must validate minimum slot coverage on the integrated pool");
assert.ok(selfStudySource.includes('HISTORY_LIMIT=50'),"self-study should keep a rolling history of 50 complete papers");
assert.ok(selfStudySource.includes('generateUniquePaper'),"self-study should generate a previously unused full-paper combination");
assert.ok(selfStudySource.includes('recentPaperFingerprints'),"self-study should pass recent paper fingerprints to the generator");


// Social Science Step 3: enforce question-level non-repetition across the five
// immediately preceding papers, including every format represented in its blueprint.
const socialReadyBlueprint={...socialBlueprint,status:"ready"};
assert.equal(m.validateBlueprint(socialReadyBlueprint).readyForGeneration,true);
const socialCoverage=m.auditSlotCoverage(socialReadyBlueprint,socialBank,20);
assert.equal(socialCoverage.valid,true,socialCoverage.errors.join("; "));
assert.equal(socialCoverage.coverage.length,38);
assert.ok(socialCoverage.coverage.every(slot=>slot.eligibleCount>=20),"every Social Science slot must retain 20 approved candidates before repeat protection");
const socialPaperHistory=[],socialFingerprintHistory=[];
for(let attempt=1;attempt<=6;attempt++){
 const generated=m.generateUniquePaper(socialReadyBlueprint,socialBank,{
  seed:"social-science-five-paper-repeat-"+attempt,
  paperId:"social-science-step3-"+attempt,
  recentQuestionIdSets:socialPaperHistory.slice(-5),
  recentPaperFingerprints:socialFingerprintHistory.slice(-50)
 });
 assert.equal(m.validatePaper(generated,socialReadyBlueprint).valid,true);
 assert.equal(generated.questions.length,38);
 const currentIds=generated.questions.map(question=>String(question.questionId));
 assert.equal(new Set(currentIds).size,38,"a Social Science paper must not repeat a question internally");
 for(const previousIds of socialPaperHistory.slice(-5)){
  assert.equal(currentIds.some(id=>previousIds.includes(id)),false,"no question of any format may reappear in the preceding five papers");
 }
 assert.equal(generated.repeatProtection.requestedWindow,5);
 assert.equal(generated.repeatProtection.appliedWindow,5,"all five previous papers must remain protected when the eligible pools support it");
 socialPaperHistory.push(currentIds);
 socialFingerprintHistory.push(generated.paperFingerprint);
}
// Fallback is permitted only after a complete paper cannot be formed with the
// requested lookback; it must report the shorter window explicitly.
const fallbackPaper=m.generateUniquePaper(choiceBp,{...bank,questions:[choiceQ]},{
 seed:"repeat-window-fallback",recentQuestionIdSets:[["choice"]],recentPaperFingerprints:[]
});
assert.deepEqual(fallbackPaper.questions.map(question=>question.questionId),["choice"]);
assert.equal(fallbackPaper.repeatProtection.requestedWindow,5);
assert.equal(fallbackPaper.repeatProtection.appliedWindow,0);
assert.equal(fallbackPaper.repeatProtection.fallback,true);

const socialFormats=new Set(socialBank.questions.filter(q=>q.approvalStatus==="approved").map(q=>q.type));
for(const requiredType of ["mcq","assertion-reason","very-short-answer","short-answer","long-answer","case-based","diagram-based"]){
 assert.ok(socialFormats.has(requiredType),"the approved Social Science bank must include "+requiredType);
}
assert.equal(socialPaperHistory.length,6,"six complete papers must be generated to prove a five-paper lookback");

console.log("Exam paper generator tests passed: subject-neutral blueprints/banks, Maths fixture, language-safe MCQ adapter, draft guard, deterministic unique selection, approved-only eligibility, marks, sections, internal choices, slot coverage and repeat protection.");