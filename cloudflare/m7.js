const DURATION_DAYS = new Set([1,3,7,14]);
const DATA_PROFILES = new Set(["standard_sample","school_sample","department_sample","teaching_sample","parent_sample","student_sample"]);
const PERSONAS = {
  "institution-admin": {roles:["school_admin"],dataProfile:"school_sample",version:1},
  "institution-viewer": {roles:["institution_viewer"],dataProfile:"school_sample",version:1},
  "teacher": {roles:["teacher"],dataProfile:"teaching_sample",version:1},
  "hod-teacher": {roles:["teacher","hod"],dataProfile:"department_sample",version:1},
  "parent": {roles:["parent"],dataProfile:"standard_sample",version:1},
  "student": {roles:["student"],dataProfile:"standard_sample",version:1}
};
const nowIso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const safeText=(v,max)=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=max&&!/[<>]/.test(v);
const localJson=(request,env,payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
const localFail=(request,env,status,message)=>localJson(request,env,{ok:false,error:message},status);
async function audit(env,demoId,actor,action,details={}) {
  await env.DB.prepare("INSERT INTO demo_audit_events(event_id,demo_id,actor_user_id,action,details_json,created_at) VALUES(?,?,?,?,?,?)")
    .bind(id(),demoId,actor,action,JSON.stringify(details),nowIso()).run();
}
function seedRecords(demoId,generation,profile,createdAt) {
  const school=profile==="teaching_sample"?"ExamGuru Learning Centre": "Demo Public School";
  const rows=[
    ["institution","demo-institution",{name:school,synthetic:true}],
    ["branch","demo-main",{name:"Main Campus",synthetic:true}],
    ["class","class-6",{label:"Class 6",academicYear:"2026-27",synthetic:true}],
    ["class","class-10",{label:"Class 10",academicYear:"2026-27",synthetic:true}],
    ["subject","science",{label:"Science",synthetic:true}],
    ["subject","mathematics",{label:"Mathematics",synthetic:true}],
    ["teacher","teacher-001",{displayName:"Aarav Sharma",synthetic:true}],
    ["student","student-001",{displayName:"Anaya Rao",classId:"class-6",synthetic:true}],
    ["student","student-002",{displayName:"Ishaan Mehta",classId:"class-10",synthetic:true}],
    ["parent","parent-001",{displayName:"Demo Guardian",linkedStudentIds:["student-001"],synthetic:true}],
    ["sample-assessment","assessment-001",{title:"Science Progress Check",questionCount:10,synthetic:true}]
  ];
  return rows.map(([type,key,payload])=>({demoId,generation,recordType:type,recordKey:key,payloadJson:JSON.stringify({...payload,dataProfile:profile}),createdAt}));
}
async function provisionBaseline(env,demoId,generation,profile) {
  const rows=seedRecords(demoId,generation,profile,nowIso());
  for(const row of rows) await env.DB.prepare("INSERT INTO demo_sample_records(demo_id,generation,record_type,record_key,payload_json,created_at) VALUES(?,?,?,?,?,?)")
    .bind(row.demoId,row.generation,row.recordType,row.recordKey,row.payloadJson,row.createdAt).run();
  return rows.length;
}
async function expireIfNeeded(env,row) {
  if(row.status==="active"&&row.expires_at<=nowIso()) {
    await env.DB.prepare("UPDATE demo_environments SET status='expired',session_version=session_version+1,updated_at=? WHERE demo_id=? AND status='active' AND expires_at<=?")
      .bind(nowIso(),row.demo_id,nowIso()).run();
    return {...row,status:"expired",session_version:Number(row.session_version)+1};
  }
  return row;
}
export async function handleM7(request,env,who,hasPlatformAdminGrant,respond,deny) {
  const json=respond||localJson, fail=deny||localFail;
  const path=new URL(request.url).pathname,method=request.method.toUpperCase();
  if(!path.startsWith("/api/v2/platform/demos"))return null;
  if(!env.DB)return fail(request,env,503,"D1 database binding is not configured.");
  if(!(await hasPlatformAdminGrant(env,who)))return fail(request,env,403,"Active Platform Admin grant required.");
  if(path==="/api/v2/platform/demos"&&method==="GET") {
    const rows=await env.DB.prepare("SELECT demo_id AS demoId,tenant_id AS tenantId,kind,template_id AS templateId,template_version AS templateVersion,display_name AS displayName,roles_json AS roles,data_profile AS dataProfile,status,created_at AS createdAt,expires_at AS expiresAt,session_version AS sessionVersion,reset_generation AS resetGeneration,last_reset_at AS lastResetAt FROM demo_environments ORDER BY created_at DESC LIMIT 200").all();
    const demos=[];
    for(const row of rows.results||[]) {
      const state=await expireIfNeeded(env,{...row,demo_id:row.demoId,expires_at:row.expiresAt,status:row.status,session_version:row.sessionVersion});
      demos.push({...row,status:state.status,roles:JSON.parse(row.roles||"[]")});
      delete demos[demos.length-1].roles_json;
    }
    return json(request,env,{ok:true,demos});
  }
  if(path==="/api/v2/platform/demos"&&method==="POST") {
    const body=await request.json().catch(()=>null);
    if(!body||!["persona","on_demand"].includes(body.kind))return fail(request,env,400,"Choose persona or on-demand demo creation.");
    const duration=body.durationDays===undefined?7:Number(body.durationDays);
    if(!DURATION_DAYS.has(duration))return fail(request,env,400,"Duration must be 1, 3, 7 or 14 days.");
    if(body.displayName!==undefined&&!safeText(body.displayName,100))return fail(request,env,400,"Enter a valid demo display name.");
    let roles=[],profile="standard_sample",templateId=null,templateVersion=null;
    if(body.kind==="persona") {
      templateId=String(body.templateId||"");
      const t=PERSONAS[templateId];
      if(!t)return fail(request,env,400,"Unknown or inactive demo persona.");
      roles=t.roles;profile=t.dataProfile;templateVersion=t.version;
    } else {
      roles=Array.isArray(body.roles)?[...new Set(body.roles.map(String))]:[];
      profile=String(body.dataProfile||"standard_sample");
      const allowed=new Set(["school_admin","institution_viewer","teacher","hod","parent","student"]);
      if(!roles.length||roles.some(r=>!allowed.has(r))||roles.includes("platform_admin"))return fail(request,env,400,"Choose only permitted demo roles. Platform Admin is never available.");
      if(roles.includes("hod")&&!roles.includes("teacher"))return fail(request,env,400,"HOD is a Teacher responsibility and must include Teacher.");
      if(!DATA_PROFILES.has(profile))return fail(request,env,400,"Choose an approved synthetic sample-data profile.");
    }
    const demoId=id(),tenantId="DEMO-"+id().replace(/-/g,"").slice(0,16).toUpperCase(),createdAt=nowIso(),expiresAt=new Date(Date.now()+duration*86400000).toISOString(),displayName=(body.displayName||"ExamGuru demo").trim();
    try {
      await env.DB.prepare("INSERT INTO demo_environments(demo_id,tenant_id,kind,template_id,template_version,display_name,roles_json,data_profile,status,created_by_user_id,created_at,expires_at,session_version,reset_generation,updated_at) VALUES(?,?,?,?,?,?,?,?,'active',?,?,?,1,1,?)")
        .bind(demoId,tenantId,body.kind,templateId,templateVersion,displayName,JSON.stringify(roles),profile,who.user_id,createdAt,expiresAt,createdAt).run();
      const seeded=await provisionBaseline(env,demoId,1,profile);
      await audit(env,demoId,who.user_id,"created",{kind:body.kind,templateId,roles,dataProfile:profile,durationDays:duration,seededRecordCount:seeded});
      return json(request,env,{ok:true,demo:{demoId,tenantId,kind:body.kind,templateId,templateVersion,displayName,roles,dataProfile:profile,status:"active",createdAt,expiresAt,sessionVersion:1,resetGeneration:1,seededRecordCount:seeded}},201);
    } catch(_) { return fail(request,env,500,"Demo environment could not be provisioned. No access credentials were issued."); }
  }
  const match=path.match(/^\/api\/v2\/platform\/demos\/([A-Za-z0-9_-]+)(?:\/(extend|reset|revoke|audit))?$/);
  if(!match)return fail(request,env,404,"Demo resource not found.");
  const demoId=decodeURIComponent(match[1]),action=match[2]||"";
  const row=await env.DB.prepare("SELECT * FROM demo_environments WHERE demo_id=?").bind(demoId).first();
  if(!row)return fail(request,env,404,"Demo environment not found.");
  const state=await expireIfNeeded(env,row);
  if(action==="audit"&&method==="GET") {
    const events=await env.DB.prepare("SELECT event_id AS eventId,action,details_json AS details,created_at AS createdAt FROM demo_audit_events WHERE demo_id=? ORDER BY created_at DESC LIMIT 100").bind(demoId).all();
    return json(request,env,{ok:true,events:(events.results||[]).map(e=>({...e,details:JSON.parse(e.details||"{}")}))});
  }
  if(action==="extend"&&method==="POST") {
    if(state.status==="revoked")return fail(request,env,409,"A revoked demo cannot be extended.");
    const body=await request.json().catch(()=>({})),days=Number(body.additionalDays);
    if(!DURATION_DAYS.has(days))return fail(request,env,400,"Extension must be 1, 3, 7 or 14 days.");
    const expiresAt=new Date(Date.now()+days*86400000).toISOString();
    await env.DB.prepare("UPDATE demo_environments SET status='active',expires_at=?,session_version=session_version+1,updated_at=? WHERE demo_id=? AND status<>'revoked'").bind(expiresAt,nowIso(),demoId).run();
    await audit(env,demoId,who.user_id,"extended",{additionalDays:days,expiresAt});
    return json(request,env,{ok:true,demoId,expiresAt,sessionVersion:Number(state.session_version)+1});
  }
  if(action==="reset"&&method==="POST") {
    if(state.status==="revoked")return fail(request,env,409,"A revoked demo cannot be reset.");
    const generation=Number(state.reset_generation)+1,stamp=nowIso();
    await env.DB.prepare("UPDATE demo_environments SET reset_generation=?,last_reset_at=?,session_version=session_version+1,updated_at=? WHERE demo_id=? AND status<>'revoked'").bind(generation,stamp,stamp,demoId).run();
    const seeded=await provisionBaseline(env,demoId,generation,state.data_profile);
    await audit(env,demoId,who.user_id,"reset",{generation,seededRecordCount:seeded});
    return json(request,env,{ok:true,demoId,resetGeneration:generation,sessionVersion:Number(state.session_version)+1,seededRecordCount:seeded});
  }
  if(action==="revoke"&&method==="POST") {
    if(state.status==="revoked")return json(request,env,{ok:true,demoId,status:"revoked",idempotent:true});
    await env.DB.prepare("UPDATE demo_environments SET status='revoked',session_version=session_version+1,updated_at=? WHERE demo_id=?").bind(nowIso(),demoId).run();
    await audit(env,demoId,who.user_id,"revoked",{});
    return json(request,env,{ok:true,demoId,status:"revoked",sessionVersion:Number(state.session_version)+1});
  }
  return fail(request,env,405,"Unsupported demo operation.");
}
