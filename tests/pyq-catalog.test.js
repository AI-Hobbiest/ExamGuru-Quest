"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const catalogue=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/cbse-class10-pyq.json"),"utf8"));
assert.equal(catalogue.kind,"cbse-class10-pyq-catalog");
assert.equal(catalogue.records.length,42,"catalogue includes 35 existing records plus seven 2026 Second Board subjects");
assert.equal(new Set(catalogue.records.map(row=>row.id)).size,catalogue.records.length,"paper record IDs are unique");
const second=catalogue.records.filter(row=>row.year==="2026"&&row.examType==="Second Board");
assert.equal(second.length,7,"all seven supported subjects include 2026 Second Board papers");
for(const row of catalogue.records){
  assert.ok(catalogue.subjects.some(subject=>subject.id===row.subjectId),"record subject exists: "+row.id);
  for(const url of [row.paperUrl,row.markingSchemeUrl]){
    const parsed=new URL(url);
    assert.equal(parsed.protocol,"https:");
    assert.equal(parsed.hostname,"www.cbse.gov.in");
    assert.ok(parsed.pathname.toLowerCase().endsWith(".zip"),"CBSE archive record points to an official ZIP");
  }
}
console.log("CBSE PYQ catalogue checks passed: 42 records, seven subjects, Main/Second Board and official CBSE ZIP URLs.");
