"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const prefix="https://ai-hobbiest.github.io/ExamGuru-Quest/";
const contractDir="data/contracts/v1";
const schemas=fs.readdirSync(contractDir).filter(name=>name.endsWith(".schema.json"));
assert.ok(schemas.length>0,"versioned schema contracts should exist");
for(const name of schemas){
  const schema=JSON.parse(fs.readFileSync(contractDir+"/"+name,"utf8"));
  assert.ok(typeof schema.$id==="string"&&schema.$id.startsWith(prefix),name+" must use the canonical ExamGuru Quest schema URL");
  assert.ok(!schema.$id.includes("C10-Playground"),name+" must not refer to the retired Pages path");
}
const readme=fs.readFileSync("README.md","utf8");
assert.ok(readme.includes("https://ai-hobbiest.github.io/ExamGuru-Quest/"),"README must publish the canonical portal URL");
assert.ok(!readme.includes("ai-hobbiest.github.io/C10-Playground"),"README must not retain the retired portal URL");
const wrangler=fs.readFileSync("cloudflare/wrangler.toml","utf8");
assert.ok(wrangler.includes("https://ai-hobbiest.github.io/ExamGuru-Quest/admin.html"),"future Worker admin redirect must use canonical URL");
assert.ok(!wrangler.includes("ai-hobbiest.github.io/C10-Playground"),"future Worker config must not retain the retired Pages URL");
console.log("Canonical URL tests passed: schema IDs, README and future Worker redirects use ExamGuru-Quest.");
