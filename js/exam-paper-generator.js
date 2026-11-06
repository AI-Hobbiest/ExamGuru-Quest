/* Provider-neutral, blueprint-driven CBSE paper generator. */
(() => {
"use strict";
const TYPES=Object.freeze(["mcq","assertion-reason","very-short-answer","short-answer","long-answer","case-based","numerical","diagram-based"]);
const DIFFICULTIES=["easy","medium","hard"];
const COMPETENCIES=["knowledge-understanding","application","analysis-evaluation-creation","map-skill"];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const obj=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
const text=x=>typeof x==="string"&&!!x.trim();
const sum=a=>a.reduce((n,x)=>n+x,0);

function validateQuestion(q,path="question"){
 const e=[];if(!obj(q))return[path+" must be an object."];
 for(const key of ["questionId","sectionId","chapterId","prompt"])if(!text(q[key]))e.push(path+"."+key+" is required.");
 if(!TYPES.includes(q.type))e.push(path+".type is unsupported.");
 if(!Number.isInteger(q.marks)||q.marks<1||q.marks>20)e.push(path+".marks must be an integer from 1 to 20.");
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
  else if(q.attemptAny==null&&sum(q.parts.map(p=>p.marks))!==q.marks)e.push(path+".parts marks must equal question marks.");
  q.parts.forEach((part,partIndex)=>{
   if(part&&part.options!=null){
    const options=part.options,optionIds=Array.isArray(options)?options.map(o=>String(o&&o.optionId||"")):[];
    if(!Array.isArray(options)||options.length<2||optionIds.some(x=>!x)||new Set(optionIds).size!==optionIds.length||!options.every(o=>o&&text(o.text)))e.push(path+".parts["+partIndex+"].options must contain at least two uniquely identified non-empty options.");
    else if(!optionIds.includes(String(part.correctOptionId||"")))e.push(path+".parts["+partIndex+"].correctOptionId must reference a part option.");
    if(q.approvalStatus==="approved"&&(!part.answerKey||!Array.isArray(part.markingScheme)||!part.markingScheme.length||sum((part.markingScheme||[]).map(m=>Number(m&&m.marks)||0))!==Number(part.marks)))e.push(path+".parts["+partIndex+"] needs an answerKey and a markingScheme matching its marks.");
   }
   if(part&&part.alternatives!=null){
    const alternativesPath=path+".parts["+partIndex+"].alternatives";
    if(!Array.isArray(part.alternatives)||!part.alternatives.length)e.push(alternativesPath+" must be a non-empty array.");
    else part.alternatives.forEach((alternative,alternativeIndex)=>{
     const itemPath=alternativesPath+"["+alternativeIndex+"]";
     if(!obj(alternative)||!text(alternative.prompt))e.push(itemPath+" needs a prompt.");
     if(q.approvalStatus==="approved"){
      if(!alternative||alternative.answerKey==null)e.push(itemPath+" needs an answerKey.");
      const scheme=alternative&&alternative.markingScheme;
      if(!Array.isArray(scheme)||!scheme.length||!scheme.every(m=>m&&text(m.criterion)&&Number.isInteger(m.marks)&&m.marks>0)||sum((scheme||[]).map(m=>Number(m.marks)||0))!==Number(part.marks))e.push(itemPath+" markingScheme must total exactly the part marks.");
     }
    });
   }
  });
 }
 if(q.attemptAny!=null){
  const attemptParts=Array.isArray(q.parts)?q.parts:[];
  if(!attemptParts.length)e.push(path+".attemptAny requires a non-empty parts array.");
  else if(!Number.isInteger(q.attemptAny)||q.attemptAny<1||q.attemptAny>attemptParts.length)e.push(path+".attemptAny must be a positive count not greater than the available parts.");
  else if(!attemptParts.every(p=>Number.isInteger(p&&p.marks)&&p.marks>0))e.push(path+".attemptAny parts must have positive integer marks.");
  else{const partMarks=[...new Set(attemptParts.map(p=>Number(p.marks)))];if(partMarks.length!==1||Number(q.marks)!==Number(q.attemptAny)*partMarks[0])e.push(path+".marks must equal attemptAny multiplied by the common part mark value.");}
 }
 if(q.assessmentLevels!=null){
  if(!Array.isArray(q.assessmentLevels)||!q.assessmentLevels.length||!q.assessmentLevels.every(level=>text(level))||new Set(q.assessmentLevels).size!==q.assessmentLevels.length)e.push(path+".assessmentLevels must be a non-empty list of unique labels.");
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
   if(a&&Array.isArray(a.parts)&&a.parts.length){
     const altPartIds=a.parts.map(p=>String(p&&p.partId||""));
     if(altPartIds.some(id=>!id)||new Set(altPartIds).size!==altPartIds.length)e.push(path+".alternatives["+i+"] parts need unique IDs.");
     if(!a.parts.every(p=>p&&text(p.prompt)&&Number.isInteger(p.marks)&&p.marks>0))e.push(path+".alternatives["+i+"] parts need prompts and positive integer marks.");
     else if(sum(a.parts.map(p=>p.marks))!==q.marks)e.push(path+".alternatives["+i+"] parts marks must equal question marks.");
     a.parts.forEach((part,partIndex)=>{
      if(part&&part.options!=null){
       const options=part.options,optionIds=Array.isArray(options)?options.map(o=>String(o&&o.optionId||"")):[];
       if(!Array.isArray(options)||options.length<2||optionIds.some(id=>!id)||new Set(optionIds).size!==optionIds.length||!options.every(o=>o&&text(o.text)))e.push(path+".alternatives["+i+"].parts["+partIndex+"].options must contain at least two uniquely identified non-empty options.");
       else if(!optionIds.includes(String(part.correctOptionId||"")))e.push(path+".alternatives["+i+"].parts["+partIndex+"].correctOptionId must reference a part option.");
       if(q.approvalStatus==="approved"&&(!part.answerKey||!Array.isArray(part.markingScheme)||!part.markingScheme.length||sum((part.markingScheme||[]).map(m=>Number(m&&m.marks)||0))!==Number(part.marks)))e.push(path+".alternatives["+i+"].parts["+partIndex+"] needs a matching answerKey and markingScheme.");
      }
     });
    }
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
 if(!text(String(bank.classId??"")))e.push("classId is required.");
 if(!text(bank.subjectId)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(bank.subjectId)))e.push("subjectId must be a stable alphanumeric slug.");
 if(!text(bank.bankVersion))e.push("bankVersion is required.");
 if(!Array.isArray(bank.questions))e.push("questions must be an array.");
 if(expected.classId!=null&&String(bank.classId)!==String(expected.classId))e.push("Question bank class does not match the blueprint.");
 if(expected.subjectId&&String(bank.subjectId)!==String(expected.subjectId))e.push("Question bank subject does not match the blueprint.");
 if(expected.academicYear&&bank.academicYear!==expected.academicYear)e.push("Question bank academic year does not match.");
 if(Array.isArray(bank.questions)){
  const ids=new Set(),contentIds=new Set();
  bank.questions.forEach((q,i)=>{
   e.push(...validateQuestion(q,"questions["+i+"]"));
   const id=String(q&&q.questionId||"");
   if(id&&ids.has(id))e.push("Duplicate questionId: "+id);
   if(id)ids.add(id);
   questionContentIds(q).forEach(contentId=>{
    if(contentIds.has(contentId))e.push("Duplicate question content ID: "+contentId);
    contentIds.add(contentId);
   });
  });
 }
 return{valid:e.length===0,errors:e};
}
function expandSlotPlan(bp){
 const out=[];(bp.slotPlan||[]).forEach((r,i)=>{for(let n=0;n<Number(r.count||1);n++)out.push({...clone(r),slotId:r.count>1?String(r.slotId)+"-"+(n+1):String(r.slotId||"slot-"+(i+1)),assessmentLevel:r.assessmentLevel||bp.assessmentLevel||null,count:undefined});});return out;
}
function validateBlueprint(bp){
 const e=[];if(!obj(bp)||bp.schemaVersion!==1||bp.kind!=="exam-paper-blueprint")return{valid:false,readyForGeneration:false,errors:["Expected exam-paper-blueprint schemaVersion 1."]};
 if(!text(bp.blueprintId)||!text(bp.academicYear))e.push("Blueprint identity and academicYear are required.");
 if(!text(String(bp.classId??"")))e.push("Blueprint classId is required.");
 if(!text(bp.subjectId)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(bp.subjectId)))e.push("Blueprint subjectId must be a stable alphanumeric slug.");
 if(!Number.isInteger(bp.durationMinutes)||bp.durationMinutes<1)e.push("durationMinutes must be positive.");
 if(!Number.isInteger(bp.totalQuestions)||bp.totalQuestions<1||!Number.isInteger(bp.totalMarks)||bp.totalMarks<1)e.push("Blueprint totals must be positive integers.");
 if(!Array.isArray(bp.sections)||!bp.sections.length)e.push("Blueprint sections are required.");
 const ids=new Set();(bp.sections||[]).forEach(s=>{if(!text(s.sectionId)||ids.has(s.sectionId))e.push("Section IDs must be unique.");ids.add(s.sectionId);if(!Number.isInteger(s.questionCount)||s.questionCount<1||!Number.isInteger(s.totalMarks)||s.totalMarks<1)e.push("Each section needs positive questionCount and totalMarks.");});
 const sections=bp.sections||[];
 if(sections.length&&sum(sections.map(s=>Number(s.totalMarks)||0))!==bp.totalMarks)e.push("Section marks do not add up to blueprint total.");
 if(sections.length&&sum(sections.map(s=>Number(s.questionCount)||0))!==bp.totalQuestions)e.push("Section question counts do not add up to blueprint total.");
 if(!["draft","ready","retired"].includes(bp.status))e.push("Blueprint status is invalid.");
 if(bp.difficultyTargets!=null){
  if(!obj(bp.difficultyTargets)||DIFFICULTIES.some(d=>!Number.isInteger(bp.difficultyTargets[d])||bp.difficultyTargets[d]<0)||Object.keys(bp.difficultyTargets).some(d=>!DIFFICULTIES.includes(d)))e.push("difficultyTargets must define non-negative integer counts for easy, medium and hard.");
  else if(sum(DIFFICULTIES.map(d=>bp.difficultyTargets[d]))!==bp.totalQuestions)e.push("difficultyTargets must add up to totalQuestions.");
 }
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
 const requiredPartMarks=Array.isArray(s.requiresPartInternalChoiceMarks)?s.requiresPartInternalChoiceMarks:[];
 const hasRequiredPartChoices=requiredPartMarks.every(m=>Array.isArray(q.parts)&&q.parts.some(part=>Number(part.marks)===Number(m)&&Array.isArray(part.alternatives)&&part.alternatives.length>0));
 return q.approvalStatus==="approved"&&q.sectionId===s.sectionId&&q.marks===s.marks&&s.allowedTypes.includes(q.type)&&
 (!s.competency||q.competency===s.competency)&&(!s.difficulty||q.difficulty===s.difficulty)&&
 (!s.chapterIds||!s.chapterIds.length||s.chapterIds.includes(q.chapterId))&&
 (!s.unitId||q.unitId===s.unitId)&&
 (!s.assessmentLevel||!Array.isArray(q.assessmentLevels)||q.assessmentLevels.includes(s.assessmentLevel))&&
 (!s.requiresInternalChoice||(Array.isArray(q.alternatives)&&q.alternatives.length>0))&&
 hasRequiredPartChoices&&
 (!s.topicTags||!s.topicTags.length||s.topicTags.every(t=>(q.topicTags||[]).includes(t)));
}
function auditSlotCoverage(bp,bank,minimumCandidatesPerSlot=20){
 const bc=validateBlueprint(bp),qc=validateQuestionBank(bank,{classId:bp&&bp.classId,subjectId:bp&&bp.subjectId,academicYear:bp&&bp.academicYear});
 const errors=[];
 if(!bc.valid)errors.push(...bc.errors);
 if(!qc.valid)errors.push(...qc.errors);
 const slots=Array.isArray(bc.slots)?bc.slots:[];
 const coverage=slots.map(s=>({slotId:s.slotId,questionNumber:s.questionNumber,sectionId:s.sectionId,marks:s.marks,eligibleCount:Array.isArray(bank&&bank.questions)?bank.questions.filter(q=>eligible(q,s)).length:0}));
 if(!Number.isInteger(minimumCandidatesPerSlot)||minimumCandidatesPerSlot<1)errors.push("minimumCandidatesPerSlot must be a positive integer.");
 coverage.forEach(s=>{if(s.eligibleCount<minimumCandidatesPerSlot)errors.push("Slot "+s.slotId+" has "+s.eligibleCount+" eligible approved questions; "+minimumCandidatesPerSlot+" required.");});
 return{valid:errors.length===0,minimumCandidatesPerSlot,slotCount:slots.length,questionCount:Array.isArray(bank&&bank.questions)?bank.questions.length:0,coverage,errors};
}
function questionContentIds(question){
 const ids=new Set();
 function visit(node,fallback){
  if(!obj(node))return;
  const id=String(node.questionId||fallback||"").trim();if(id)ids.add(id);
  (Array.isArray(node.parts)?node.parts:[]).forEach((part,index)=>visit(part,(id||fallback||"question")+"#part:"+(part&&part.partId||index+1)));
  (Array.isArray(node.alternatives)?node.alternatives:[]).forEach((alternative,index)=>visit(alternative,(id||fallback||"question")+"#alternative:"+(index+1)));
 }
 visit(question,"");return[...ids];
}
function generatePaper(bp,bank,options={}){
 const bc=validateBlueprint(bp);if(!bc.valid)throw Error("Invalid blueprint: "+bc.errors.join(" "));
 if(!bc.readyForGeneration)throw Error("Paper generation is locked: blueprint is not approved for generation.");
 const qc=validateQuestionBank(bank,{classId:bp.classId,subjectId:bp.subjectId,academicYear:bp.academicYear});if(!qc.valid)throw Error("Invalid question bank: "+qc.errors.join(" "));
 const recent=new Set((options.recentQuestionIds||[]).map(String)),rand=seedRandom(options.seed||"examguru-paper");
 const slots=bc.slots.map((s,i)=>({...s,_position:i,_candidates:shuffle(bank.questions.filter(q=>eligible(q,s)&&!questionContentIds(q).some(id=>recent.has(id))),rand)}));
 const empty=slots.filter(s=>!s._candidates.length);if(empty.length)throw Error("Question pool shortage: "+empty.map(s=>s.slotId+" ("+s.sectionId+", "+s.marks+" marks)").join("; "));
 const order=slots.slice().sort((a,b)=>a._candidates.length-b._candidates.length||a._position-b._position),used=new Set(),selected=new Map();let tries=0;const max=options.maxSearchAttempts||250000;
 const remainingDifficulty=bp.difficultyTargets?Object.fromEntries(DIFFICULTIES.map(d=>[d,Number(bp.difficultyTargets[d])||0])):null;
 function canComplete(start){
  if(!remainingDifficulty)return true;
  const remainingSlots=order.length-start;
  if(sum(DIFFICULTIES.map(d=>remainingDifficulty[d]))!==remainingSlots)return false;
  for(const difficulty of DIFFICULTIES){
   const needed=remainingDifficulty[difficulty];if(needed<0||needed>remainingSlots)return false;
   let possibleSlots=0;
   for(let j=start;j<order.length;j++)if(order[j]._candidates.some(q=>q.difficulty===difficulty&&!used.has(String(q.questionId))))possibleSlots++;
   if(needed>possibleSlots)return false;
  }
  return true;
 }
 function walk(i){
  if(i>=order.length)return !remainingDifficulty||DIFFICULTIES.every(d=>remainingDifficulty[d]===0);
  if(++tries>max||!canComplete(i))return false;
  const slot=order[i];
  for(const q of slot._candidates){
   const id=String(q.questionId),contentIds=questionContentIds(q),difficulty=q.difficulty;
   if(contentIds.some(contentId=>used.has(contentId))||(remainingDifficulty&&(!Object.prototype.hasOwnProperty.call(remainingDifficulty,difficulty)||remainingDifficulty[difficulty]<=0)))continue;
   contentIds.forEach(contentId=>used.add(contentId));selected.set(slot._position,q);if(remainingDifficulty)remainingDifficulty[difficulty]--;
   if(walk(i+1))return true;
   if(remainingDifficulty)remainingDifficulty[difficulty]++;selected.delete(slot._position);contentIds.forEach(contentId=>used.delete(contentId));
  }
  return false;
 }
 if(!walk(0))throw Error(tries>max?"Selection exceeded its search budget; review the approved pool and difficulty targets.":"No complete paper can satisfy the blueprint slots and difficulty targets from the approved pool.");
 const chosen=slots.sort((a,b)=>a._position-b._position).map((s,i)=>({...clone(selected.get(s._position)),paperQuestionNumber:i+1,slotId:s.slotId,marks:s.marks}));
 const sections=bp.sections.map(s=>{const qs=chosen.filter(q=>q.sectionId===s.sectionId);return{sectionId:s.sectionId,title:s.title,questionCount:qs.length,totalMarks:sum(qs.map(q=>q.marks))};});
 const paper={schemaVersion:1,kind:"exam-paper-snapshot",paperId:String(options.paperId||("paper-"+Math.abs(hashCode(String(options.seed||Date.now())+bp.blueprintId)).toString(36))),title:options.title||bp.title,blueprintId:bp.blueprintId,blueprintVersion:bp.version,academicYear:bp.academicYear,classId:bp.classId,subjectId:bp.subjectId,subjectTitle:bp.subjectTitle||bp.subjectName||null,subjectCode:bp.subjectCode||null,durationMinutes:bp.durationMinutes,totalQuestions:chosen.length,totalMarks:sum(chosen.map(q=>q.marks)),seed:String(options.seed||"examguru-paper"),generatedAt:options.generatedAt||new Date().toISOString(),sourceBankVersion:bank.bankVersion,blueprintSnapshot:clone(bp),sectionResults:sections,questions:chosen};
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
 const historySets=Array.isArray(options.recentQuestionIdSets)?options.recentQuestionIdSets.slice(-5).map(ids=>Array.isArray(ids)?ids.map(String):[]):[];
 const legacyRecent=Array.isArray(options.recentQuestionIds)?options.recentQuestionIds.map(String):[];
 const maxWindow=historySets.length?historySets.length:0;
 let lastShortage=null;
 for(let window=maxWindow;window>=0;window--){
  const recentIds=historySets.length?(window?historySets.slice(-window).flat():[]):legacyRecent;
  let selectionShortage=false;
  for(let i=0;i<attempts;i++){
   let paper;
   try{
    paper=generatePaper(bp,bank,{...options,seed:baseSeed+"-"+window+"-"+i,recentQuestionIds:recentIds});
   }catch(error){
    const message=String(error&&error.message||error);
    if(/^Question pool shortage:|^No complete paper can satisfy/.test(message)){
     lastShortage=error;selectionShortage=true;break;
    }
    throw error;
   }
   const repeatProtectionGuard=recentIds.length>0&&(paper.questions||[]).some(question=>questionContentIds(question).some(id=>recentIds.includes(id)));
    if(repeatProtectionGuard){
     lastShortage=new Error("Question pool shortage: generated paper contains a question used in the protected recent-paper window.");
     selectionShortage=true;
     break;
    }
    const fingerprint=paperFingerprint(paper);
   if(fingerprint&&!recent.has(fingerprint)){
    paper.paperFingerprint=fingerprint;
    paper.repeatProtection={requestedWindow:5,appliedWindow:window,availableHistory:historySets.length,fallback:window<Math.min(5,historySets.length)};
    return paper;
   }
  }
  if(!selectionShortage)break;
 }
 if(lastShortage)throw Error("Could not generate a complete paper even after relaxing the five-paper question-repeat window: "+String(lastShortage.message||lastShortage));
 throw Error("Could not generate a paper combination distinct from the last "+recent.size+" retained attempts. Review or expand the approved question pool.");
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
  if(String(p.classId)!==String(bp.classId))e.push("Paper class does not match the blueprint.");
  if(String(p.subjectId)!==String(bp.subjectId))e.push("Paper subject does not match the blueprint.");
  if(String(p.academicYear)!==String(bp.academicYear))e.push("Paper academic year does not match the blueprint.");
  if((p.subjectCode||null)!==(bp.subjectCode||null))e.push("Paper subject code does not match the blueprint.");
  if(p.durationMinutes!==bp.durationMinutes)e.push("Paper duration does not match the blueprint.");
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
   if(Array.isArray(slot.requiresPartInternalChoiceMarks))slot.requiresPartInternalChoiceMarks.forEach(m=>{if(!Array.isArray(q.parts)||!q.parts.some(part=>Number(part.marks)===Number(m)&&Array.isArray(part.alternatives)&&part.alternatives.length>0))e.push("Part-level internal choice missing for "+q.slotId+" ("+m+" marks).");});
   if(slot.assessmentLevel&&Array.isArray(q.assessmentLevels)&&!q.assessmentLevels.includes(slot.assessmentLevel))e.push("Assessment-level mismatch for "+q.slotId+".");
  });
  if(seen.size!==bp.totalQuestions)e.push("Paper does not fill every blueprint slot.");
  for(const [field,key] of [["unitMarkTargets","unitId"],["competencyMarksTargets","competency"]]){
   const target=bp[field];if(target){const totals=new Map();p.questions.forEach(q=>totals.set(q[key],(totals.get(q[key])||0)+q.marks));for(const [k,v] of Object.entries(target))if((totals.get(k)||0)!==Number(v))e.push("Generated paper "+field+" mismatch for "+k+".");}
  }
  if(bp.markDistribution){const totals=new Map();p.questions.forEach(q=>totals.set(q.marks,(totals.get(q.marks)||0)+1));for(const [marks,count] of Object.entries(bp.markDistribution))if((totals.get(Number(marks))||0)!==Number(count))e.push("Generated paper mark distribution mismatch for "+marks+" marks.");}
   if(bp.difficultyTargets){const totals=new Map(DIFFICULTIES.map(d=>[d,0]));p.questions.forEach(q=>totals.set(q.difficulty,(totals.get(q.difficulty)||0)+1));for(const difficulty of DIFFICULTIES)if((totals.get(difficulty)||0)!==Number(bp.difficultyTargets[difficulty]||0))e.push("Generated paper difficulty target mismatch for "+difficulty+".");}
 }
 return{valid:e.length===0,errors:e};
}
function createQuestionBankTemplate(profile={}){
 const classId=String(profile.classId||"10"),subjectId=String(profile.subjectId||"subject"),subjectTitle=String(profile.subjectTitle||profile.subjectName||subjectId.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()));
 const prefix=("C"+classId+"-"+subjectId).toUpperCase().replace(/[^A-Z0-9-]+/g,"-");
 return{schemaVersion:1,kind:"exam-paper-question-bank",classId,subjectId,subjectCode:profile.subjectCode||null,academicYear:String(profile.academicYear||"2026-27"),bankVersion:"draft-1",title:"Class "+classId+" "+subjectTitle+" mixed-question pool",questions:[{questionId:prefix+"-EXAMPLE-001",sectionId:"section-1",chapterId:"chapter-1",topicTags:[],type:"short-answer",marks:2,prompt:"Replace this with an original, syllabus-eligible question.",difficulty:"medium",competency:"application",approvalStatus:"draft",markingScheme:[{criterion:"First marking point",marks:1},{criterion:"Second marking point",marks:1}],answerKey:{modelAnswer:"Replace with an accurate model answer."},source:{type:"original",reference:"Author/reviewer details"}}]};
}

