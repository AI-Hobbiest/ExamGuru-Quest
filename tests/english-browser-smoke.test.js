"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const {chromium}=require("playwright");
const ROOT=process.cwd();
const ENGLISH_ID="class-10-english-language-literature-2026-27";
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon"};
function startServer(){
 const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400).end("Bad request");return;}
  const relative=pathname==="/"?"index.html":pathname.replace(/^\/+/, "");
  const file=path.resolve(ROOT,relative);
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403).end("Forbidden");return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end("Not found: "+relative);return;}
   let output=data;
   // Test-only unlocks: production profile and blueprint stay disabled/draft.
   if(relative==="data/exam-papers/profile-registry.json"){
    const registry=JSON.parse(data.toString("utf8"));
    const english=registry.profiles.find(item=>item.profileId===ENGLISH_ID);
    assert.ok(english,"English profile must exist in the published registry");
    english.enabled=true;
    output=Buffer.from(JSON.stringify(registry));
   }else if(relative==="data/exam-papers/blueprints/class-10-english-language-literature-2026-27.json"){
    const blueprint=JSON.parse(data.toString("utf8"));
    blueprint.status="ready";
    output=Buffer.from(JSON.stringify(blueprint));
   }
   res.writeHead(200,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
   res.end(output);
  });
 });
 return new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve(server));});
}
(async()=>{
 const server=await startServer(),address=server.address(),baseUrl="http://127.0.0.1:"+address.port;
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  await context.addInitScript(()=>sessionStorage.setItem("c10playground_static_student_v1",JSON.stringify({username:"jp10",role:"student",classId:"10"})));
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(error.message));
  page.on("dialog",dialog=>dialog.accept());
  await page.goto(baseUrl+"/exam-practice.html?profile="+encodeURIComponent(ENGLISH_ID),{waitUntil:"networkidle"});
  await page.waitForFunction(()=>{const status=document.querySelector("#loadStatus")?.textContent||"";return status.includes("Ready:")||status.includes("Unable to prepare");});
  const loadStatus=await page.locator("#loadStatus").innerText();
  assert.match(loadStatus,/Ready: 11 questions · 80 marks/,"English should load its complete 11-question, 80-mark profile");
  assert.equal(await page.locator("#profileTitle").innerText(),"Class 10 · English Language & Literature (184)");
  await page.locator("#startBtn").click();
  await page.locator("#attempt").waitFor({state:"visible"});
  assert.equal(await page.locator("#questions .exam-question").count(),11);
  assert.match(await page.locator("#timer").innerText(),/^(03:00:00|02:59:[0-5]\d)$/);
  assert.match(await page.locator("#historyStatus").innerText(),/50-paper repeat protection is active/);

  // Q3: change the selected ten grammar tasks while keeping the attempt limit.
  const grammar=page.locator("#questions .exam-question").nth(2);
  const grammarItems=grammar.locator("input[data-part-attempt]");
  assert.equal(await grammarItems.count(),12);
  assert.equal(await grammarItems.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),10);
  await grammarItems.nth(0).uncheck();
  await grammarItems.nth(11).check();
  assert.equal(await grammarItems.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),10);
  assert.equal(await grammar.locator('[data-attempt-part-panel="0"]').isVisible(),false);
  assert.equal(await grammar.locator('[data-attempt-part-panel="11"]').isVisible(),true);

  // Q8 and Q9 attempt-any selection controls must retain their required counts.
  const q8=page.locator("#questions .exam-question").nth(7).locator("input[data-part-attempt]");
  const q9=page.locator("#questions .exam-question").nth(8).locator("input[data-part-attempt]");
  assert.equal(await q8.count(),5);assert.equal(await q8.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),4);
  assert.equal(await q9.count(),3);assert.equal(await q9.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),2);

  // Select an objective subpart so the submission path also exercises MCQ scoring.
  const objectiveOption=page.locator("#questions .exam-question input[data-part-option]").first();
  assert.ok(await objectiveOption.count()>0,"the English paper should render objective literature/reading subparts");
  await objectiveOption.check();

  // Q4: verify a student can revise a written answer before submission.
  const letter=page.locator("#questions .exam-question").nth(3);
  const letterAnswer=letter.locator('[data-choice-panel="main"] textarea').first();
  await letterAnswer.fill("Initial draft answer.");
  await letterAnswer.fill("Revised formal letter response for browser QA.");
  // Q10: select the internal-choice alternative and retain its written answer.
  const q10=page.locator("#questions .exam-question").nth(9);
  await q10.locator('input[data-choice][value="alternative"]').check();
  const q10Alternative=q10.locator('[data-choice-panel="alternative"] textarea').first();
  const alternativePrompt=await q10.locator('[data-choice-panel="alternative"] h4').innerText();
  await q10Alternative.fill("Final alternative long-answer response for browser QA.");

  // Reload mid-attempt and verify the exact paper, selected items and typed answers resume.
  const paperTitle=await page.locator("#paperTitle").innerText();
  await page.waitForTimeout(1200);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelector("#startBtn")?.textContent.includes("Resume saved attempt"));
  await page.locator("#startBtn").click();
  await page.locator("#attempt").waitFor({state:"visible"});
  assert.equal(await page.locator("#paperTitle").innerText(),paperTitle,"reload must resume the same paper snapshot");
  assert.equal(await page.locator("#questions .exam-question").nth(3).locator('[data-choice-panel="main"] textarea').first().inputValue(),"Revised formal letter response for browser QA.");
  const resumedQ10=page.locator("#questions .exam-question").nth(9);
  assert.equal(await resumedQ10.locator('input[data-choice][value="alternative"]').isChecked(),true);
  assert.equal(await resumedQ10.locator('[data-choice-panel="alternative"] textarea').first().inputValue(),"Final alternative long-answer response for browser QA.");
  const resumedGrammar=page.locator("#questions .exam-question").nth(2).locator("input[data-part-attempt]");
  assert.equal(await resumedGrammar.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),10,"attempt-any selection must restore after reload");
  assert.equal(await resumedGrammar.nth(0).isChecked(),false,"the deselected grammar item must remain deselected after reload");
  assert.equal(await resumedGrammar.nth(11).isChecked(),true,"the newly selected grammar item must remain selected after reload");

  await page.locator("#submitBtn").click();
  await page.locator("#review").waitFor({state:"visible"});
  const review=await page.locator("#reviewAnswers").innerText();
  assert.match(await page.locator("#score").innerText(),/MCQ score: \d+ \/ \d+/,"submission must calculate and display the objective score");
  assert.ok(review.includes("Revised formal letter response for browser QA."),"review must retain the latest edited written answer");
  assert.ok(review.includes(alternativePrompt),"review must show the selected Q10 alternative prompt");
  assert.ok(review.includes("Final alternative long-answer response for browser QA."),"review must retain the selected alternative answer");
  assert.equal(pageErrors.length,0,"browser page errors: "+pageErrors.join(" | "));
  await context.close();
  console.log("English browser smoke passed: 11 questions / 80 marks, attempt-any 10-of-12, 4-of-5 and 2-of-3 selection, written-answer editing, Q10 internal choice and submit review.");
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
