const DURATION_DAYS = new Set([1,3,7,14]);
const DATA_PROFILES = new Set(["standard_sample","school_sample","department_sample","teaching_sample","parent_sample","student_sample"]);
const PERSONAS = {
  "institution-admin": {roles:["school_admin"],dataProfile:"school_sample",version:1},
  "institution-viewer": {roles:["institution_viewer"],dataProfile:"school_sample",version:1},
  "teacher": {roles:["teacher"],dataProfile:"teaching_sample",version:1},
  "hod-teacher": {roles:["teacher","hod"],dataProfile:"department_sample",version:1},
  "parent": {roles:["parent"],dataProfile:"parent_sample",version:1},
  "student": {roles:["student"],dataProfile:"student_sample",version:1}
};
const nowIso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));
const base64url=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const randomSecret=(n=32)=>base64url(randomBytes(n));
const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)))),b=>b.toString(16).padStart(2,"0")).join("");
const saltValue=()=>randomSecret(16);
async function hashPassword(password,salt){
 let encoded=salt.replace(/-/g,"+").replace(/_/g,"/");encoded+="=".repeat((4-encoded.length%4)%4);
 const saltBytes=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
 const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:saltBytes,iterations:210000},material,256)),b=>b.toString(16).padStart(2,"0")).join("");
}
function constantEqual(a,b){a=String(a||"");b=String(b||"");if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function temporaryPassword(){return randomSecret(24)+"A7";}
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
    ["sample-assessment","assessment-001",{title:"Science Progress Check",questionCount:10,status:"published",synthetic:true}],
    ["teacher-assignment","assignment-001",{teacherId:"teacher-001",classId:"class-6",subjectId:"science",synthetic:true}],
    ["department","department-science",{name:"Science Department",synthetic:true}],
    ["hod-appointment","hod-primary",{teacherId:"teacher-001",departmentId:"department-science",appointmentType:"primary",synthetic:true}],
    ["parent-link","parent-student-001",{parentId:"parent-001",studentId:"student-001",relationship:"Parent",synthetic:true}],
    ["student-attempt","attempt-001",{studentId:"student-001",assessmentId:"assessment-001",score:8,maxScore:10,completedAt:"2026-11-18T10:30:00.000Z",synthetic:true}],
    ["student-attempt","attempt-002",{studentId:"student-002",assessmentId:"assessment-001",score:7,maxScore:10,completedAt:"2026-11-19T09:15:00.000Z",synthetic:true}],
    ["topic-mastery","mastery-001",{studentId:"student-001",subjectId:"science",topic:"Materials Around Us",mastery:0.82,synthetic:true}],
    ["topic-mastery","mastery-002",{studentId:"student-001",subjectId:"science",topic:"Separation of Substances",mastery:0.64,synthetic:true}],
    ["study-resource","resource-001",{title:"Science — Quick Revision Cards",classId:"class-6",subjectId:"science",synthetic:true}]
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
    const demoId=id(),tenantId="DEMO-TENANT-"+id().replace(/-/g,"").slice(0,16).toUpperCase(),createdAt=nowIso(),expiresAt=new Date(Date.now()+duration*86400000).toISOString(),displayName=(body.displayName||"ExamGuru demo").trim();
    const demoUsername="demo_"+randomSecret(9).toLowerCase().replace(/[-_]/g,"a"),demoPassword=temporaryPassword(),accountId=id(),passwordSalt=saltValue(),passwordDigest=await hashPassword(demoPassword,passwordSalt);
    try {
      await env.DB.prepare("INSERT INTO demo_environments(demo_id,tenant_id,kind,template_id,template_version,display_name,roles_json,data_profile,status,created_by_user_id,created_at,expires_at,session_version,reset_generation,updated_at) VALUES(?,?,?,?,?,?,?,?,'active',?,?,?,1,1,?)")
        .bind(demoId,tenantId,body.kind,templateId,templateVersion,displayName,JSON.stringify(roles),profile,who.user_id,createdAt,expiresAt,createdAt).run();
      await env.DB.prepare("INSERT INTO demo_accounts(account_id,demo_id,username,password_salt,password_hash,roles_json,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'active',?,?)")
        .bind(accountId,demoId,demoUsername,passwordSalt,passwordDigest,JSON.stringify(roles),createdAt,createdAt).run();
      const seeded=await provisionBaseline(env,demoId,1,profile);
      await audit(env,demoId,who.user_id,"created",{kind:body.kind,templateId,roles,dataProfile:profile,durationDays:duration,seededRecordCount:seeded,accountCount:1});
      return json(request,env,{ok:true,demo:{demoId,tenantId,kind:body.kind,templateId,templateVersion,displayName,roles,dataProfile:profile,status:"active",createdAt,expiresAt,sessionVersion:1,resetGeneration:1,seededRecordCount:seeded},credentials:{username:demoUsername,password:demoPassword,loginPath:"/demo-login.html",previewPath:"/demo-preview.html",expiresAt}},201);
    } catch(_) { try { await env.DB.prepare("DELETE FROM demo_environments WHERE demo_id=?").bind(demoId).run(); } catch(__) {} return fail(request,env,500,"Demo environment could not be provisioned. No access credentials were issued."); }
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
    if(state.status!=="active"||state.expires_at<=nowIso())return fail(request,env,409,"Only an active, unexpired demo can be reset.");
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

export async function handleM7Login(request,env,respond,deny){
 const json=respond||localJson,fail=deny||localFail;
 if(new URL(request.url).pathname!=="/api/demo/login"||request.method.toUpperCase()!=="POST")return null;
 if(!env.DB)return fail(request,env,503,"Demo service is not configured.");
 const body=await request.json().catch(()=>null),username=String(body&&body.username||"").trim().toLowerCase(),password=String(body&&body.password||"");
 if(!/^[a-z0-9_]{8,40}$/.test(username)||password.length<12||password.length>128)return fail(request,env,400,"Enter the demo username and password.");
 const key=await sha256(username),limit=await env.DB.prepare("SELECT failures,window_started_at,locked_until FROM demo_login_limits WHERE username_hash=?").bind(key).first();
 if(limit&&limit.locked_until&&limit.locked_until>nowIso())return fail(request,env,429,"Too many demo sign-in attempts. Try again later.");
 const row=await env.DB.prepare("SELECT a.account_id,a.demo_id,a.username,a.password_salt,a.password_hash,a.roles_json,a.status account_status,d.status demo_status,d.expires_at,d.session_version,d.tenant_id FROM demo_accounts a JOIN demo_environments d ON d.demo_id=a.demo_id WHERE a.username=?").bind(username).first();
 const candidate=row?await hashPassword(password,row.password_salt):await hashPassword(password,"AAAAAAAAAAAAAAAAAAAAAA");
 if(!row||row.account_status!=="active"||row.demo_status!=="active"||row.expires_at<=nowIso()||!constantEqual(candidate,row.password_hash)){
  const withinWindow=!!(limit&&limit.window_started_at&&Date.now()-new Date(limit.window_started_at).getTime()<15*60*1000);
  const failures=(withinWindow?Number(limit.failures||0):0)+1,windowStarted=withinWindow?limit.window_started_at:nowIso(),lockedUntil=failures>=8?new Date(Date.now()+15*60*1000).toISOString():null;
  await env.DB.prepare("INSERT INTO demo_login_limits(username_hash,failures,window_started_at,locked_until) VALUES(?,?,?,?) ON CONFLICT(username_hash) DO UPDATE SET failures=excluded.failures,window_started_at=excluded.window_started_at,locked_until=excluded.locked_until")
   .bind(key,failures,windowStarted,lockedUntil).run();
  return fail(request,env,401,"Demo username or password is incorrect, or the demo has expired.");
 }
 await env.DB.prepare("DELETE FROM demo_login_limits WHERE username_hash=?").bind(key).run();
 const token=randomSecret(32),tokenHash=await sha256(token),createdAt=nowIso(),expiry=new Date(Math.min(Date.now()+8*3600*1000,new Date(row.expires_at).getTime())).toISOString();
 await env.DB.prepare("INSERT INTO demo_sessions(session_id,token_hash,account_id,demo_id,session_version,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?)")
  .bind(id(),tokenHash,row.account_id,row.demo_id,Number(row.session_version),expiry,createdAt,createdAt).run();
 return json(request,env,{ok:true,token,expiresAt:expiry,redirectPath:"/demo-preview.html"});
}

export async function identifyM7DemoSession(request,env){
 if(!env.DB)return null;
 const match=(request.headers.get("Authorization")||"").match(/^Bearer ([A-Za-z0-9_-]{30,100})$/);if(!match)return null;
 const tokenHash=await sha256(match[1]);
 const row=await env.DB.prepare("SELECT s.session_id,s.token_hash,s.expires_at session_expires,s.session_version,s.revoked_at,a.account_id,a.username,a.roles_json,a.status account_status,d.demo_id,d.tenant_id,d.status demo_status,d.expires_at demo_expires,d.session_version current_version,d.reset_generation,d.display_name FROM demo_sessions s JOIN demo_accounts a ON a.account_id=s.account_id AND a.demo_id=s.demo_id JOIN demo_environments d ON d.demo_id=s.demo_id WHERE s.token_hash=?").bind(tokenHash).first();
 if(!row)return null;
 const valid=!row.revoked_at&&row.account_status==="active"&&row.demo_status==="active"&&row.session_expires>nowIso()&&row.demo_expires>nowIso()&&Number(row.session_version)===Number(row.current_version);
 if(!valid)return {recognized:true,valid:false,tokenHash,reason:row.revoked_at?"revoked":row.demo_status!=="active"?"inactive":"expired"};
 await env.DB.prepare("UPDATE demo_sessions SET last_seen_at=? WHERE session_id=?").bind(nowIso(),row.session_id).run();
 return {recognized:true,valid:true,tokenHash,sessionId:row.session_id,accountId:row.account_id,demoId:row.demo_id,tenantId:row.tenant_id,username:row.username,roles:JSON.parse(row.roles_json||"[]"),expiresAt:row.session_expires,displayName:row.display_name,resetGeneration:Number(row.reset_generation)};
}

export async function handleM7DemoSession(request,env,session,respond,deny){
 const json=respond||localJson,fail=deny||localFail,path=new URL(request.url).pathname,method=request.method.toUpperCase();
 if(path==="/api/demo/logout"&&method==="POST"){
  await env.DB.prepare("UPDATE demo_sessions SET revoked_at=? WHERE session_id=?").bind(nowIso(),session.sessionId).run();
  return json(request,env,{ok:true});
 }
 if(path==="/api/demo/me"&&method==="GET")return json(request,env,{ok:true,user:{username:session.username,roles:session.roles},demo:{demoId:session.demoId,tenantId:session.tenantId,displayName:session.displayName,expiresAt:session.expiresAt}});
 if(path==="/api/demo/data"&&method==="GET"){
  const rows=await env.DB.prepare("SELECT record_type AS type,record_key AS id,payload_json AS payload FROM demo_sample_records WHERE demo_id=? AND generation=? ORDER BY record_type,record_key").bind(session.demoId,session.resetGeneration).all();
  const records=(rows.results||[]).map(x=>({...x,payload:JSON.parse(x.payload)})),roles=new Set(session.roles||[]);
  let visible=records;
  if((roles.has("student")||roles.has("parent"))&&!roles.has("school_admin")&&!roles.has("teacher")&&!roles.has("hod")){
    visible=records.filter(x=>{
      if(roles.has("student")&&((x.type==="student"&&x.id==="student-001")||(x.type==="student-attempt"&&x.payload.studentId==="student-001")||(x.type==="topic-mastery"&&x.payload.studentId==="student-001")||x.type==="study-resource"||x.type==="class"&&x.id==="class-6"||x.type==="subject"&&x.id==="science"))return true;
      if(roles.has("parent")&&((x.type==="parent"&&x.id==="parent-001")||(x.type==="parent-link"&&x.payload.studentId==="student-001")||(x.type==="student"&&x.id==="student-001")||(x.type==="student-attempt"&&x.payload.studentId==="student-001")||(x.type==="topic-mastery"&&x.payload.studentId==="student-001")||x.type==="class"&&x.id==="class-6"||x.type==="subject"&&x.id==="science"))return true;
      return false;
    });
  } else if(roles.has("institution_viewer")&&!roles.has("school_admin")&&!roles.has("teacher")&&!roles.has("hod")){
    visible=records.filter(x=>["institution","branch","class","subject","sample-assessment"].includes(x.type));
  } else if(roles.has("teacher")||roles.has("hod")){
    visible=records.filter(x=>["institution","branch","class","subject","teacher","teacher-assignment","department","hod-appointment","student","sample-assessment","student-attempt","topic-mastery","study-resource"].includes(x.type));
  }
  return json(request,env,{ok:true,readOnly:true,records:visible});
 }
 return fail(request,env,403,"Demo sessions are isolated to read-only demo preview endpoints.");
}
