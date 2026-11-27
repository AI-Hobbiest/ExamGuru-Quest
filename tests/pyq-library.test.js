"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const script=fs.readFileSync("js/pyq-library.js","utf8");
const catalogue=JSON.parse(fs.readFileSync("data/cbse-class10-pyq.json","utf8"));
const workflow=fs.readFileSync(".github/workflows/pages.yml","utf8");
assert.equal(catalogue.kind,"cbse-class10-pyq-catalog");
assert.equal(catalogue.records.length,42);
assert.ok(script.includes('DATA_URL="./data/cbse-class10-pyq.json"'));
assert.ok(script.includes("safeExternalLink"));
assert.ok(!script.includes("cbse-papers/files/"),"student PYQ page must not depend on locally mirrored PDFs");
assert.ok(!script.includes("cbse-class10-pyq-files.json"),"student PYQ page must load the compact catalogue only");
for(const row of catalogue.records){
 assert.ok(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/.+\.zip$/i.test(row.paperUrl),"question package must be an official CBSE ZIP: "+row.id);
 if(row.markingSchemeUrl)assert.ok(/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/.+\.zip$/i.test(row.markingSchemeUrl),"marking scheme must be an official CBSE ZIP: "+row.id);
}
assert.ok(workflow.includes("cp .cache/cbse-pyq-output/data/cbse-class10-pyq-files.json"));
assert.ok(!workflow.includes("cp -R .cache/cbse-pyq-output/cbse-papers/. _site/cbse-papers/"),"staging must not publish extracted PDF payloads");
assert.ok(workflow.includes("fs.existsSync('_site/cbse-papers')"),"build must fail if extracted PDFs accidentally enter the published site");
const generator=fs.readFileSync("js/exam-paper-generator.js","utf8");
assert.ok(generator.includes("function generatePaper")&&generator.includes("function validateQuestionBank"),"JSON question-bank paper generation remains available");
assert.ok(!generator.includes("cbse-papers"),"on-demand paper generator must not depend on the PDF archive");
console.log("PYQ regression passed: JSON catalogue, official CBSE ZIP links, no bundled PDFs, and JSON-driven paper generation.");
