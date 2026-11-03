/* Shared MCQ competency taxonomy and legacy classifier. */
(function(root){
"use strict";
const VALUES=Object.freeze([
 "knowledge-understanding",
 "application",
 "analysis-evaluation-creation"
]);
const STATUSES=Object.freeze(["author-confirmed","inferred","needs-review"]);
const VERSION="1.0.0";
const valid=value=>VALUES.includes(String(value||""));
const normalize=value=>String(value||"").normalize("NFKD").toLowerCase().replace(/\s+/g," ").trim();
function infer(question,context={}){
 const q=question&&typeof question==="object"?question:{};
 const prompt=String(q.question||q.prompt||q.text||"");
 const explanation=String(q.explanation||q.rationale||"");
 const section=String(q.section||context.section||"");
 const chapter=String(context.chapterTitle||context.chapter||"");
 const subject=String(context.subjectId||context.subject||"").toLowerCase();
 const text=normalize([prompt,explanation].join(" "));
 const sectionText=normalize(section);
 const analysisPatterns=[
  /\b(analy[sz](?:e|es|ed|ing|is)|evaluation|evaluate|evaluating|critique|justify|infer|inference|conclude|conclusion|interpret|compare|contrast|relationship|correlation|trend|evidence|argument|reasoning|logical reasoning|achievers|odd one out|series|sequence|pattern|most likely explanation|best supported|best explains|which claim|which conclusion|what can be inferred|identify the error|analyse the data|analyze the data)\b/,
  /(अनुमान|निष्कर्ष|विश्लेषण|मूल्यांकन|तुलना|तर्क|प्रमाण|साक्ष्य|सबसे उचित निष्कर्ष|क्या निष्कर्ष निकाला जा सकता है|क्योंकि|कारण और परिणाम)/,
  /(pattern|sequence|series|logic|logical|arrangement|coding.decoding|calendar|direction test)/,
  /(आकृति|श्रृंखला|क्रम|तार्किक|समानता|विषम|अगला पद)/
 ];
 const applicationPatterns=[
  /\b(apply|application|calculate|compute|solve|simplify|find the value|determine the value|work out|use the formula|using the given|based on the given|given that|if .* then|what happens when|how many|how much|what is the result|which action|which method|which step|in this situation|in the situation|a student|a scientist|a farmer|a shopkeeper|a person|an experiment|experimental setup|case study|real.life|reported speech|reported form|change into|rewrite the sentence|fill in the blank|complete the sentence|choose the correct form|correct tense|correct preposition|correct article|convert|ratio|percentage|profit|loss|area|perimeter|volume|speed|distance|time taken|resistance|voltage|current|focal length|magnification|probability)\b/,
  /(लागू|गणना|हल कीजिए|मान ज्ञात|कितना होगा|कितनी होगी|कितने होंगे|रिक्त स्थान|सही रूप|वाक्य में|परिवर्तित कीजिए|प्रयोग कीजिए|स्थिति में|यदि .* तो|उदाहरण के आधार पर)/,
  /(calculate|compute|solve|simplify|hcf|lcm|area|perimeter|volume|fraction|decimal|percentage|ratio|equation|expression|factor|multiple|divisible|remainder|average|mean|median|mode|interest|speed|distance|time|cost|price|profit|loss)/,
  /(given.*(?:cm|mm|km|m|kg|g|l|ml|°c|v|a|ohm|Ω)|\d+\s*[+\-×÷*/=]\s*\d+|\d+\s*(?:cm|mm|km|m|kg|g|l|ml|v|a|ohm|Ω))/
 ];
 const knowledgePatterns=[
  /\b(what is|who is|who was|who wrote|when was|where is|where was|name the|define|definition of|meaning of|synonym of|antonym of|which law|which term|is known as|is called|full form of|capital of|identify the term|which of these is a|which of the following is a)\b/,
  /(क्या है|कौन है|किसने लिखा|कब हुआ|कहाँ स्थित|परिभाषा|अर्थ क्या|पर्यायवाची|विलोम शब्द|किसे कहते हैं|किसका नाम|राजधानी|कौन सा नियम|कौन-सा नियम)/
 ];
 if(/achievers|logical reasoning|mathematical reasoning/.test(sectionText))return{competency:"analysis-evaluation-creation",status:"inferred",confidence:0.92,reason:"Question-bank section indicates higher-order reasoning."};
 if(analysisPatterns.some(re=>re.test(text)))return{competency:"analysis-evaluation-creation",status:"inferred",confidence:0.88,reason:"The stem requires inference, comparison, pattern recognition, evidence interpretation or evaluation."};
 if(applicationPatterns.some(re=>re.test(text)))return{competency:"application",status:"inferred",confidence:0.82,reason:"The stem requires using a concept, rule, procedure or formula in a supplied context."};
 if(subject.includes("mathematics")&&(/\d/.test(prompt)||/[+\-×÷=]/.test(prompt)))return{competency:"application",status:"inferred",confidence:0.76,reason:"A mathematical expression or numerical values must be operated on to answer."};
 if(knowledgePatterns.some(re=>re.test(text)))return{competency:"knowledge-understanding",status:"inferred",confidence:0.82,reason:"The stem asks for direct identification, recall, meaning or understanding of a stated concept."};
 if(/\b(which|what|who|when|where|identify|select|choose|state|name)\b/.test(text))return{competency:"knowledge-understanding",status:"inferred",confidence:0.66,reason:"The stem appears to ask for direct identification or understanding; verify against the intended learning outcome."};
 return{competency:"knowledge-understanding",status:"needs-review",confidence:0.4,reason:"No reliable cognitive-demand cue was found; the provisional label must be checked by an educator."};
}
function tagQuestion(question,context={}){
 const q={...(question||{})};
 if(valid(q.competency)){
  const status=STATUSES.includes(q.competencyTagStatus)?q.competencyTagStatus:(q.competencyTagStatus==="reviewed"?"author-confirmed":"inferred");
  return{...q,competency:q.competency,competencyTagStatus:status,
   competencyTagReason:String(q.competencyTagReason||"Competency value supplied in the question source."),
   competencyTaggerVersion:String(q.competencyTaggerVersion||VERSION)};
 }
 const inferred=infer(q,context);
 return{...q,competency:inferred.competency,competencyTagStatus:inferred.status,
  competencyTagReason:inferred.reason,competencyConfidence:inferred.confidence,competencyTaggerVersion:VERSION};
}
function validate(question){
 if(!valid(question&&question.competency))return"MCQ competency must be one of: "+VALUES.join(", ")+".";
 if(!STATUSES.includes(String(question&&question.competencyTagStatus||"")))return"MCQ competencyTagStatus must be author-confirmed, inferred or needs-review.";
 if(!String(question&&question.competencyTagReason||"").trim())return"MCQ competencyTagReason is required.";
 return null;
}
const api=Object.freeze({version:VERSION,values:VALUES,statuses:STATUSES,isValid:valid,infer,tagQuestion,validate});
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(root)root.C10CompetencyTagger=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null));
