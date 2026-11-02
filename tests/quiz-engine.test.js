"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class FakeClassList {
  constructor(){this.values=new Set();}
  add(value){this.values.add(value);}
  remove(value){this.values.delete(value);}
  contains(value){return this.values.has(value);}
  toggle(value,force){const should=force===undefined?!this.values.has(value):!!force;if(should)this.values.add(value);else this.values.delete(value);return should;}
}
class FakeElement {
  constructor(id=""){
    this.id=id;this.children=[];this.handlers={};this.classList=new FakeClassList();this.className="";
    this.dataset={};this.disabled=false;this.hidden=false;this.open=false;this.value=id==="length"?"10":id==="overallTimerSetting"?"off":id==="questionTimerSetting"?"off":id==="overallTimerCustom"?"30":id==="questionTimerCustom"?"45":"0";
    this._innerHTML="";this.textContent="";this.style={};this.attributes={};this.tagName="DIV";
  }
  set innerHTML(value){this._innerHTML=String(value);this.children=[];}
  get innerHTML(){return this._innerHTML;}
  appendChild(child){this.children.push(child);return child;}
  append(...children){children.forEach(child=>this.appendChild(child));}
  setAttribute(name,value){this.attributes[name]=String(value);}
  querySelectorAll(selector){if(selector==="button")return this.children.filter(child=>child.tagName==="BUTTON");return [];}
  addEventListener(type,handler){this.handlers[type]=handler;}
  scrollIntoView(options){this.scrollOptions=options;}
  click(){if(this.disabled)return;if(typeof this.onclick==="function")this.onclick({target:this});if(this.handlers.click)this.handlers.click({target:this});}
}
const subjectBank = [{
  chapter_no:1,title:"Mini Algebra",key:"mini-algebra",
  questions:[
    {id:1,question:"Two plus two equals?",options:["3","4","5","6"],answer:1,explanation:"Two plus two equals four.",difficulty:"Easy",images:[{src:"./data/images/mathematics/number-line.png",alt:"Number line from zero to four",caption:"Number line"}]},
    {id:2,question:"Three plus one equals?",options:["2","3","4","5"],answer:2,explanation:"Three plus one equals four.",difficulty:"Easy",images:[{src:"data:image/png;base64,iVBORw0KGgo=",alt:"A four-part diagram"}]}
  ]
}];

