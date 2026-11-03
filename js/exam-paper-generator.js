/* Provider-neutral, blueprint-driven CBSE paper generator. */
(() => {
"use strict";
const TYPES=Object.freeze(["mcq","assertion-reason","very-short-answer","short-answer","long-answer","case-based","numerical","diagram-based"]);
const DIFFICULTIES=["easy","medium","hard"];
const COMPETENCIES=["knowledge-understanding","application","analysis-evaluation-creation"];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const obj=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
const text=x=>typeof x==="string"&&!!x.trim();
const sum=a=>a.reduce((n,x)=>n+x,0);

function validateQuestion(q,path="question"){
 const e=[];if(!obj(q))return[path+" must be an object."];
 for(const key of ["questionId","sectionId","chapterId","prompt"])if(!text(q[key]))e.push(path+"."+key+" is required.");
 if(!TYPES.includes(q.type))e.push(path+".type is unsupported.");
 if(!Number.isInteger(q.marks)||q.marks<1||q.marks>10)e.push(path+".marks must be an integer from 1 to 10.");
 if(!DIFFICULTIES.includes(q.difficulty))e.push(path+".difficulty must be easy, medium or hard.");
 if(!COMPETENCIES.includes(q.competency))e.push(path+".competency is invalid.");
 if(!["draft","review","approved","rejected","retired"].includes(q.approvalStatus))e.push(path+".approvalStatus is invalid.");
 if(["mcq","assertion-reason"].includes(q.type)){
  if(!Array.isArray(q.options)||q.options.length<2)e.push(path+".options needs at least two options.");
  else{
   const ids=q.options.map(o=>String(o&&o.optionId||""));
   if(ids.some(x=>!x)||new Set(ids).size!==ids.length||!q.options.every(o=>o&&text(o.text)))e.push(path+".options must have unique IDs and non-empty text.");
   if(!ids.includes(String(q.correctOptionId||"")))e.push(path+".correctOptionId must reference an option.");
  }
 }
 if(q.type==="assertion-reason"&&!obj(q.assertionReason))e.push(path+".assertionReason metadata is required.");
 if(q.type==="case-based"&&(!text(q.stimulus)||!Array.isArray(q.parts)||!q.parts.length))e.push(path+" case-based questions need stimulus and parts.");
 if(Array.isArray(q.parts)&&q.parts.length){
  const ids=q.parts.map(p=>String(p&&p.partId||""));
  if(ids.some(x=>!x)||new Set(ids).size!==ids.length)e.push(path+".parts need unique IDs.");
  if(!q.parts.every(p=>p&&text(p.prompt)&&Number.isInteger(p.marks)&&p.marks>0))e.push(path+".parts need prompts and positive integer marks.");
  else if(sum(q.parts.map(p=>p.marks))!==q.marks)e.push(path+".parts marks must equal question marks.");
 }
 if(q.type==="numerical"&&!obj(q.answerKey))e.push(path+".answerKey is required for numerical questions.");
 if(q.images!=null){
  if(!Array.isArray(q.images))e.push(path+".images must be an array.");
  else q.images.forEach((image,i)=>{
   const src=String(image&&image.src||"").trim(),alt=String(image&&image.alt||"").trim();
   const relative=/^(?:\.\/)?[A-Za-z0-9._~!%()-]+(?:\/[A-Za-z0-9._~!%()-]+)*$/.test(src)&&!src.startsWith("//")&&!src.split("/").includes("..")&&!src.includes(":");
   if(!relative||!alt)e.push(path+".images["+i+"] needs a safe relative src and descriptive alt text.");
  });
 }
 if(q.type==="diagram-based"&&(!Array.isArray(q.images)||!q.images.length))e.push(path+".images is required for diagram-based questions.");
 if(Array.isArray(q.markingScheme)){
  if(!q.markingScheme.every(m=>m&&text(m.criterion)&&Number.isInteger(m.marks)&&m.marks>0))e.push(path+".markingScheme has invalid entries.");
  else if(sum(q.markingScheme.map(m=>m.marks))>q.marks)e.push(path+".markingScheme exceeds question marks.");
 }
 if(q.approvalStatus==="approved"){
  if(q.answerKey==null)e.push(path+".answerKey is required for approved questions.");
  if(!Array.isArray(q.markingScheme)||!q.markingScheme.length||!q.markingScheme.every(m=>m&&text(m.criterion)&&Number.isInteger(m.marks)&&m.marks>0)||sum(q.markingScheme.map(m=>Number(m.marks)||0))!==q.marks)e.push(path+".approved question markingScheme must total exactly the question marks.");
 }
 if(q.alternatives!=null){
  if(!Array.isArray(q.alternatives))e.push(path+".alternatives must be an array.");
  else q.alternatives.forEach((a,i)=>{
   if(!obj(a)||!text(a.prompt))e.push(path+".alternatives["+i+"] needs a prompt.");
   if(a&&Array.isArray(a.parts)&&a.parts.length&&a.parts.every(p=>Number.isInteger(p.marks))&&sum(a.parts.map(p=>p.marks))!==q.marks)e.push(path+".alternatives["+i+"] parts marks must equal question marks.");
   if(q.approvalStatus==="approved"){
    if(!a||a.answerKey==null)e.push(path+".alternatives["+i+"] needs an answerKey.");
    if(!a||!Array.isArray(a.markingScheme)||!a.markingScheme.length||!a.markingScheme.every(m=>m&&text(m.criterion)&&Number.isInteger(m.marks)&&m.marks>0)||sum((a&&a.markingScheme||[]).map(m=>Number(m.marks)||0))!==q.marks)e.push(path+".alternatives["+i+"] markingScheme must total exactly the question marks.");
   }
  });
 }
 return e;
}
function validateQuestionBank(bank,expected={}){
 const e=[];
 if(!obj(bank)||bank.schemaVersion!==1||bank.kind!=="exam-paper-question-bank")return{valid:false,errors:["Expected exam-paper-question-bank schemaVersion 1."]};
 if(String(bank.classId)!=="10"||bank.subjectId!=="science")e.push("This release accepts Class 10 Science banks only.");
 if(!text(bank.bankVersion))e.push("bankVersion is required.");
 if(!Array.isArray(bank.questions))e.push("questions must be an array.");
 if(expected.academicYear&&bank.academicYear!==expected.academicYear)e.push("Question bank academic year does not match.");
 if(Array.isArray(bank.questions)){
  const ids=new Set();
  bank.questions.forEach((q,i)=>{e.push(...validateQuestion(q,"questions["+i+"]"));const id=String(q&&q.questionId||"");if(id&&ids.has(id))e.push("Duplicate questionId: "+id);if(id)ids.add(id);});
 }
 return{valid:e.length===0,errors:e};
}
function expandSlotPlan(bp){
 const out=[];(bp.slotPlan||[]).forEach((r,i)=>{for(let n=0;n<Number(r.count||1);n++)out.push({...clone(r),slotId:r.count>1?String(r.slotId)+"-"+(n+1):String(r.slotId||"slot-"+(i+1)),count:undefined});});return out;
}
function validateBlueprint(bp){
 const e=[];if(!obj(bp)||bp.schemaVersion!==1||bp.kind!=="exam-paper-blueprint")return{valid:false,readyForGeneration:false,errors:["Expected exam-paper-blueprint schemaVersion 1."]};
 if(!text(bp.blueprintId)||!text(bp.academicYear))e.push("Blueprint identity and academicYear are required.");
 if(String(bp.classId)!=="10"||bp.subjectId!=="science")e.push("This release supports Class 10 Science only.");
 if(!Number.isInteger(bp.durationMinutes)||bp.durationMinutes<1)e.push("durationMinutes must be positive.");
 if(!Number.isInteger(bp.totalQuestions)||bp.totalQuestions<1||!Number.isInteger(bp.totalMarks)||bp.totalMarks<1)e.push("Blueprint totals must be positive integers.");
 if(!Array.isArray(bp.sections)||!bp.sections.length)e.push("Blueprint sections are required.");
 const ids=new Set();(bp.sections||[]).forEach(s=>{if(!text(s.sectionId)||ids.has(s.sectionId))e.push("Section IDs must be unique.");ids.add(s.sectionId);if(!Number.isInteger(s.questionCount)||s.questionCount<1||!Number.isInteger(s.totalMarks)||s.totalMarks<1)e.push("Each section needs positive questionCount and totalMarks.");});
 const sections=bp.sections||[];
 if(sections.length&&sum(sections.map(s=>Number(s.totalMarks)||0))!==bp.totalMarks)e.push("Section marks do not add up to blueprint total.");
 if(sections.length&&sum(sections.map(s=>Number(s.questionCount)||0))!==bp.totalQuestions)e.push("Section question counts do not add up to blueprint total.");
 if(!["draft","ready","retired"].includes(bp.status))e.push("Blueprint status is invalid.");
 const slots=expandSlotPlan(bp);
 if(bp.status==="ready"){
  if(slots.length!==bp.totalQuestions)e.push("Ready blueprint must define every question slot.");
  const totals=new Map(),numbers=new Set(),units=new Map(),competencies=new Map();
  slots.forEach(s=>{
   if(!ids.has(s.sectionId))e.push("Slot "+s.slotId+" has an unknown section.");
   if(!Number.isInteger(s.marks)||s.marks<1)e.push("Slot "+s.slotId+" needs positive marks.");
   if(!Array.isArray(s.allowedTypes)||!s.allowedTypes.length||!s.allowedTypes.every(t=>TYPES.includes(t)))e.push("Slot "+s.slotId+" needs supported allowedTypes.");
   if(s.questionNumber!=null){if(!Number.isInteger(s.questionNumber)||s.questionNumber<1||s.questionNumber>bp.totalQuestions||numbers.has(s.questionNumber))e.push("Slot question numbers must be unique integers within the paper.");numbers.add(s.questionNumber);}
   const r=totals.get(s.sectionId)||{count:0,marks:0};r.count++;r.marks+=Number(s.marks)||0;totals.set(s.sectionId,r);
   if(bp.unitMarkTargets){if(!text(s.unitId))e.push("Slot "+s.slotId+" needs unitId.");units.set(s.unitId,(units.get(s.unitId)||0)+s.marks);}
   if(bp.competencyMarksTargets){if(!COMPETENCIES.includes(s.competency))e.push("Slot "+s.slotId+" needs a valid competency.");competencies.set(s.competency,(competencies.get(s.competency)||0)+s.marks);}
  });
  if(numbers.size&&numbers.size!==bp.totalQuestions)e.push("Ready blueprint must number every question slot.");
  sections.forEach(s=>{const r=totals.get(s.sectionId)||{count:0,marks:0};if(r.count!==s.questionCount)e.push(s.sectionId+" slot count mismatch.");if(r.marks!==s.totalMarks)e.push(s.sectionId+" marks mismatch.");});
  if(sum(slots.map(s=>Number(s.marks)||0))!==bp.totalMarks)e.push("Slot marks do not add up to blueprint total.");
  for(const [field,actual] of [["unitMarkTargets",units],["competencyMarksTargets",competencies]]){
   const targets=bp[field];if(targets){if(!obj(targets)||sum(Object.values(targets).map(Number))!==bp.totalMarks)e.push(field+" must total the paper marks.");else for(const [key,value] of Object.entries(targets))if((actual.get(key)||0)!==Number(value))e.push(field+" mismatch for "+key+".");}
  }
 }
 return{valid:e.length===0,readyForGeneration:e.length===0&&bp.status==="ready",errors:e,slots};
}
function seedRandom(seed){
 let h=2166136261;for(const c of String(seed??"examguru")){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 let x=h>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function eligible(q,s){
 return q.approvalStatus==="approved"&&q.sectionId===s.sectionId&&q.marks===s.marks&&s.allowedTypes.includes(q.type)&&
 (!s.competency||q.competency===s.competency)&&(!s.difficulty||q.difficulty===s.difficulty)&&
 (!s.chapterIds||!s.chapterIds.length||s.chapterIds.includes(q.chapterId))&&
 (!s.unitId||q.unitId===s.unitId)&&
 (!s.requiresInternalChoice||(Array.isArray(q.alternatives)&&q.alternatives.length>0))&&
 (!s.topicTags||!s.topicTags.length||s.topicTags.every(t=>(q.topicTags||[]).includes(t)));
}
function auditSlotCoverage(bp,bank,minimumCandidatesPerSlot=3){
 const bc=validateBlueprint(bp),qc=validateQuestionBank(bank,{academicYear:bp&&bp.academicYear});
 const errors=[];
 if(!bc.valid)errors.push(...bc.errors);
 if(!qc.valid)errors.push(...qc.errors);
 const slots=Array.isArray(bc.slots)?bc.slots:[];
 const coverage=slots.map(s=>({slotId:s.slotId,questionNumber:s.questionNumber,sectionId:s.sectionId,marks:s.marks,eligibleCount:Array.isArray(bank&&bank.questions)?bank.questions.filter(q=>eligible(q,s)).length:0}));
 if(!Number.isInteger(minimumCandidatesPerSlot)||minimumCandidatesPerSlot<1)errors.push("minimumCandidatesPerSlot must be a positive integer.");
 coverage.forEach(s=>{if(s.eligibleCount<minimumCandidatesPerSlot)errors.push("Slot "+s.slotId+" has "+s.eligibleCount+" eligible approved questions; "+minimumCandidatesPerSlot+" required.");});
 return{valid:errors.length===0,minimumCandidatesPerSlot,slotCount:slots.length,questionCount:Array.isArray(bank&&bank.questions)?bank.questions.length:0,coverage,errors};
}
function generatePaper(bp,bank,options={}){
 const bc=validateBlueprint(bp);if(!bc.valid)throw Error("Invalid blueprint: "+bc.errors.join(" "));
 if(!bc.readyForGeneration)throw Error("Paper generation is locked: blueprint is not approved for generation.");
 const qc=validateQuestionBank(bank,{academicYear:bp.academicYear});if(!qc.valid)throw Error("Invalid question bank: "+qc.errors.join(" "));
 const recent=new Set((options.recentQuestionIds||[]).map(String)),rand=seedRandom(options.seed||"examguru-paper");
 const slots=bc.slots.map((s,i)=>({...s,_position:i,_candidates:shuffle(bank.questions.filter(q=>eligible(q,s)&&!recent.has(String(q.questionId))),rand)}));
 const empty=slots.filter(s=>!s._candidates.length);if(empty.length)throw Error("Question pool shortage: "+empty.map(s=>s.slotId+" ("+s.sectionId+", "+s.marks+" marks)").join("; "));
 const order=slots.slice().sort((a,b)=>a._candidates.length-b._candidates.length||a._position-b._position),used=new Set(),selected=new Map();let tries=0;const max=options.maxSearchAttempts||250000;
 function walk(i){if(i>=order.length)return true;if(++tries>max)return false;const slot=order[i];for(const q of slot._candidates){const id=String(q.questionId);if(used.has(id))continue;used.add(id);selected.set(slot._position,q);if(walk(i+1))return true;selected.delete(slot._position);used.delete(id);}return false;}
 if(!walk(0))throw Error(tries>max?"Selection exceeded its search budget; increase the approved pool.":"No complete unique paper can be assembled from the approved pool.");
 const chosen=slots.sort((a,b)=>a._position-b._position).map((s,i)=>({...clone(selected.get(s._position)),paperQuestionNumber:i+1,slotId:s.slotId,marks:s.marks}));
 const sections=bp.sections.map(s=>{const qs=chosen.filter(q=>q.sectionId===s.sectionId);return{sectionId:s.sectionId,title:s.title,questionCount:qs.length,totalMarks:sum(qs.map(q=>q.marks))};});
 const paper={schemaVersion:1,kind:"exam-paper-snapshot",paperId:String(options.paperId||("paper-"+Math.abs(hashCode(String(options.seed||Date.now())+bp.blueprintId)).toString(36))),title:options.title||bp.title,blueprintId:bp.blueprintId,blueprintVersion:bp.version,academicYear:bp.academicYear,classId:bp.classId,subjectId:bp.subjectId,subjectCode:bp.subjectCode||null,durationMinutes:bp.durationMinutes,totalQuestions:chosen.length,totalMarks:sum(chosen.map(q=>q.marks)),seed:String(options.seed||"examguru-paper"),generatedAt:options.generatedAt||new Date().toISOString(),sourceBankVersion:bank.bankVersion,blueprintSnapshot:clone(bp),sectionResults:sections,questions:chosen};
 const pc=validatePaper(paper,bp);if(!pc.valid)throw Error("Generated paper failed validation: "+pc.errors.join(" "));return paper;
}
function paperFingerprint(paper){
 if(!paper||!Array.isArray(paper.questions))return "";
 const questions=paper.questions.slice().sort((a,b)=>Number(a.paperQuestionNumber||0)-Number(b.paperQuestionNumber||0));
 return JSON.stringify(questions.map(q=>String(q.questionId||"")));
}
function generateUniquePaper(bp,bank,options={}){
 const recent=new Set((options.recentPaperFingerprints||[]).map(String).filter(Boolean));
 const attempts=Number.isInteger(options.uniqueSearchAttempts)&&options.uniqueSearchAttempts>0?Math.min(options.uniqueSearchAttempts,5000):250;
 const baseSeed=String(options.seed||("examguru-paper-"+Date.now()));
 for(let i=0;i<attempts;i++){
  const paper=generatePaper(bp,bank,{...options,seed:baseSeed+"-"+i,recentQuestionIds:Array.isArray(options.recentQuestionIds)?options.recentQuestionIds:[]});
  const fingerprint=paperFingerprint(paper);
  if(fingerprint&&!recent.has(fingerprint)){paper.paperFingerprint=fingerprint;return paper;}
 }
 throw Error("Could not generate a paper combination distinct from the last 50 attempts. Review or expand the approved question pool.");
}
function hashCode(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return h;}
function validatePaper(p,bp){
 const e=[];if(!obj(p)||p.kind!=="exam-paper-snapshot")return{valid:false,errors:["Invalid paper snapshot."]};
 if(!Array.isArray(p.questions))return{valid:false,errors:["Paper questions missing."]};
 const ids=p.questions.map(q=>String(q.questionId||""));if(ids.some(x=>!x)||new Set(ids).size!==ids.length)e.push("Paper question IDs are missing or duplicated.");
 if(p.questions.length!==p.totalQuestions)e.push("Paper question count is inconsistent.");
 if(sum(p.questions.map(q=>Number(q.marks)||0))!==p.totalMarks)e.push("Paper total marks are inconsistent.");
 if(bp){
  if(p.blueprintId!==bp.blueprintId)e.push("Blueprint ID mismatch.");
  if(p.questions.length!==bp.totalQuestions)e.push("Blueprint question count mismatch.");
  if(p.totalMarks!==bp.totalMarks)e.push("Blueprint total marks mismatch.");
  (bp.sections||[]).forEach(s=>{const a=p.questions.filter(q=>q.sectionId===s.sectionId);if(a.length!==s.questionCount)e.push(s.sectionId+" question count mismatch.");if(sum(a.map(q=>Number(q.marks)||0))!==s.totalMarks)e.push(s.sectionId+" marks mismatch.");});
  const slots=expandSlotPlan(bp),byId=new Map(slots.map(s=>[s.slotId,s])),seen=new Set();
  p.questions.forEach(q=>{
   const slot=byId.get(q.slotId);if(!slot){e.push("Unknown slot "+q.slotId);return;}
   if(seen.has(q.slotId))e.push("Duplicate slot "+q.slotId);seen.add(q.slotId);
   if(q.paperQuestionNumber!==slot.questionNumber)e.push("Question number mismatch for "+q.slotId+".");
   if(q.sectionId!==slot.sectionId||q.marks!==slot.marks)e.push("Section or marks mismatch for "+q.slotId+".");
   if(!slot.allowedTypes.includes(q.type))e.push("Question type mismatch for "+q.slotId+".");
   if(slot.unitId&&q.unitId!==slot.unitId)e.push("Unit mismatch for "+q.slotId+".");
   if(slot.competency&&q.competency!==slot.competency)e.push("Competency mismatch for "+q.slotId+".");
   if(slot.requiresInternalChoice&&(!Array.isArray(q.alternatives)||!q.alternatives.length))e.push("Internal choice missing for "+q.slotId+".");
  });
  if(seen.size!==bp.totalQuestions)e.push("Paper does not fill every blueprint slot.");
  for(const [field,key] of [["unitMarkTargets","unitId"],["competencyMarksTargets","competency"]]){
   const target=bp[field];if(target){const totals=new Map();p.questions.forEach(q=>totals.set(q[key],(totals.get(q[key])||0)+q.marks));for(const [k,v] of Object.entries(target))if((totals.get(k)||0)!==Number(v))e.push("Generated paper "+field+" mismatch for "+k+".");}
  }
  if(bp.markDistribution){const totals=new Map();p.questions.forEach(q=>totals.set(q.marks,(totals.get(q.marks)||0)+1));for(const [marks,count] of Object.entries(bp.markDistribution))if((totals.get(Number(marks))||0)!==Number(count))e.push("Generated paper mark distribution mismatch for "+marks+" marks.");}
 }
 return{valid:e.length===0,errors:e};
}
function createQuestionBankTemplate(){return{schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"science",academicYear:"2026-27",bankVersion:"draft-1",title:"Class 10 Science mixed-question pool",questions:[{questionId:"SCI10-BIO-EXAMPLE-001",sectionId:"biology",chapterId:"life-processes",topicTags:["nutrition"],type:"short-answer",marks:2,prompt:"Replace this with an original, syllabus-eligible question.",difficulty:"medium",competency:"application",approvalStatus:"draft",markingScheme:[{criterion:"First marking point",marks:1},{criterion:"Second marking point",marks:1}],answerKey:{modelAnswer:"Replace with an accurate model answer."},source:{type:"original",reference:"Author/reviewer details"}}]};}

function normalizeCompetency(value){
 const v=String(value||"").trim().toLowerCase().replace(/[_\s]+/g,"-");
 if(["knowledge-understanding","knowledge","understanding","recall"].includes(v))return"knowledge-understanding";
 if(["application","apply"].includes(v))return"application";
 if(["analysis-evaluation-creation","analysis","evaluation","creation","analyze","analyse"].includes(v))return"analysis-evaluation-creation";
 return"";
}
function inferMcqCompetency(question){
 const explicit=normalizeCompetency(question&&(
  question.competency||question.competencyLevel||question.competencyTag
 ));
 if(explicit)return{competency:explicit,method:"source-metadata"};
 const prompt=String(question&&(question.question||question.prompt||question.text)||"").toLowerCase();
 const explanation=String(question&&(question.explanation||question.rationale)||"").toLowerCase();
 const combined=prompt+" "+explanation;
 if(/\b(analy[sz]e|evaluate|assess|interpret|infer|compare|contrast|conclude|conclusion|justify|evidence|trend|data set|graph|which statement is best supported|most reasonable inference|best explains the observation)\b/.test(combined)){
  return{competency:"analysis-evaluation-creation",method:"prompt-rule-inference"};
 }
 if(/\b(calculate|compute|apply|predict|what happens if|what would happen|determine the value|identify the result|in an experiment|experimental setup|a student|a farmer|a person|a shopkeeper|a scientist|a technician|in a circuit|given that|when the object|when a ray|if the temperature|if the resistance|which change would)\b/.test(prompt)){
  return{competency:"application",method:"prompt-rule-inference"};
 }
 return{competency:"knowledge-understanding",method:"prompt-rule-inference"};
}
function normalisePracticeDifficulty(value){
 const v=String(value||"medium").trim().toLowerCase();
 if(v==="easy"||v==="medium"||v==="hard")return v;
 if(v.includes("easy")||v.includes("basic"))return"easy";
 if(v.includes("hard")||v.includes("challenging")||v.includes("difficult"))return"hard";
 return"medium";
}
function normalizeStem(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function adaptPracticeMcqBank(practiceChapters,bp){
 if(!Array.isArray(practiceChapters))throw Error("The shared Science practice bank must be a chapter array.");
 const blueprintCheck=validateBlueprint(bp);
 if(!blueprintCheck.valid||!blueprintCheck.readyForGeneration)throw Error("Cannot map practice MCQs until the Science blueprint is valid and ready.");
 const slotRows=bp.slotPlan||[];
 const chapterIds=[...new Set(slotRows.flatMap(s=>Array.isArray(s.chapterIds)?s.chapterIds:[]))];
 const questions=[],excluded={outOfSummativeScope:0,ambiguousChapter:0,invalidQuestion:0,unsupportedCompetency:0},invalidReasons={missingPrompt:0,optionCount:0,emptyOptionText:0,duplicateOptionIds:0,badAnswer:0,missingExplanation:0,emptyStem:0,duplicateSourceId:0,duplicateSourceStem:0};
 const byChapter={},byCompetency={"knowledge-understanding":0,"application":0,"analysis-evaluation-creation":0};
 const usedIds=new Set(),usedStems=new Set();
 const slug=value=>String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
 practiceChapters.forEach((chapter,chapterIndex)=>{
  const rawKey=String(chapter&&(chapter.key||chapter.chapterKey)||"").trim();
  const title=String(chapter&&chapter.title||"").trim();
  const keys=[rawKey,slug(rawKey),slug(title)].filter(Boolean);
  const chapterId=chapterIds.find(id=>keys.includes(id))||chapterIds.find(id=>keys.some(key=>key.endsWith("-"+id)||key.startsWith(id+"-")));
  if(!chapterId){excluded.outOfSummativeScope+=(Array.isArray(chapter&&chapter.questions)?chapter.questions.length:0);return;}
  const related=slotRows.filter(s=>(s.chapterIds||[]).includes(chapterId));
  const sections=[...new Set(related.map(s=>s.sectionId))],units=[...new Set(related.map(s=>s.unitId))];
  if(sections.length!==1||units.length!==1){excluded.ambiguousChapter+=(Array.isArray(chapter.questions)?chapter.questions.length:0);return;}
  byChapter[chapterId]=0;
  (chapter.questions||[]).forEach((q,questionIndex)=>{
   const prompt=String(q&&(q.question||q.prompt||q.text)||"").trim();
   const stem=normalizeStem(prompt);
   const opts=Array.isArray(q&&q.options)?q.options.map((option,index)=>({
    optionId:String(option&&typeof option==="object"?(option.optionId||String.fromCharCode(65+index)):String.fromCharCode(65+index)),
    text:String(option&&typeof option==="object"?(option.text||""):option||"").trim()
   })):[];
   let answer=Number(q&&(q.answer??q.correctAnswer??q.correctOption));
   if(!Number.isInteger(answer)&&typeof (q&&q.answer)==="string"){
    const a=String(q.answer).trim().toUpperCase();if(/^[A-D]$/.test(a))answer=a.charCodeAt(0)-65;
   }
   const qid=String(q&&(q.questionId??q.id)||("chapter-"+(chapterIndex+1)+"-q-"+(questionIndex+1)));
   const id="SCI10-PRACTICE-MCQ-"+chapterId+"-"+qid.replace(/[^A-Za-z0-9._-]+/g,"-");
   let invalid=false;
   if(!prompt){invalidReasons.missingPrompt++;invalid=true;}
   if(opts.length!==4){invalidReasons.optionCount++;invalid=true;}
   if(opts.some(o=>!o.text)){invalidReasons.emptyOptionText++;invalid=true;}
   if(new Set(opts.map(o=>o.optionId)).size!==4){invalidReasons.duplicateOptionIds++;invalid=true;}
   if(!Number.isInteger(answer)||answer<0||answer>=4){invalidReasons.badAnswer++;invalid=true;}
   if(!String(q&&(q.explanation||q.rationale)||"").trim()){invalidReasons.missingExplanation++;invalid=true;}
   if(!stem){invalidReasons.emptyStem++;invalid=true;}
   if(usedIds.has(id)){invalidReasons.duplicateSourceId++;invalid=true;}
   if(usedStems.has(stem)){invalidReasons.duplicateSourceStem++;invalid=true;}
   if(invalid){excluded.invalidQuestion++;return;}
   const tagged=inferMcqCompetency(q);
   if(!COMPETENCIES.includes(tagged.competency)){excluded.unsupportedCompetency++;return;}
   usedIds.add(id);usedStems.add(stem);
   const correct=opts[answer],letter=String(correct.optionId);
   const question={
    questionId:id,sectionId:sections[0],chapterId,unitId:units[0],topicTags:["mcq","practice-bank",chapterId],
    type:"mcq",marks:1,prompt,difficulty:normalisePracticeDifficulty(q.difficulty),
    competency:tagged.competency,competencyTagMethod:tagged.method,approvalStatus:"approved",
    options:opts,correctOptionId:correct.optionId,
    answerKey:{modelAnswer:letter+". "+correct.text,explanation:String(q.explanation||q.rationale).trim()},
    markingScheme:[{criterion:"Correct option selected: "+letter,marks:1}],
    source:{type:"practice-bank",reference:"Existing Class 10 Science chapter-wise MCQ bank · "+title+" · "+qid}
   };
   if(Array.isArray(q.images)&&q.images.length)question.images=clone(q.images);
   questions.push(question);byChapter[chapterId]++;byCompetency[tagged.competency]++;
  });
 });
 return{
  schemaVersion:1,kind:"exam-paper-question-bank",classId:"10",subjectId:"science",academicYear:bp.academicYear,
  bankVersion:"science-practice-mcqs-v1",title:"Existing Class 10 Science chapter-wise MCQs adapted for Exam Paper Studio",
  questionPoolStatus:"shared-practice-bank-adapter",questions,
  adapterStats:{sourceChapterCount:practiceChapters.length,importedCount:questions.length,excluded,invalidReasons,byChapter,byCompetency}
 };
}
function mergeQuestionBanks(baseBank,practiceChapters,bp){
 const baseCheck=validateQuestionBank(baseBank,{academicYear:bp&&bp.academicYear});
 if(!baseCheck.valid)throw Error("Base exam-paper bank is invalid: "+baseCheck.errors.slice(0,5).join(" "));
 const adapted=adaptPracticeMcqBank(practiceChapters,bp);
 const merged=clone(baseBank),ids=new Set(),stems=new Set();
 (merged.questions||[]).forEach(q=>{ids.add(String(q.questionId));stems.add(normalizeStem(q.prompt));});
 let appended=0,duplicateIds=0,duplicateStems=0;
 adapted.questions.forEach(q=>{
  if(ids.has(q.questionId)){duplicateIds++;return;}
  const stem=normalizeStem(q.prompt);
  if(stems.has(stem)){duplicateStems++;return;}
  ids.add(q.questionId);stems.add(stem);merged.questions.push(q);appended++;
 });
 merged.bankVersion=String(baseBank.bankVersion)+"+shared-science-mcqs-v1";
 merged.title=String(baseBank.title||"Class 10 Science paper pool")+" + existing chapter-wise practice MCQs";
 merged.questionPoolStatus="shared-practice-and-exam-paper-pool";
 const check=validateQuestionBank(merged,{academicYear:bp&&bp.academicYear});
 if(!check.valid)throw Error("Integrated Science question pool is invalid: "+check.errors.slice(0,8).join(" "));
 const coverage=auditSlotCoverage(bp,merged,3);
 if(!coverage.valid)throw Error("Integrated Science pool does not meet the minimum slot coverage: "+coverage.errors.slice(0,8).join(" "));
 return{bank:merged,stats:{practiceSourceCount:adapted.questions.length,appended,duplicateIds,duplicateStems,excluded:adapted.adapterStats.excluded,invalidReasons:adapted.adapterStats.invalidReasons,byChapter:adapted.adapterStats.byChapter,byCompetency:adapted.adapterStats.byCompetency,coverage}};
}

window.C10ExamPaperGenerator=Object.freeze({schemaVersion:1,questionTypes:TYPES,difficulties:DIFFICULTIES,competencies:COMPETENCIES,validateQuestion,validateQuestionBank,validateBlueprint,expandSlotPlan,auditSlotCoverage,generatePaper,paperFingerprint,generateUniquePaper,validatePaper,createQuestionBankTemplate,normalizeCompetency,inferMcqCompetency,adaptPracticeMcqBank,mergeQuestionBanks});
})();