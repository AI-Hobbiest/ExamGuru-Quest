"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const values=new Map(),session=new Map([["examguru_active_institution_v1","inst-a"],["examguru_rbac_test_role_v1","school_admin"]]);
values.set("examguru_institution_content_v1",JSON.stringify({schemaVersion:1,institutions:{"inst-a":{banks:[{bankId:"legacy-bank",questions:[]}],papers:[]}}}));
const ctx={window:{ExamGuruLocalIAM:{findInstitution:id=>id==="inst-a"?{institutionId:id}:null}},localStorage:{
 getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)
},sessionStorage:{getItem:key=>session.has(key)?session.get(key):null},Math,Date,Array,String,Number,Set,Map,TypeError,Error,JSON,Uint8Array};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/storage.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("js/institution-content-store.js","utf8"),ctx);
const api=ctx.window.ExamGuruInstitutionContent;
assert.equal(api.key,"examguru_institution_content_v1");
assert.equal(api.list().banks[0].bankId,"legacy-bank","legacy tenant content survives one-way migration");
const bank=api.saveBank({name:"Science copy",contentClassId:"6",subject:"science",rows:[{questionId:"q1",question:"Test"}]});
assert.equal(bank.status,"draft");
assert.equal(api.list().banks.length,2);
const published=api.publish("bank",bank.bankId);
assert.equal(published.status,"published");
const envelope=JSON.parse(values.get("c10playground:store:v1:institution-content:all"));
assert.equal(envelope.data.institutions["inst-a"].banks.length,2);
assert.equal(values.has("examguru_institution_content_v1"),false,"legacy key is removed only after successful versioned persistence");
console.log("Institution content adapter tests passed: legacy migration, tenant-local CRUD, publish and versioned persistence.");