function makeEnvironment(seed = new Map(), subject = "mathematics", studentClass = "10", bankOverride = subjectBank){
  const values=new Map(seed);
  const ids=new FakeElement("mode-buttons");
  ids.children=[];
  ["learn","test","retry","random","timed","olympiad"].forEach(mode=>{
    const button=new FakeElement("mode-"+mode);button.tagName="BUTTON";button.dataset.mode=mode;
    if(mode==="learn")button.classList.add("active");
    if(mode==="olympiad")button.classList.add("hide");
    ids.children.push(button);
  });
  const elements={};
  const allIds=[
    "chapter","overallTimerSetting","questionTimerSetting","overallTimerCustom","questionTimerCustom","overallCustomLabel","questionCustomLabel","timingControls","timingHelp","olympiadBlueprintPanel","chapterControls","lengthControl","practiceLayout","quizPanel","questionTimerPill","sectionPill","markReviewBtn","mobilePreviousBtn","mobileNextBtn","mobileNavigatorBtn","navigatorInlineBtn","questionNavDock","questionNavigatorOverlay","questionNavigatorGrid","navigatorSummary","navigatorSectionSummary","closeQuestionNavigator","questionNavigatorBackdrop","navigatorReturnBtn","navigatorSubmitBtn","length","chapterTotal","questionTotal","overallStat","progressText","modeHint",
    "status","welcome","session","results","review","subjectIcon","subjectTitle","subjectSubtitle","chapterPill",
    "numberPill","difficultyPill","timerPill","progressBar","questionText","options","feedback","sessionHint",
    "nextBtn","skipBtn","submitBtn","startBtn","reviewBtn","clearBtn","againBtn","reviewAnswersBtn","reportPdfBtn","reportExcelBtn","reviewPdfBtn","reviewExcelBtn","backBtn",
    "retrySetBtn","resultCopy","resultTitle","scorePct","scoreUnit","resultStats","sectionResults","reviewPill","reviewList","questionMedia","imageViewer","imageViewerImage","imageViewerCaption","imageViewerClose"
  ];
  allIds.forEach(id=>elements[id]=new FakeElement(id));
  ["session","results","review","status","imageViewer","questionMedia"].forEach(id=>elements[id].classList.add("hide"));
  elements["nextBtn"].tagName="BUTTON";elements["skipBtn"].tagName="BUTTON";
  elements["submitBtn"].tagName="BUTTON";elements["startBtn"].tagName="BUTTON";
  elements["reviewBtn"].tagName="BUTTON";elements["clearBtn"].tagName="BUTTON";
  elements["againBtn"].tagName="BUTTON";elements["reviewAnswersBtn"].tagName="BUTTON";
  elements["backBtn"].tagName="BUTTON";elements["retrySetBtn"].tagName="BUTTON";
  ["mobilePreviousBtn","mobileNextBtn","mobileNavigatorBtn","navigatorInlineBtn","markReviewBtn","closeQuestionNavigator","questionNavigatorBackdrop","navigatorReturnBtn","navigatorSubmitBtn"].forEach(id=>elements[id].tagName="BUTTON");
  const document={
    title:"",
    hidden:false,
    getElementById:id=>elements[id]||(elements[id]=new FakeElement(id)),
    createElement:tag=>{const element=new FakeElement();element.tagName=tag.toUpperCase();return element;},
    querySelectorAll:selector=>selector==="[data-mode]"?ids.children:[],
    addEventListener:()=>{}
  };
  const localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key)
  };
  const sessionStorage={getItem:key=>key==="c10playground_static_student_v1"?JSON.stringify({username:"quiz-test",classId:String(studentClass)}):null};
  let uuidCounter=0;
  const context={
    window:{addEventListener:()=>{},matchMedia:()=>({matches:true})},document,localStorage,sessionStorage,console,Date,Math,JSON,Object,Array,Number,String,
    TypeError,Uint8Array,encodeURIComponent,URLSearchParams,
    location:{search:"?subject="+subject},
    crypto:{randomUUID:()=>("00000000-0000-4000-8000-"+String(++uuidCounter).padStart(12,"0"))},
    fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve(bankOverride)}),
    setInterval:()=>1,clearInterval:()=>{},confirm:()=>true
  };
  context.globalThis=context;
  vm.createContext(context);
  for(const file of ["js/storage.js","js/question-bank.js","js/olympiad-blueprints.js","js/session-model.js","js/quiz-engine.js"]){
    vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
  }
  return {context,values,elements,modeButtons:ids.children};
}
const delay=()=>new Promise(resolve=>setImmediate(resolve));

