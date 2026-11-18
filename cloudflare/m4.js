const iso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const fail=(request,env,status,error)=>new Response(JSON.stringify({ok:false,error}),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const ok=(request,env,data,status=200)=>new Response(JSON.stringify({ok:true,...data}),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const read=async request=>{const n=Number(request.headers.get("Content-Length")||0);if(n>65536)throw Error("Request body too large.");try{return await request.json();}catch(_){throw Error("Valid JSON body required.");}};
const safe=(v,max=100)=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=max&&!/[<>]/.test(v);
async function context(request,env,who){
 const token=(request.headers.get("Authorization")||"").slice(7);
 const s=await env.DB.prepare("SELECT active_institution_id,active_membership_id FROM auth_sessions WHERE token_hash=? AND expires_at>?").bind(await (async x=>{const b=new TextEncoder().encode(x);return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",b)),v=>v.toString(16).padStart(2,"0")).join("");})(token),iso()).first();
 if(!s?.active_institution_id||!s?.active_membership_id)return {error:fail(request,env,409,"Select an institution membership first.")};
 const m=await env.DB.prepare("SELECT m.*,i.status institution_status FROM institution_memberships m JOIN institutions i ON i.institution_id=m.institution_id WHERE m.membership_id=? AND m.institution_id=? AND m.user_id=?").bind(s.active_membership_id,s.active_institution_id,who.user_id).first();
 if(!m||m.status!=="active"||m.institution_status!=="active")return {error:fail(request,env,403,"Active institution membership required.")};
 const [scopes,appointments]=await Promise.all([
  env.DB.prepare("SELECT branch_id FROM membership_branch_scopes WHERE membership_id=? AND institution_id=?").bind(m.membership_id,m.institution_id).all(),
  env.DB.prepare("SELECT branch_id FROM branch_admin_appointments WHERE membership_id=? AND institution_id=? AND status='active'").bind(m.membership_id,m.institution_id).all()
 ]);
 return {institutionId:m.institution_id,membership:m,scopedBranches:(scopes.results||[]).map(x=>x.branch_id),adminBranches:(appointments.results||[]).map(x=>x.branch_id)};
}
const isSchoolAdmin=c=>c.membership.role==="school_admin";
const canBranch=(c,b)=>isSchoolAdmin(c)?(Number(c.membership.all_branches)===1||c.scopedBranches.includes(b)):c.adminBranches.includes(b);
const canManage=(c,b)=>canBranch(c,b);
async function audit(env,who,c,action,type,target,branchId,meta={}){await env.DB.prepare("INSERT INTO audit_events(event_id,actor_user_id,institution_id,branch_id,action,target_type,target_id,request_id,metadata_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id(),who.user_id,c.institutionId,branchId||null,action,type,target||null,null,JSON.stringify(meta),iso()).run();}
async function classRow(env,c,classId){return env.DB.prepare("SELECT * FROM institution_classes WHERE institution_id=? AND institution_class_id=?").bind(c.institutionId,classId).first();}
async function member(env,c,membershipId,role){return env.DB.prepare("SELECT membership_id,user_id,role,status FROM institution_memberships WHERE institution_id=? AND membership_id=? AND role=? AND status='active'").bind(c.institutionId,membershipId,role).first();}
async function branches(request,env,who,method,c){
 if(method==="GET"){
  const rows=await env.DB.prepare("SELECT branch_id branchId,name,code,status,created_at createdAt FROM branches WHERE institution_id=? ORDER BY name").bind(c.institutionId).all();
  return ok(request,env,{branches:(rows.results||[]).filter(b=>canBranch(c,b.branchId))});
 }
 if(!isSchoolAdmin(c))return fail(request,env,403,"Only School Admin can create branches.");
 const b=await read(request),name=String(b.name||"").trim(),code=String(b.code||"").trim().toUpperCase();
 if(!safe(name,120)||!/^[A-Z0-9_-]{2,20}$/.test(code))return fail(request,env,400,"Enter a branch name and a 2–20 character code.");
 const now=iso(),branchId=id();
 try{await env.DB.prepare("INSERT INTO branches(branch_id,institution_id,name,code,status,created_at,updated_at) VALUES(?,?,?,?,'active',?,?)").bind(branchId,c.institutionId,name,code,now,now).run();}
 catch(_){return fail(request,env,409,"Branch code already exists.");}
 await audit(env,who,c,"branch-created","branch",branchId,branchId,{code});
 return ok(request,env,{branch:{branchId,name,code,status:"active"}},201);
}
async function branchPatch(request,env,who,c,branchId){
 if(!canManage(c,branchId))return fail(request,env,403,"Branch administration scope required.");
 const b=await read(request),current=await env.DB.prepare("SELECT * FROM branches WHERE institution_id=? AND branch_id=?").bind(c.institutionId,branchId).first();
 if(!current)return fail(request,env,404,"Branch not found.");
 const name=b.name===undefined?current.name:String(b.name).trim(),status=b.status===undefined?current.status:String(b.status);
 if(!safe(name,120)||!["active","inactive","closed"].includes(status))return fail(request,env,400,"Invalid branch update.");
 await env.DB.prepare("UPDATE branches SET name=?,status=?,updated_at=? WHERE institution_id=? AND branch_id=?").bind(name,status,iso(),c.institutionId,branchId).run();
 await audit(env,who,c,"branch-updated","branch",branchId,branchId,{status});
 return ok(request,env,{branchId,status});
}
async function classes(request,env,who,method,c,classId){
 if(method==="PATCH"){
  const current=await classRow(env,c,classId);if(!current)return fail(request,env,404,"Class section not found.");
  if(!canManage(c,current.branch_id))return fail(request,env,403,"Branch administration scope required.");
  const b=await read(request),status=b.status||"archived";if(!["active","archived"].includes(status))return fail(request,env,400,"Invalid class status.");
  await env.DB.prepare("UPDATE institution_classes SET status=?,updated_at=? WHERE institution_id=? AND institution_class_id=?").bind(status,iso(),c.institutionId,classId).run();
  await audit(env,who,c,"class-section-updated","institution_class",classId,current.branch_id,{status});return ok(request,env,{classId,status});
 }
 if(method==="GET"){
  const rows=await env.DB.prepare("SELECT c.institution_class_id classId,c.branch_id branchId,c.grade_id gradeId,g.label gradeLabel,c.section_code sectionCode,c.academic_year academicYear,c.status FROM institution_classes c LEFT JOIN classes g ON g.class_id=c.grade_id WHERE c.institution_id=? ORDER BY c.academic_year DESC,c.branch_id,c.grade_id,c.section_code").bind(c.institutionId).all();
  return ok(request,env,{classes:(rows.results||[]).filter(x=>canBranch(c,x.branchId))});
 }
 const b=await read(request),branchId=String(b.branchId||""),gradeId=String(b.gradeId||""),section=String(b.sectionCode||"").trim().toUpperCase(),year=String(b.academicYear||"").trim();
 if(!canManage(c,branchId))return fail(request,env,403,"Branch administration scope required.");
 if(!/^[A-Za-z0-9_-]{1,20}$/.test(gradeId)||! /^[A-Z0-9_-]{1,12}$/.test(section)||!/^20\d{2}(-\d{2})?$/.test(year))return fail(request,env,400,"Provide a valid grade, section and academic year.");
 const [branch,grade]=await Promise.all([env.DB.prepare("SELECT 1 FROM branches WHERE institution_id=? AND branch_id=? AND status='active'").bind(c.institutionId,branchId).first(),env.DB.prepare("SELECT 1 FROM classes WHERE class_id=? AND active=1").bind(gradeId).first()]);
 if(!branch||!grade)return fail(request,env,400,"Choose an active branch and grade.");
 const newClassId=id(),now=iso();
 try{await env.DB.prepare("INSERT INTO institution_classes(institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'active',?,?)").bind(newClassId,c.institutionId,branchId,gradeId,section,year,now,now).run();}
 catch(_){return fail(request,env,409,"That class section already exists for this branch and academic year.");}
 await audit(env,who,c,"class-section-created","institution_class",newClassId,branchId,{gradeId,sectionCode:section,academicYear:year});
 return ok(request,env,{classId:newClassId,branchId,gradeId,sectionCode:section,academicYear:year},201);
}
async function assignments(request,env,who,method,c,assignmentId){
 if(method==="GET"){
  const rows=await env.DB.prepare("SELECT a.assignment_id assignmentId,a.teacher_membership_id teacherMembershipId,a.institution_class_id classId,a.subject_id subjectId,a.status,c.branch_id branchId FROM teacher_assignments a JOIN institution_classes c ON c.institution_id=a.institution_id AND c.institution_class_id=a.institution_class_id WHERE a.institution_id=? ORDER BY c.branch_id,a.subject_id").bind(c.institutionId).all();
  return ok(request,env,{assignments:(rows.results||[]).filter(x=>canBranch(c,x.branchId))});
 }
 const b=await read(request);
 if(method==="PATCH"){
  const row=await env.DB.prepare("SELECT a.*,c.branch_id FROM teacher_assignments a JOIN institution_classes c ON c.institution_id=a.institution_id AND c.institution_class_id=a.institution_class_id WHERE a.institution_id=? AND a.assignment_id=?").bind(c.institutionId,assignmentId).first();
  if(!row)return fail(request,env,404,"Teacher assignment not found.");
  if(!canManage(c,row.branch_id))return fail(request,env,403,"Branch administration scope required.");
  const status=b.status||"ended";if(!["active","ended"].includes(status))return fail(request,env,400,"Invalid assignment status.");
  await env.DB.prepare("UPDATE teacher_assignments SET status=?,updated_at=? WHERE institution_id=? AND assignment_id=?").bind(status,iso(),c.institutionId,assignmentId).run();
  await audit(env,who,c,"teacher-assignment-updated","teacher_assignment",assignmentId,row.branch_id,{status});
  return ok(request,env,{assignmentId,status});
 }
 const classId=String(b.classId||""),teacherId=String(b.teacherMembershipId||""),subject=String(b.subjectId||"");
 const cls=await classRow(env,c,classId);if(!cls||!canManage(c,cls.branch_id))return fail(request,env,403,"Selected class is unavailable or outside your branch scope.");
 if(!/^[a-z0-9-]{2,40}$/.test(subject))return fail(request,env,400,"Invalid subject ID.");
 if(!await member(env,c,teacherId,"teacher"))return fail(request,env,400,"Select an active teacher membership in this institution.");
 const assignment=id(),now=iso();
 try{await env.DB.prepare("INSERT INTO teacher_assignments(assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,status,created_at,updated_at) VALUES(?,?,?,?,?,'active',?,?)").bind(assignment,c.institutionId,teacherId,classId,subject,now,now).run();}
 catch(_){return fail(request,env,409,"Assignment already exists or violates class/teacher constraints.");}
 await audit(env,who,c,"teacher-assigned","teacher_assignment",assignment,cls.branch_id,{teacherMembershipId:teacherId,classId,subjectId:subject});
 return ok(request,env,{assignmentId:assignment},201);
}
async function enrollments(request,env,who,method,c,enrollmentId){
 if(method==="GET"){
  const rows=await env.DB.prepare("SELECT e.enrollment_id enrollmentId,e.student_membership_id studentMembershipId,e.institution_class_id classId,e.academic_year academicYear,e.status,e.enrolled_at enrolledAt,c.branch_id branchId FROM student_enrollments e JOIN institution_classes c ON c.institution_id=e.institution_id AND c.institution_class_id=e.institution_class_id WHERE e.institution_id=? ORDER BY e.enrolled_at DESC").bind(c.institutionId).all();
  return ok(request,env,{enrollments:(rows.results||[]).filter(x=>canBranch(c,x.branchId))});
 }
 const b=await read(request);
 if(method==="PATCH"){
  const row=await env.DB.prepare("SELECT e.*,c.branch_id FROM student_enrollments e JOIN institution_classes c ON c.institution_id=e.institution_id AND c.institution_class_id=e.institution_class_id WHERE e.institution_id=? AND e.enrollment_id=?").bind(c.institutionId,enrollmentId).first();
  if(!row)return fail(request,env,404,"Enrollment not found.");
  if(!canManage(c,row.branch_id))return fail(request,env,403,"Branch administration scope required.");
  const status=b.status||"withdrawn";if(!["active","transferred","completed","withdrawn"].includes(status))return fail(request,env,400,"Invalid enrollment status.");
  await env.DB.prepare("UPDATE student_enrollments SET status=?,ended_at=? WHERE institution_id=? AND enrollment_id=?").bind(status,status==="active"?null:iso(),c.institutionId,enrollmentId).run();
  await audit(env,who,c,"enrollment-updated","student_enrollment",enrollmentId,row.branch_id,{status});
  return ok(request,env,{enrollmentId,status});
 }
 const studentId=String(b.studentMembershipId||""),classId=String(b.classId||""),year=String(b.academicYear||"").trim(),cls=await classRow(env,c,classId);
 if(!cls||!canManage(c,cls.branch_id))return fail(request,env,403,"Selected class is unavailable or outside your branch scope.");
 if(!/^20\d{2}(-\d{2})?$/.test(year)||!await member(env,c,studentId,"student"))return fail(request,env,400,"Select an active student membership and valid academic year.");
 const eid=id(),now=iso();
 try{await env.DB.prepare("INSERT INTO student_enrollments(enrollment_id,institution_id,student_membership_id,institution_class_id,academic_year,status,enrolled_at,created_at) VALUES(?,?,?, ?,?,'active',?,?)").bind(eid,c.institutionId,studentId,classId,year,now,now).run();}
 catch(_){return fail(request,env,409,"Student already has an enrollment for this academic year or the class is invalid.");}
 await audit(env,who,c,"student-enrolled","student_enrollment",eid,cls.branch_id,{studentMembershipId:studentId,classId,academicYear:year});
 return ok(request,env,{enrollmentId:eid},201);
}
async function parentLinks(request,env,who,method,c,linkId){
 if(!isSchoolAdmin(c))return fail(request,env,403,"Parent and guardian links are restricted to School Admin.");
 if(method==="GET"){
  const rows=await env.DB.prepare("SELECT l.link_id linkId,l.parent_membership_id parentMembershipId,l.student_membership_id studentMembershipId,l.relationship,l.status,l.created_at createdAt FROM parent_student_links l WHERE l.institution_id=? ORDER BY l.created_at DESC").bind(c.institutionId).all();
  return ok(request,env,{links:rows.results||[]});
 }
 if(method==="PATCH"){
  const b=await read(request),status=b.status||"inactive";
  if(!["active","inactive"].includes(status))return fail(request,env,400,"Invalid parent link status.");
  const r=await env.DB.prepare("UPDATE parent_student_links SET status=?,updated_at=? WHERE institution_id=? AND link_id=?").bind(status,iso(),c.institutionId,linkId).run();
  if(!r.meta?.changes)return fail(request,env,404,"Parent link not found.");
  await audit(env,who,c,"parent-link-updated","parent_student_link",linkId,null,{status});
  return ok(request,env,{linkId,status});
 }
 const b=await read(request),parent=String(b.parentMembershipId||""),student=String(b.studentMembershipId||""),relationship=String(b.relationship||"parent/guardian").trim();
 if(!safe(relationship,60)||!await member(env,c,parent,"parent")||!await member(env,c,student,"student"))return fail(request,env,400,"Choose active parent and student memberships in this institution.");
 const link=id(),now=iso();
 try{await env.DB.prepare("INSERT INTO parent_student_links(link_id,institution_id,parent_membership_id,student_membership_id,relationship,status,created_at,updated_at) VALUES(?,?,?,?,?,'active',?,?)").bind(link,c.institutionId,parent,student,relationship,now,now).run();}
 catch(_){return fail(request,env,409,"Parent link already exists or is invalid.");}
 await audit(env,who,c,"parent-linked","parent_student_link",link,null,{parentMembershipId:parent,studentMembershipId:student});
 return ok(request,env,{linkId:link},201);
}
async function branchAdmins(request,env,who,method,c,appointmentId){
 if(!isSchoolAdmin(c))return fail(request,env,403,"Only School Admin can delegate branch administration.");
 if(method==="PATCH"){
  const b=await read(request),status=b.status==="active"?"active":"revoked";
  const row=await env.DB.prepare("SELECT branch_id FROM branch_admin_appointments WHERE institution_id=? AND appointment_id=?").bind(c.institutionId,appointmentId).first();
  if(!row)return fail(request,env,404,"Branch administrator appointment not found.");
  await env.DB.prepare("UPDATE branch_admin_appointments SET status=?,updated_at=? WHERE institution_id=? AND appointment_id=?").bind(status,iso(),c.institutionId,appointmentId).run();
  await audit(env,who,c,"branch-admin-"+status,"branch_admin_appointment",appointmentId,row.branch_id,{status});return ok(request,env,{appointmentId,status});
 }
 if(method==="GET"){
  const rows=await env.DB.prepare("SELECT a.appointment_id appointmentId,a.branch_id branchId,a.membership_id membershipId,a.status,u.username,m.role FROM branch_admin_appointments a JOIN institution_memberships m ON m.membership_id=a.membership_id JOIN users u ON u.id=m.user_id WHERE a.institution_id=? ORDER BY a.created_at DESC").bind(c.institutionId).all();
  return ok(request,env,{branchAdmins:rows.results||[]});
 }
 const b=await read(request),branchId=String(b.branchId||""),membershipId=String(b.membershipId||"");
 if(!await env.DB.prepare("SELECT 1 FROM branches WHERE institution_id=? AND branch_id=? AND status='active'").bind(c.institutionId,branchId).first())return fail(request,env,400,"Select an active branch.");
 if(!await member(env,c,membershipId,"teacher")&&!await member(env,c,membershipId,"institution_viewer"))return fail(request,env,400,"Delegate must have an active teacher or institution-viewer membership.");
 const appointment=id(),now=iso();
 try{await env.DB.prepare("INSERT INTO branch_admin_appointments(appointment_id,institution_id,branch_id,membership_id,status,appointed_by_user_id,created_at,updated_at) VALUES(?,?,?,?,'active',?,?,?)").bind(appointment,c.institutionId,branchId,membershipId,who.user_id,now,now).run();}
 catch(_){return fail(request,env,409,"That branch administrator appointment already exists or is invalid.");}
 await audit(env,who,c,"branch-admin-appointed","branch_admin_appointment",appointment,branchId,{membershipId});
 return ok(request,env,{appointmentId,branchId,membershipId},201);
}
export async function handleM4(request,env,who){
 const path=new URL(request.url).pathname,method=request.method.toUpperCase();
 const route=path.match(/^\/api\/v2\/(branches|classes|teacher-assignments|enrollments|parent-links|branch-admins)(?:\/([A-Za-z0-9_-]+))?$/);
 if(!route)return null;
 const c=await context(request,env,who);if(c.error)return c.error;
 const [,resource,resourceId]=route;
 try{
  if(resource==="branches")return resourceId?(method==="PATCH"?await branchPatch(request,env,who,c,resourceId):fail(request,env,405,"Method not allowed.")):await branches(request,env,who,method,c);
  if(resource==="classes")return await classes(request,env,who,method,c,resourceId);
  if(resource==="teacher-assignments")return await assignments(request,env,who,method,c,resourceId);
  if(resource==="enrollments")return await enrollments(request,env,who,method,c,resourceId);
  if(resource==="parent-links")return await parentLinks(request,env,who,method,c,resourceId);
  if(resource==="branch-admins")return await branchAdmins(request,env,who,method,c,resourceId);
  return null;
 }catch(e){if(/JSON|body/i.test(e.message||""))return fail(request,env,400,e.message);return fail(request,env,500,"Institution operation failed. Check Worker logs.");}
}