function normalizeCompetency(value){
 const v=String(value||"").trim().toLowerCase().replace(/[_\s]+/g,"-");
 if(["knowledge-understanding","knowledge","understanding","recall"].includes(v))return"knowledge-understanding";
 if(["application","apply"].includes(v))return"application";
 if(["analysis-evaluation-creation","analysis","evaluation","creation","analyze","analyse"].includes(v))return"analysis-evaluation-creation";
 if(["map-skill","map","mapping","geographical-map-skill"].includes(v))return"map-skill";
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
function normalizeStem(value){return String(value||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function adaptChapterMcqBank(practiceChapters,bp,options={}){
 if(!Array.isArray(practiceChapters))throw Error("The optional chapter-wise practice bank must be a chapter array.");
 const blueprintCheck=validateBlueprint(bp);
 if(!blueprintCheck.valid||!blueprintCheck.readyForGeneration)throw Error("Cannot map practice MCQs until the selected blueprint is valid and ready.");
 const slotRows=bp.slotPlan||[];
 const chapterIds=[...new Set(slotRows.flatMap(s=>Array.isArray(s.chapterIds)?s.chapterIds:[]))];
 const questions=[],excluded={outOfSummativeScope:0,ambiguousChapter:0,invalidQuestion:0,unsupportedCompetency:0,needsReview:0},invalidReasons={missingPrompt:0,optionCount:0,emptyOptionText:0,duplicateOptionIds:0,badAnswer:0,missingExplanation:0,emptyStem:0,duplicateSourceId:0,duplicateSourceStem:0};
 const byChapter={},byCompetency={"knowledge-understanding":0,"application":0,"analysis-evaluation-creation":0};
 const usedIds=new Set(),usedStems=new Set();
 const slug=value=>String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
 const classToken=String(bp.classId).replace(/[^a-z0-9]+/gi,"").toUpperCase()||"CLASS";
 const subjectToken=String(bp.subjectId).toUpperCase().replace(/[^A-Z0-9]+/g,"-");
 practiceChapters.forEach((chapter,chapterIndex)=>{
  const rawKey=String(chapter&&(chapter.key||chapter.chapterKey||chapter.chapterId)||"").trim();
  const title=String(chapter&&chapter.title||"").trim();
  const keys=[rawKey,slug(rawKey),slug(title)].filter(Boolean);
  const chapterId=chapterIds.find(id=>keys.includes(id))||chapterIds.find(id=>keys.some(key=>key.endsWith("-"+id)||key.startsWith(id+"-")));
  if(!chapterId){excluded.outOfSummativeScope+=(Array.isArray(chapter&&chapter.questions)?chapter.questions.length:0);return;}
  const explicitMcqExclusions=new Set(Array.isArray(bp.mcqPracticeExclusions)?bp.mcqPracticeExclusions.map(String):[]);
  if(explicitMcqExclusions.has(chapterId)){excluded.outOfSummativeScope+=(Array.isArray(chapter&&chapter.questions)?chapter.questions.length:0);return;}
  const related=slotRows.filter(s=>(s.chapterIds||[]).includes(chapterId));
  // Prefer one-mark MCQ slots when available. For other subjects, preserve
  // their existing section fallback; a blueprint can explicitly exclude a
  // written-response chapter from its exam MCQ adapter via mcqPracticeExclusions.
  const mcqRelated=related.filter(s=>Number(s.marks)===1&&Array.isArray(s.allowedTypes)&&s.allowedTypes.includes("mcq"));
  const mappingSlots=mcqRelated.length?mcqRelated:related;
  if(!mappingSlots.length){excluded.outOfSummativeScope+=(Array.isArray(chapter&&chapter.questions)?chapter.questions.length:0);return;}
  const sections=[...new Set(mappingSlots.map(s=>s.sectionId))],units=[...new Set(mappingSlots.map(s=>s.unitId).filter(Boolean))];
  if(sections.length>1&&!mappingSlots.some(s=>s.sectionId===chapter.sectionId)||units.length>1&&!mappingSlots.some(s=>s.unitId===chapter.unitId)){
   excluded.ambiguousChapter+=(Array.isArray(chapter.questions)?chapter.questions.length:0);return;
  }
  const chapterSection=chapter.sectionId&&sections.includes(chapter.sectionId)?chapter.sectionId:sections.length===1?sections[0]:null;
  const chapterUnit=chapter.unitId&&units.includes(chapter.unitId)?chapter.unitId:units.length===1?units[0]:null;
  if(!chapterSection){excluded.ambiguousChapter+=(Array.isArray(chapter.questions)?chapter.questions.length:0);return;}
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
   const safeQid=qid.replace(/[^A-Za-z0-9._-]+/g,"-")||("Q"+(questionIndex+1));
   const id="EG"+classToken+"-"+subjectToken+"-PRACTICE-MCQ-"+chapterId+"-"+safeQid;
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
   usedIds.add(id);usedStems.add(stem);
   const tagStatus=String(q.competencyTagStatus||"");
   // Mathematics has a subject-specific exam blueprint whose competency split
   // must be inferred from the stem rather than the broad shared bank tagger.
   // Keep the shared bank's existing tags for every other subject: their
   // blueprints and candidate distributions were validated against those tags.
   const hasSourceCompetency=!!normalizeCompetency(q.competency||q.competencyLevel||q.competencyTag);
   const reclassifyForMath=String(bp.subjectId||"").toLowerCase()==="mathematics"&&tagStatus!=="author-confirmed"&&tagStatus!=="";
   const useSourceCompetency=hasSourceCompetency&&!reclassifyForMath;
   const competencyInput=useSourceCompetency?q:{...q,competency:undefined,competencyLevel:undefined,competencyTag:undefined};
   const tagged=inferMcqCompetency(competencyInput);
   if(tagStatus==="needs-review"){excluded.needsReview++;return;}
   if(!COMPETENCIES.includes(tagged.competency)){excluded.unsupportedCompetency++;return;}
   const correct=opts[answer],letter=String(correct.optionId);
   const question={
    questionId:id,sectionId:chapterSection,chapterId,topicTags:["mcq","practice-bank",chapterId],
    type:"mcq",marks:1,prompt,difficulty:normalisePracticeDifficulty(q.difficulty),
    competency:tagged.competency,competencyTagMethod:useSourceCompetency?(tagStatus==="author-confirmed"?"author-confirmed-source":"shared-bank-tag"):"exam-paper-content-inference",competencyTagStatus:useSourceCompetency?(tagStatus||"inferred"):"inferred",competencyTagReason:useSourceCompetency?String(q.competencyTagReason||"Competency supplied by the shared MCQ bank tagger."):"Re-inferred from the question stem and explanation for Mathematics examination-slot alignment; generic auto-inferred bank tags are not treated as authoritative.",approvalStatus:"approved",
    options:opts,correctOptionId:correct.optionId,
    answerKey:{modelAnswer:letter+". "+correct.text,explanation:String(q.explanation||q.rationale).trim()},
    markingScheme:[{criterion:"Correct option selected: "+letter,marks:1}],
    source:{type:"practice-bank",reference:String(bp.title||("Class "+bp.classId+" "+bp.subjectId))+" · "+title+" · "+qid}
   };
   if(chapterUnit)question.unitId=chapterUnit;
   if(Array.isArray(q.images)&&q.images.length)question.images=clone(q.images);
   questions.push(question);byChapter[chapterId]++;byCompetency[tagged.competency]++;
  });
 });
 return{
  schemaVersion:1,kind:"exam-paper-question-bank",classId:String(bp.classId),subjectId:String(bp.subjectId),subjectCode:bp.subjectCode||null,academicYear:bp.academicYear,
  bankVersion:String(options.bankVersion||"chapter-practice-mcqs-v1"),title:String(options.title||("Class "+bp.classId+" "+(bp.subjectTitle||bp.subjectId)+" chapter-wise practice MCQs")),
  questionPoolStatus:"shared-practice-bank-adapter",questions,
  adapterStats:{sourceChapterCount:practiceChapters.length,importedCount:questions.length,excluded,invalidReasons,byChapter,byCompetency}
 };
}
function adaptPracticeMcqBank(practiceChapters,bp,options={}){return adaptChapterMcqBank(practiceChapters,bp,options);}
function mergeQuestionBanks(baseBank,practiceChapters,bp,options={}){
 const expected={classId:bp&&bp.classId,subjectId:bp&&bp.subjectId,academicYear:bp&&bp.academicYear};
 const baseCheck=validateQuestionBank(baseBank,expected);
 if(!baseCheck.valid)throw Error("Base exam-paper bank is invalid: "+baseCheck.errors.slice(0,5).join(" "));
 const hasPractice=Array.isArray(practiceChapters);
 const adapted=hasPractice?adaptChapterMcqBank(practiceChapters,bp,options):{
  questions:[],adapterStats:{sourceChapterCount:0,importedCount:0,excluded:{},invalidReasons:{},byChapter:{},byCompetency:{}}
 };
 const merged=clone(baseBank),ids=new Set(),stems=new Set();
 (merged.questions||[]).forEach(q=>{ids.add(String(q.questionId));stems.add(normalizeStem(q.prompt));});
 let appended=0,duplicateIds=0,duplicateStems=0;
 adapted.questions.forEach(q=>{
  if(ids.has(q.questionId)){duplicateIds++;return;}
  const stem=normalizeStem(q.prompt);
  if(stem&&stems.has(stem)){duplicateStems++;return;}
  ids.add(q.questionId);if(stem)stems.add(stem);merged.questions.push(q);appended++;
 });
 if(hasPractice)merged.bankVersion=String(baseBank.bankVersion)+"+chapter-practice-mcqs-v1";
 if(appended)merged.title=String(baseBank.title||"Class "+bp.classId+" "+bp.subjectId+" paper pool")+" + chapter-wise practice MCQs";
 merged.questionPoolStatus=appended?"shared-practice-and-exam-paper-pool":(baseBank.questionPoolStatus||"exam-paper-pool");
 const check=validateQuestionBank(merged,expected);
 if(!check.valid)throw Error("Integrated question pool is invalid: "+check.errors.slice(0,8).join(" "));
 const minimum=Number.isInteger(options.minimumCandidatesPerSlot)?options.minimumCandidatesPerSlot:20;
 const coverage=auditSlotCoverage(bp,merged,minimum);
 if(!coverage.valid)throw Error("Question pool does not meet minimum slot coverage: "+coverage.errors.slice(0,8).join(" "));
 return{bank:merged,stats:{practiceSourceCount:adapted.questions.length,appended,duplicateIds,duplicateStems,excluded:adapted.adapterStats.excluded,invalidReasons:adapted.adapterStats.invalidReasons,byChapter:adapted.adapterStats.byChapter,byCompetency:adapted.adapterStats.byCompetency,coverage}};
}

const api=Object.freeze({schemaVersion:1,questionTypes:TYPES,difficulties:DIFFICULTIES,competencies:COMPETENCIES,validateQuestion,validateQuestionBank,validateBlueprint,expandSlotPlan,auditSlotCoverage,questionContentIds,generatePaper,paperFingerprint,generateUniquePaper,validatePaper,createQuestionBankTemplate,normalizeCompetency,inferMcqCompetency,normalizeStem,adaptChapterMcqBank,adaptPracticeMcqBank,mergeQuestionBanks});
window.ExamPaperGenerator=api;
window.C10ExamPaperGenerator=api;
})();