(async()=>{
  const first=makeEnvironment();
  await delay();
  assert.equal(first.elements.chapterTotal.textContent,"1");
  first.elements.startBtn.click();
  assert.equal(first.elements.session.classList.contains("hide"),false);
  assert.equal(first.elements.timerPill.classList.contains("hide"),false,"elapsed time is shown when overall countdown is off");
  assert.equal(first.elements.questionTimerPill.classList.contains("hide"),true,"question timer is off by default");
  const firstLedger=[...first.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  const firstActive=JSON.parse(firstLedger[1]).data.activeAttempt;
  assert.equal(firstActive.overallTimeLimitSeconds,null,"overall countdown is optional by default");
  assert.equal(firstActive.questionTimeLimitSeconds,null,"question countdown is optional by default");
  assert.equal(first.elements.practiceLayout.classList.contains("quiz-active"),true,"active practice switches to the focused quiz layout on mobile");
  assert.equal(first.elements.quizPanel.scrollOptions.behavior,"smooth","mobile start brings the question panel into view");
  assert.equal(first.elements.quizPanel.scrollOptions.block,"start");
  assert.equal(first.elements.overallTimerSetting.value,"off","Learn mode has no overall countdown by default");
  assert.equal(first.elements.questionTimerSetting.value,"off","Learn mode has no question countdown by default");
  assert.equal(first.elements.questionMedia.children.length,1,"question illustration renders in practice");
  const firstFigure=first.elements.questionMedia.children[0];
  first.elements.mobileNavigatorBtn.click();
  assert.equal(first.elements.questionNavigatorOverlay.classList.contains("hide"),false,"mobile navigator opens as a drawer");
  assert.equal(first.elements.questionNavigatorGrid.children.length,2,"navigator lists every question");
  first.elements.closeQuestionNavigator.click();
  first.elements.markReviewBtn.click();
  assert.equal(first.elements.markReviewBtn.attributes["aria-pressed"],"true","current question can be marked for review");
  const zoomTrigger=firstFigure.children[0];
  zoomTrigger.click();
  assert.equal(first.elements.imageViewer.classList.contains("hide"),false,"diagram can be enlarged");
  assert.ok(first.elements.imageViewerImage.src,"viewer loads the selected diagram");
  first.elements.imageViewerClose.click();
  assert.equal(first.elements.imageViewer.classList.contains("hide"),true,"diagram viewer closes accessibly");
  first.elements.options.children[0].click();
  assert.equal(first.elements.options.children[0].disabled,false,"selected answer remains editable before moving on");
  first.elements.options.children[1].click();
  assert.equal(first.elements.options.children[1].classList.contains("selected"),true,"changed answer is highlighted");
  assert.equal(first.elements.options.children[0].classList.contains("selected"),false,"previous selection is cleared");
  assert.equal(first.elements.options.children[1].disabled,false,"answer options stay enabled until moving on");
  first.elements.nextBtn.click();
  const ledgerEntry=[...first.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  assert.ok(ledgerEntry,"active attempt is saved after answering and moving forward");
  let wrapped=JSON.parse(ledgerEntry[1]);
  assert.equal(wrapped.data.activeAttempt.status,"in-progress");
  assert.equal(wrapped.data.activeAttempt.currentIndex,1);
  assert.ok(wrapped.data.activeAttempt.answers[0],"first answer autosaved");
  assert.ok(wrapped.data.activeAttempt.questions.some(question=>question.images&&question.images.some(image=>image.sourceInQuestionBank===true&&!image.src)),"embedded image data is not duplicated into the local session snapshot");
  const savedProfileId=wrapped.data.activeAttempt.profileId;

  const resumed=makeEnvironment(first.values);
  await delay();
  assert.equal(resumed.elements.session.classList.contains("hide"),false,"saved attempt resumes after reload");
  assert.equal(resumed.elements.numberPill.textContent,"Question 2 / 2");
  assert.equal(resumed.elements.options.children.length,4);
  assert.equal(resumed.elements.questionMedia.children.length,1,"diagram is restored from the question bank after refresh");
  assert.ok(resumed.elements.questionMedia.children[0].children[0].children[0].src,"restored diagram has its original source");
  resumed.elements.options.children[0].click();
  resumed.elements.nextBtn.click();
  assert.equal(resumed.elements.results.classList.contains("hide"),false,"last answer submits completed attempt");
  assert.ok(resumed.elements.resultCopy.textContent.includes("saved on this device"));
  const completedEntry=[...resumed.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  wrapped=JSON.parse(completedEntry[1]);
  assert.equal(wrapped.data.activeAttempt,null);
  assert.equal(wrapped.data.attempts.length,1);
  assert.equal(wrapped.data.attempts[0].status,"submitted");
  assert.equal(wrapped.data.attempts[0].questionCount,2);
  assert.equal(wrapped.data.attempts[0].answeredCount,2);
  assert.equal(wrapped.data.answerRecords.length,2);
  assert.equal(wrapped.data.attempts[0].profileId,savedProfileId);
  assert.ok(Number.isInteger(wrapped.data.attempts[0].durationSeconds));
  resumed.elements.reviewAnswersBtn.click();
  assert.equal(resumed.elements.review.classList.contains("hide"),false,"answer review opens after test");
  assert.ok(resumed.elements.reviewList.children.some(item=>item.children.some(child=>String(child.className).includes("question-review-media"))),"question diagrams also render in answer review");
  assert.equal(typeof resumed.elements.reviewPdfBtn.onclick,"function","PDF download remains available inside answer review");
  assert.equal(typeof resumed.elements.reviewExcelBtn.onclick,"function","Excel download remains available inside answer review");
  resumed.elements.backBtn.click();
  assert.equal(resumed.elements.review.classList.contains("hide"),true,"back from review closes the review screen");
  assert.equal(resumed.elements.results.classList.contains("hide"),false,"back from review returns to the result screen, not the welcome screen");
  assert.equal(typeof resumed.elements.reportPdfBtn.onclick,"function","PDF download remains available after returning from review");
  assert.equal(typeof resumed.elements.reportExcelBtn.onclick,"function","Excel download remains available after returning from review");

  const timed=makeEnvironment();
  await delay();
  assert.equal(timed.elements.overallTimerSetting.value,"off","non-timed modes start without an overall countdown");
  timed.modeButtons.find(button=>button.dataset.mode==="timed").click();
  assert.equal(timed.elements.overallTimerSetting.value,"1200","Timed Exam requires a 20-minute overall countdown by default");
  timed.modeButtons.find(button=>button.dataset.mode==="learn").click();
  timed.modeButtons.find(button=>button.dataset.mode==="timed").click();
  timed.elements.startBtn.click();
  const timedLedger=[...timed.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  const timedWrapped=JSON.parse(timedLedger[1]);
  assert.equal(timedWrapped.data.activeAttempt.timingMode,"countdown","Timed Exam records an overall countdown");
  assert.equal(timedWrapped.data.activeAttempt.timeLimitSeconds,1200,"Timed Exam uses the required duration");

  const skippedNav=makeEnvironment();
  await delay();
  skippedNav.elements.startBtn.click();
  skippedNav.elements.skipBtn.click();
  skippedNav.elements.mobileNavigatorBtn.click();
  assert.equal(skippedNav.elements.questionNavigatorGrid.children[0].classList.contains("skipped"),true,"skipped questions have a distinct navigator tile state");
  assert.ok(skippedNav.elements.questionNavigatorGrid.children[0].attributes["aria-label"].includes("skipped"),"navigator announces skipped state to assistive technology");

  const overallExpiry=makeEnvironment();
  await delay();
  overallExpiry.modeButtons.find(button=>button.dataset.mode==="timed").click();
  overallExpiry.elements.startBtn.click();
  overallExpiry.elements.options.children[0].click();
  let overallExpiryRow=[...overallExpiry.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  let overallExpiryData=JSON.parse(overallExpiryRow[1]);
  overallExpiryData.data.activeAttempt.deadlineAt="2000-01-01T00:00:00.000Z";
  overallExpiry.values.set(overallExpiryRow[0],JSON.stringify(overallExpiryData));
  const overallExpired=makeEnvironment(overallExpiry.values);
  await delay();
  assert.equal(overallExpired.elements.results.classList.contains("hide"),false,"overall countdown expiry submits the full quiz automatically");
  const overallResultRow=[...overallExpired.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  const overallResult=JSON.parse(overallResultRow[1]).data.attempts[0];
  assert.equal(overallResult.status,"timed-out","overall timer records a timed-out attempt");
  assert.equal(overallResult.answeredCount,1,"overall timer expiry preserves answers already selected");

  const overallOnly=makeEnvironment();
  await delay();
  overallOnly.modeButtons.find(button=>button.dataset.mode==="test").click();
  overallOnly.elements.overallTimerSetting.value="600";
  overallOnly.elements.questionTimerSetting.value="off";
  overallOnly.elements.startBtn.click();
  overallOnly.elements.options.children[0].click();
  overallOnly.elements.nextBtn.click();
  overallOnly.elements.mobilePreviousBtn.click();
  overallOnly.elements.options.children[1].click();
  const overallOnlyRow=[...overallOnly.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  const overallOnlyActive=JSON.parse(overallOnlyRow[1]).data.activeAttempt;
  assert.equal(overallOnlyActive.overallTimeLimitSeconds,600,"overall-only test stores the selected quiz deadline");
  assert.equal(overallOnlyActive.questionTimeLimitSeconds,null,"overall-only timer leaves question clocks disabled");
  assert.equal(overallOnlyActive.answers[0].selectedOptionId,overallOnlyActive.questions[0].optionIds[1],"overall-only mode permits returning and changing an earlier answer");

  const custom=makeEnvironment();
  await delay();
  custom.modeButtons.find(button=>button.dataset.mode==="test").click();
  custom.elements.overallTimerSetting.value="custom";custom.elements.overallTimerCustom.value="25";
  custom.elements.questionTimerSetting.value="custom";custom.elements.questionTimerCustom.value="35";
  custom.elements.startBtn.click();
  let customRow=[...custom.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  let customActive=JSON.parse(customRow[1]).data.activeAttempt;
  assert.equal(customActive.overallTimeLimitSeconds,1500,"custom overall timer is stored as seconds");
  assert.equal(customActive.questionTimeLimitSeconds,35,"custom question timer is stored as seconds");
  const firstQuestionDeadline=customActive.questionDeadlines["0"];
  assert.ok(firstQuestionDeadline,"question timer starts on first view");
  custom.elements.nextBtn.click();
  customRow=[...custom.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  customActive=JSON.parse(customRow[1]).data.activeAttempt;
  assert.ok(customActive.questionDeadlines["1"],"new question receives its own deadline");
  custom.elements.mobilePreviousBtn.click();
  customRow=[...custom.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  customActive=JSON.parse(customRow[1]).data.activeAttempt;
  assert.equal(customActive.questionDeadlines["0"],firstQuestionDeadline,"revisiting a question never restarts its timer");
  custom.elements.options.children[0].click();
  custom.elements.options.children[1].click();
  customRow=[...custom.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  customActive=JSON.parse(customRow[1]).data.activeAttempt;
  assert.equal(customActive.answers[0].selectedOptionId,customActive.questions[0].optionIds[1],"a revisited answer can be changed after the suggested question pace has elapsed, while overall quiz time remains");
  custom.elements.navigatorInlineBtn.click();
  assert.equal(custom.elements.questionNavigatorGrid.children.length,2,"desktop navigator uses the same question list");
  custom.elements.questionNavigatorGrid.children[1].click();
  assert.equal(custom.elements.numberPill.textContent,"Question 2 / 2","question palette jumps to the selected question");

  const expiring=makeEnvironment();
  await delay();
  expiring.modeButtons.find(button=>button.dataset.mode==="test").click();
  expiring.elements.questionTimerSetting.value="15";
  expiring.elements.startBtn.click();
  let expiringRow=[...expiring.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  let expiringWrapped=JSON.parse(expiringRow[1]);
  expiringWrapped.data.activeAttempt.questionDeadlines["0"]="2000-01-01T00:00:00.000Z";
  expiring.values.set(expiringRow[0],JSON.stringify(expiringWrapped));
  const afterExpiry=makeEnvironment(expiring.values);
  await delay();
  assert.equal(afterExpiry.elements.numberPill.textContent,"Question 1 / 2","expired pace target does not automatically advance the question");
  assert.equal(afterExpiry.elements.options.children[0].disabled,false,"expired pace target never disables answer choices");
  afterExpiry.elements.options.children[0].click();
  const expiredRow=[...afterExpiry.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("mathematics"));
  const expiredActive=JSON.parse(expiredRow[1]).data.activeAttempt;
  assert.ok(expiredActive.answers[0],"question remains editable after the pace target expires");
  afterExpiry.elements.mobileNavigatorBtn.click();
  assert.equal(afterExpiry.elements.questionNavigatorGrid.children[0].disabled,false,"pace reached does not disable navigator jump");
  assert.ok(afterExpiry.elements.questionNavigatorGrid.children[0].attributes["aria-label"].includes("suggested pace reached"));

  const science=makeEnvironment(new Map(),"science");
  await delay();
  assert.equal(science.elements.subjectTitle.textContent,"Science Practice","Science is registered in the common engine");
  science.elements.startBtn.click();
  const scienceLedger=[...science.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("science"));
  assert.ok(scienceLedger,"Science sessions use the shared attempt ledger");
  const scienceWrapped=JSON.parse(scienceLedger[1]);
  assert.equal(scienceWrapped.data.activeAttempt.subjectId,"science");
  assert.equal(scienceWrapped.data.activeAttempt.status,"in-progress");
  const practiceHtml=fs.readFileSync("practice.html","utf8");
  assert.ok(practiceHtml.includes(".foot .btnrow #submitBtn,.foot .btnrow #nextBtn{display:none}"),"mobile layout avoids duplicate inline and dock navigation controls");
  const olympiadBank=JSON.parse(fs.readFileSync("data/class-6-science-sof.json","utf8"));
  const timerSwitch=makeEnvironment(new Map(),"science-sof","6",olympiadBank);
  await delay();
  timerSwitch.elements.overallTimerSetting.value="600";
  timerSwitch.modeButtons.find(button=>button.dataset.mode==="olympiad").click();
  assert.equal(timerSwitch.elements.overallTimerSetting.value,"3600","entering Olympiad temporarily forces its 60-minute timer");
  timerSwitch.modeButtons.find(button=>button.dataset.mode==="test").click();
  assert.equal(timerSwitch.elements.overallTimerSetting.value,"600","leaving Olympiad restores the learner's previous timer preference");
  const olympiad=makeEnvironment(new Map(),"science-sof","6",olympiadBank);
  await delay();
  const olympiadButton=olympiad.modeButtons.find(button=>button.dataset.mode==="olympiad");
  assert.equal(olympiadButton.classList.contains("hide"),false,"full-mock option is visible in Class 6 SOF Science");
  olympiadButton.click();
  assert.equal(olympiad.elements.chapterControls.classList.contains("hide"),true,"chapter filtering is hidden for a full blueprint exam");
  assert.equal(olympiad.elements.lengthControl.classList.contains("hide"),true,"full-mock question count is fixed by the blueprint");
  assert.equal(olympiad.elements.overallTimerSetting.value,"3600","SOF mock fixes its overall duration at 60 minutes");
  assert.equal(olympiad.elements.questionTimerSetting.value,"off","question-level countdown is disabled in an Olympiad mock");
  olympiad.elements.startBtn.click();
  assert.equal(olympiad.elements.session.classList.contains("hide"),false,"Olympiad mock starts through the shared quiz engine");
  assert.equal(olympiad.elements.numberPill.textContent,"Question 1 / 50","the complete 50-question paper is generated");
  assert.equal(olympiad.elements.chapterPill.textContent,"Logical Reasoning","section label replaces chapter label during the mock");
  assert.equal(olympiad.elements.sectionPill.classList.contains("hide"),false,"section position is shown beside question number");
  const olympiadLedger=[...olympiad.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("class-6-science-sof"));
  assert.ok(olympiadLedger,"Olympiad attempt uses the existing Class 6 SOF ledger");
  let olympiadActive=JSON.parse(olympiadLedger[1]).data.activeAttempt;
  assert.equal(olympiadActive.examType,"olympiad");
  assert.equal(olympiadActive.mode,"olympiad-exam");
  assert.equal(olympiadActive.timeLimitSeconds,3600);
  assert.equal(olympiadActive.questions.length,50);
  assert.equal(new Set(olympiadActive.questionIds).size,50,"paper contains no repeated questions");
  assert.deepEqual(olympiadActive.sectionBlueprint.map(section=>section.questionCount),[10,35,5]);
  assert.deepEqual(olympiadActive.sectionBlueprint.map(section=>section.maxMarks),[10,35,15]);
  olympiad.elements.mobileNavigatorBtn.click();
  assert.equal(olympiad.elements.questionNavigatorGrid.children.length,50,"mobile question navigator lists the entire paper");
  assert.equal(olympiad.elements.navigatorSectionSummary.children.length,3,"navigator displays section-level completion chips");
  olympiad.elements.closeQuestionNavigator.click();
  const firstCorrect=olympiadActive.questions[0].answer;
  olympiad.elements.options.children[firstCorrect].click();
  assert.equal(olympiad.elements.options.children[firstCorrect].classList.contains("selected"),true);
  olympiad.elements.submitBtn.click();
  assert.equal(olympiad.elements.results.classList.contains("hide"),false,"full mock can be submitted through the normal flow");
  const olympiadResultRow=[...olympiad.values.entries()].find(([key])=>key.includes("test-attempt-ledger")&&key.endsWith("class-6-science-sof"));
  const olympiadResult=JSON.parse(olympiadResultRow[1]).data.attempts[0];
  assert.equal(olympiadResult.maxMarks,60);
  assert.equal(olympiadResult.marksEarned,1,"one correct Logical Reasoning answer earns one mark");
  assert.equal(olympiadResult.marksAccuracy,2);
  assert.equal(olympiadResult.sectionResults.length,3);
  assert.equal(olympiadResult.sectionResults[0].marksEarned,1);
  assert.equal(olympiadResult.sectionResults[0].unansweredCount,9);
  assert.equal(olympiad.elements.sectionResults.children.length,4,"result view contains heading and three section cards");
  assert.equal(olympiad.elements.scorePct.textContent,"1 / 60","Olympiad score uses weighted marks, not raw correct-question percentage");
  assert.equal(olympiad.elements.scoreUnit.textContent,"marks");
  assert.equal(typeof olympiad.elements.reportExcelBtn.onclick,"function");
  assert.equal(typeof olympiad.elements.reportPdfBtn.onclick,"function");
  assert.ok(practiceHtml.includes('data-mode="olympiad"'),"practice page exposes the Olympiad mode");
  assert.ok(practiceHtml.indexOf("./js/olympiad-blueprints.js")<practiceHtml.indexOf("./js/session-model.js"),"blueprint helper loads before session model");

  console.log("Quiz integration tests passed: mobile question focus and navigator, timers, autosave/recovery, review downloads, weighted SOF mock construction, section navigation and section-wise results.");
})().catch(error=>{console.error(error);process.exitCode=1;});
