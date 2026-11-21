/* Provider-neutral demo lifecycle. Production use requires server-backed repositories and authorization. */
(() => {
  "use strict";
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const text=value=>String(value==null?"":value).trim();
  const DURATIONS=Object.freeze([1,3,7,14]);
  const BASE_ROLES=Object.freeze(["school_admin","institution_viewer","teacher","parent","student"]);
  const AUDIT_ACTIONS=Object.freeze(["demo.created","demo.extended","demo.reset","demo.revoked"]);
  const fail=(message,code)=>{const error=new Error(message);error.code=code;throw error;};
  function createDemoManagementService(options){
    const opts=options||{},repo=opts.repository,audit=opts.auditRepository,templates=opts.templateRepository;
    if(!repo||!["create","get","list","update","resetData"].every(k=>typeof repo[k]==="function"))throw new TypeError("A demo repository implementing create, get, list, update and resetData is required.");
    if(!audit||typeof audit.append!=="function")throw new TypeError("An append-only audit repository is required.");
    if(typeof opts.authorize!=="function")throw new TypeError("A server-side Platform Admin authorization function is required.");
    if(!templates||typeof templates.get!=="function")throw new TypeError("A pre-created demo persona template repository is required.");
    const now=typeof opts.now==="function"?opts.now:()=>new Date();
    const makeId=typeof opts.makeId==="function"?opts.makeId:()=> "DEMO-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();
    const maxDuration=Number.isInteger(opts.maxDurationDays)?opts.maxDurationDays:14;
    function current(){const value=now();const date=value instanceof Date?value:new Date(value);if(!Number.isFinite(date.getTime()))throw new TypeError("The demo service clock is invalid.");return date;}
    async function platformAdmin(actor,action,scope){
      const decision=await opts.authorize(actor,"platform.demo."+action,clone(scope||{}));
      if(!decision||decision.allowed!==true)fail("Platform Admin authorization is required for demo management.","forbidden");
    }
    function roles(input){
      const values=[...new Set((Array.isArray(input)?input:[]).map(text).filter(Boolean))];
      if(!values.length)fail("Select at least one demo role.","invalid-roles");
      if(values.some(role=>!BASE_ROLES.includes(role)&&role!=="hod"))fail("Demo environments cannot grant Platform Admin or unknown roles.","invalid-roles");
      if(values.includes("hod")&&!values.includes("teacher"))fail("HOD is an additional responsibility and requires a Teacher persona.","invalid-roles");
      return values.sort();
    }
    function duration(value){const days=Number(value==null?7:value);if(!DURATIONS.includes(days)||days>maxDuration)fail("Choose a permitted demo duration: "+DURATIONS.filter(x=>x<=maxDuration).join(", ")+" days.","invalid-duration");return days;}
    function active(record,at=current()){
      if(!record||record.status!=="active")return false;
      const expiry=new Date(record.expiresAt);
      return Number.isFinite(expiry.getTime())&&expiry.getTime()>at.getTime();
    }
    function safeRecord(record){
      if(!record)return null;
      const result=clone(record);
      delete result.password;delete result.passwordHash;delete result.salt;delete result.token;delete result.accessToken;delete result.refreshToken;delete result.credentials;
      return result;
    }
    async function writeAudit(actor,action,record,details){
      if(!AUDIT_ACTIONS.includes(action))throw new TypeError("Unsupported demo audit action.");
      await audit.append({eventId:makeId(),action,actorId:text(actor&&actor.userId)||"unknown",demoId:record.demoId,occurredAt:current().toISOString(),details:clone(details||{})});
    }
    async function create(actor,input){
      const data=input||{};await platformAdmin(actor,"create",{kind:data.kind});
      const kind=data.kind==="persona"?"persona":data.kind==="on_demand"?"on_demand":null;
      if(!kind)fail("Choose a pre-created persona or an on-demand demo.","invalid-kind");
      if(kind==="persona"&&!text(data.templateId))fail("A pre-created persona template is required.","missing-template");
      if(kind==="on_demand"&&text(data.templateId))fail("On-demand demos must not select a persona template.","invalid-template");
      const days=duration(data.durationDays);
      const template=kind==="persona"?await templates.get(text(data.templateId)):null;
      if(kind==="persona"&&(!template||template.status!=="active"))fail("The selected demo persona template is unavailable.","template-not-found");
      const selectedRoles=roles(kind==="persona"?template.roles:data.roles);
      const createdAt=current(),expiresAt=new Date(createdAt.getTime()+days*86400000);
      const record={demoId:makeId(),kind,templateId:kind==="persona"?text(data.templateId):null,
        displayName:text(data.displayName)|| (kind==="persona"?"Persona demo":"On-demand demo"),
        roles:selectedRoles,tenantType:"isolated_demo",tenantId:"DEMO-TENANT-"+makeId(),
        status:"active",createdAt:createdAt.toISOString(),expiresAt:expiresAt.toISOString(),
        durationDays:days,sessionVersion:1,dataProfile:text(kind==="persona"?(template.dataProfile||"standard_sample"):(data.dataProfile||"standard_sample")),
        templateVersion:kind==="persona"?String(template.version||"1"):null,
        createdBy:text(actor&&actor.userId),lastResetAt:null,revokedAt:null};
      await repo.create(clone(record));
      await writeAudit(actor,"demo.created",record,{kind,roles:selectedRoles,durationDays:days});
      return safeRecord(record);
    }
    async function requireRecord(actor,demoId,action){
      await platformAdmin(actor,action,{demoId:text(demoId)});
      const record=await repo.get(text(demoId));
      if(!record)fail("Demo environment was not found.","not-found");
      return record;
    }
    async function extend(actor,demoId,days){
      const record=await requireRecord(actor,demoId,"extend");
      if(record.status!=="active")fail("A revoked demo cannot be extended.","revoked");
      const add=duration(days),at=current();
      const currentExpiry=new Date(record.expiresAt);
      const base=Number.isFinite(currentExpiry.getTime())&&currentExpiry>at?currentExpiry:at;
      const expiresAt=new Date(base.getTime()+add*86400000);
      if(expiresAt.getTime()-at.getTime()>maxDuration*86400000)fail("The extension would exceed the maximum remaining demo lifetime.","duration-limit");
      const next={...record,expiresAt:expiresAt.toISOString(),durationDays:Number(record.durationDays||0)+add,sessionVersion:Number(record.sessionVersion||1)+1};
      await repo.update(next);await writeAudit(actor,"demo.extended",next,{addedDays:add,expiresAt:next.expiresAt});
      return safeRecord(next);
    }
    async function reset(actor,demoId){
      const record=await requireRecord(actor,demoId,"reset");
      if(!active(record))fail("Only an active, unexpired demo can be reset.","inactive");
      await repo.resetData(record.demoId,record.tenantId);
      const next={...record,lastResetAt:current().toISOString(),sessionVersion:Number(record.sessionVersion||1)+1};
      await repo.update(next);await writeAudit(actor,"demo.reset",next,{tenantId:record.tenantId});
      return safeRecord(next);
    }
    async function revoke(actor,demoId){
      const record=await requireRecord(actor,demoId,"revoke");
      if(record.status==="revoked")return safeRecord(record);
      const at=current(),next={...record,status:"revoked",revokedAt:at.toISOString(),sessionVersion:Number(record.sessionVersion||1)+1};
      await repo.update(next);await writeAudit(actor,"demo.revoked",next,{sessionVersion:next.sessionVersion});
      return safeRecord(next);
    }
    async function list(actor){
      await platformAdmin(actor,"list",{});
      const records=await repo.list();
      return (records||[]).map(record=>{const result=safeRecord(record);if(result&&result.status==="active"&&!active(result))result.lifecycleStatus="expired";return result;});
    }
    async function authorizeDemoSession(session){
      const value=session||{};
      if(!text(value.demoId)||!Number.isInteger(Number(value.sessionVersion)))return {allowed:false,reason:"invalid-demo-session"};
      const record=await repo.get(text(value.demoId));
      if(!active(record))return {allowed:false,reason:record&&record.status==="revoked"?"demo-revoked":"demo-expired"};
      if(Number(value.sessionVersion)!==Number(record.sessionVersion))return {allowed:false,reason:"demo-session-invalidated"};
      return {allowed:true,demoId:record.demoId,tenantId:record.tenantId,roles:clone(record.roles),expiresAt:record.expiresAt};
    }
    return Object.freeze({create,extend,reset,revoke,list,authorizeDemoSession,durations:DURATIONS,roles:BASE_ROLES});
  }
  const api=Object.freeze({createDemoManagementService,DURATIONS,BASE_ROLES});
  globalThis.ExamGuruDemoManagement=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
