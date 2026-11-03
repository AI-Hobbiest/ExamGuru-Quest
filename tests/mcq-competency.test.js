"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const tagger=require("../js/competency-tagger.js");
const values=tagger.values;
const recall=tagger.infer({question:"Which law states that mass is conserved in a chemical reaction?",difficulty:"Hard"});
assert.equal(recall.competency,"knowledge-understanding");
const math=tagger.infer({question:"The HCF of 135 and 225 is:",difficulty:"Easy"},{subjectId:"mathematics"});
assert.equal(math.competency,"application");
const analysis=tagger.infer({question:"The table shows a rising trend in plant growth. Which conclusion is best supported by the evidence?"});
assert.equal(analysis.competency,"analysis-evaluation-creation");
const hindi=tagger.infer({question:"दिए गए अनुच्छेद से सबसे उचित निष्कर्ष क्या निकाला जा सकता है?"});
assert.equal(hindi.competency,"analysis-evaluation-creation");
const sof=tagger.infer({question:"Choose the next number in the pattern.",section:"Logical Reasoning"});
assert.equal(sof.competency,"analysis-evaluation-creation");
const needsReview=tagger.infer({question:"Choose one option."});
assert.equal(needsReview.status,"needs-review");
const tagged=tagger.tagQuestion({question:"Who wrote this poem?",difficulty:"Hard"});
assert.equal(tagged.competency,"knowledge-understanding");
assert.equal(tagged.competencyTagStatus,"inferred");
assert.ok(tagged.competencyTagReason);
const confirmed=tagger.tagQuestion({question:"Solve this equation.",competency:"application",competencyTagStatus:"author-confirmed",competencyTagReason:"Requires applying an algebraic method."});
assert.equal(confirmed.competencyTagStatus,"author-confirmed");
assert.equal(tagger.validate(confirmed),null);
assert.match(tagger.validate({competency:"remembering"}),/competency must be one of/);
assert.ok(values.includes("application"));
const admin=fs.readFileSync("js/admin-manager.js","utf8");
const html=fs.readFileSync("admin.html","utf8");
const schema=JSON.parse(fs.readFileSync("data/contracts/v1/question-bank.schema.json","utf8"));
assert.ok(admin.includes('$("qCompetency").value')&&admin.includes("C10CompetencyTagger.validate(q)"),"Admin editor must require and validate competency");
assert.ok(admin.includes('competencyTagStatus:"author-confirmed"'),"Admin saves must persist author-confirmed tags");
assert.ok(html.includes('id="qCompetency"')&&html.includes("Analysis / Evaluation / Creation"),"Admin UI must expose all competency choices");
assert.ok(html.indexOf("./js/competency-tagger.js")<html.indexOf("./js/admin-manager.js"),"tagger must load before the editor");
const questionSchema=schema.properties.chapters.items.properties.questions.items;
for(const key of ["competency","competencyTagStatus","competencyTagReason"])assert.ok(questionSchema.required.includes(key),"canonical schema must require "+key);
assert.deepEqual(questionSchema.properties.competency.enum,values);
const dataDir=process.argv[2];
if(dataDir){
 const bankNames=["science","mathematics","english","social-science","hindi","class-3-mathematics","class-3-english","class-6-science","class-6-mathematics","class-6-english","class-6-social-science","class-6-science-sof","class-6-mathematics-sof","class-6-english-sof"];
 let total=0,needsReview=0;
 for(const name of bankNames){
  const data=JSON.parse(fs.readFileSync(path.join(dataDir,name+".json"),"utf8"));
  assert.ok(Array.isArray(data)&&data.length,name+" must be a chapter array");
  for(const chapter of data)for(const q of chapter.questions){
   assert.equal(tagger.validate(q),null,name+" / "+chapter.title+" / "+q.id);
   total++;if(q.competencyTagStatus==="needs-review")needsReview++;
  }
 }
 assert.equal(total,17424,"all supported CBSE and SOF MCQs must be tagged");
 console.log("Cross-subject bank audit passed: "+bankNames.length+" banks, "+total+" MCQs, "+needsReview+" provisional tags flagged for educator review.");
}
console.log("Competency tagger tests passed: three-level taxonomy, difficulty independence, Mathematics, Hindi, SOF reasoning, explicit review status, Admin validation and schema contract.");