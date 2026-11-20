"use strict";
const assert=require("node:assert/strict");
const api=require("../js/domain/demo-management.js");
let clock=new Date("2026-11-20T12:00:00.000Z"),sequence=0,reads=0,resets=[];
const records=new Map(),events=[];
const repository={
 async create(record){assert.ok(record.tenantId.startsWith("DEMO-TENANT-"));assert.equal(record.tenantType,"isolated_demo");records.set(record.demoId,JSON.parse(JSON.stringify(record)));},
 async get(id){return records.has(id)?JSON.parse(JSON.stringify(records.get(id))):null;},
 async list(){return [...records.values()].map(x=>JSON.parse(JSON.stringify(x)));},
 async update(record){records.set(record.demoId,JSON.parse(JSON.stringify(record)));},
 async resetData(demoId,tenantId){resets.push({demoId,tenantId});}
};
const templates={async get(id){return id==="school-admin"?{templateId:id,status:"active",version:3,roles:["school_admin","institution_viewer"],dataProfile:"school_sample"}:catalogue.get(id);}};
const service=api.createDemoManagementService({
 repository,auditRepository:{async append(event){events.push(event);}},
 templateRepository:templates,
 authorize:async(actor,permission)=>({allowed:actor&&actor.role==="platform_admin"&&permission.startsWith("platform.demo.")}),
 now:()=>new Date(clock),makeId:()=> "ID-"+(++sequence),
 maxDurationDays:14
});
const admin={userId:"platform-1",role:"platform_admin"};
(async()=>{
 const persona=await service.create(admin,{kind:"persona",templateId:"school-admin",durationDays:7,displayName:"School Admin Preview"});
 assert.deepEqual(persona.roles,["institution_viewer","school_admin"]);
 assert.equal(persona.expiresAt,"2026-11-27T12:00:00.000Z");
 assert.equal(persona.templateVersion,"3");
 assert.equal(persona.dataProfile,"school_sample");
 assert.ok(persona.tenantId.startsWith("DEMO-TENANT-"));
 assert.equal((await service.authorizeDemoSession({demoId:persona.demoId,sessionVersion:1})).allowed,true);
 const hod=await service.create(admin,{kind:"persona",templateId:"hod-teacher"});
 assert.deepEqual(hod.roles,["hod","teacher"],"HOD is an overlay on a Teacher persona");
 await assert.rejects(()=>service.create(admin,{kind:"persona",templateId:"missing"}),e=>e.code==="template-not-found");
 const onDemand=await service.create(admin,{kind:"on_demand",roles:["teacher","student"],durationDays:1});
 assert.deepEqual(onDemand.roles,["student","teacher"]);
 await assert.rejects(()=>service.create(admin,{kind:"on_demand",roles:["hod"]}),e=>e.code==="invalid-roles");
 await assert.rejects(()=>service.create(admin,{kind:"on_demand",roles:["platform_admin"]}),e=>e.code==="invalid-roles");
 await assert.rejects(()=>service.create(admin,{kind:"on_demand",roles:["student"],durationDays:2}),e=>e.code==="invalid-duration");
 await assert.rejects(()=>service.create({userId:"teacher",role:"teacher"},{kind:"on_demand",roles:["student"]}),e=>e.code==="forbidden");
 const extended=await service.extend(admin,onDemand.demoId,3);
 assert.equal(extended.sessionVersion,2,"extending invalidates sessions minted against the previous expiry");
 assert.equal((await service.authorizeDemoSession({demoId:onDemand.demoId,sessionVersion:1})).reason,"demo-session-invalidated");
 assert.equal((await service.authorizeDemoSession({demoId:onDemand.demoId,sessionVersion:2})).allowed,true);
 const reset=await service.reset(admin,onDemand.demoId);
 assert.equal(reset.sessionVersion,3,"reset invalidates existing demo sessions");
 assert.equal(resets.length,1);
 assert.equal(resets[0].tenantId,onDemand.tenantId);
 const revoked=await service.revoke(admin,onDemand.demoId);
 assert.equal(revoked.status,"revoked");
 assert.equal(revoked.sessionVersion,4);
 assert.equal((await service.authorizeDemoSession({demoId:onDemand.demoId,sessionVersion:4})).reason,"demo-revoked");
 const idempotentRevoke=await service.revoke(admin,onDemand.demoId);
 assert.equal(idempotentRevoke.status,"revoked");
 clock=new Date("2026-12-01T12:00:00.000Z");
 assert.equal((await service.authorizeDemoSession({demoId:persona.demoId,sessionVersion:1})).reason,"demo-expired");
 const listing=await service.list(admin);
 assert.equal(listing.find(x=>x.demoId===persona.demoId).lifecycleStatus,"expired");
 assert.equal(events.filter(x=>x.action==="demo.created").length,3);
 assert.ok(events.some(x=>x.action==="demo.extended"));
 assert.ok(events.some(x=>x.action==="demo.reset"));
 assert.ok(events.some(x=>x.action==="demo.revoked"));
 assert.ok(events.every(x=>!JSON.stringify(x).match(/passwordHash|refreshToken|accessToken|salt/)));
 assert.equal(events[0].actorId,"platform-1");
 console.log("M7 demo lifecycle tests passed: persona/on-demand creation, role policy, expiry, session invalidation, reset/revoke and audit.");
})().catch(error=>{console.error(error);process.exitCode=1;});
