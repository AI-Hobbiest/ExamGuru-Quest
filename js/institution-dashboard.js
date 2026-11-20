/* Institution dashboard. Never render tenant data until the shared shell confirms an authenticated institution membership. */
(()=>{"use strict";
const $=id=>document.getElementById(id),iam=window.ExamGuruLocalIAM,db=window.ExamGuruInstitutionData,content=window.ExamGuruInstitutionContent,error=$("dashError");
const main=$("institutionDashboard"),guest=$("dashGuestGate");
const activeCount=rows=>(rows||[]).filter(x=>x&&x.status!=="inactive").length;
const set=(id,value)=>{const el=$(id);if(el)el.textContent=String(value);};
const metric=(id,value)=>set(id,Number(value||0).toLocaleString());
function members(role,institutionId){return (iam.allUsers()||[]).filter(u=>u&&u.status!=="inactive"&&(u.roles||[]).some(r=>r.role===role&&r.institutionId===institutionId));}
function check(el,done){if(!el)return;el.classList.toggle("is-complete",!!done);const s=el.querySelector(".io-dash-check-state");if(s)s.textContent=done?"✓ Complete":"Start";if(done)el.setAttribute("aria-label",(el.querySelector("strong")?.textContent||"Setup item")+" — complete");}
function deny(){if(main)main.hidden=true;if(guest)guest.hidden=false;}
function render(auth){
 const allowed=auth&&auth.role==="institution"&&["school_admin","hod","institution_viewer"].includes(auth.institutionRole)&&auth.institutionId&&auth.membershipId;
 if(!allowed){deny();return;}
 try{
  if(!iam||!db)throw Error("Institution services could not be loaded. Refresh the page and try again.");
  const institutionId=String(auth.institutionId);
  /* Use only the institution bound to the authenticated membership, never a stale browser-selected tenant. */
  const institution=iam.findInstitution(institutionId);
  if(!institution)throw Error("Your institution membership could not be verified. Sign in again.");
  if(db.currentInstitutionId()!==institutionId)db.setInstitution(institutionId);
  const state=db.getState(),admin=auth.institutionRole==="school_admin";
  if(auth.institutionRole==="hod"){
   const departments=(state.departments||[]).filter(d=>(auth.departmentIds||[]).includes(d.departmentId)||d.hodRoleMembershipId===auth.membershipId||d.hodMembershipId===auth.teacherMembershipId);
   if(!departments.length)throw Error("No department is assigned to this HOD membership. Ask the Institution Admin to verify the appointment.");
   const teacherIds=new Set(departments.flatMap(d=>d.memberIds||[])),classIds=new Set(departments.flatMap(d=>d.classIds||[]));
   if(!classIds.size)throw Error("Your department has no class scope configured yet. Ask the Institution Admin to assign the HOD class scope.");
   const assignments=(state.assignments||[]).filter(a=>a.status!=="inactive"&&teacherIds.has(a.teacherMembershipId)&&classIds.has(a.classId)),subjectIds=new Set(assignments.map(a=>a.subjectId));
   const classes=(state.classes||[]).filter(c=>c.status!=="inactive"&&classIds.has(c.classId));
   const enrolments=(state.enrolments||[]).filter(e=>e.status!=="inactive"&&classIds.has(e.classId));
   const studentIds=new Set(enrolments.map(e=>e.studentMembershipId));
   const scopedStudents=(iam.allUsers()||[]).filter(u=>u.status!=="inactive"&&(u.roles||[]).some(r=>r.role==="student"&&r.institutionId===institutionId&&studentIds.has(r.membershipId))).length;
   set("dashWelcome","Department workspace");set("dashInstitutionSubtitle",departments.map(d=>d.name).join(" · "));set("dashRole","Head of Department · Scoped access");
   [["metricStudents",scopedStudents],["metricTeachers",teacherIds.size],["metricClasses",classes.length],["metricBranches",0],["metricSubjects",subjectIds.size],["metricDepartments",departments.length],["pulseAssignments",assignments.length],["pulseEnrolments",enrolments.length],["contentPublished",0]].forEach(([id,v])=>metric(id,v));
   set("metricStudentsNote","Students in department-assigned classes");set("metricTeachersNote","Department members only");set("linkBranches","Not available to HOD");set("linkAcademic",classes.length+" assigned classes");set("linkDepartments",departments.length+" department(s)");set("linkUsers",teacherIds.size+" department teachers");set("linkEnrolments",enrolments.length+" scoped enrolments");set("linkAssignments",assignments.length+" department assignments");set("linkContent","Not available to HOD");set("linkExams","Not available to HOD");
   set("pulseTitle","Your department at a glance");set("pulseCopy","This view includes only your appointed department membership and its assigned classes. Institution-wide records and other departments are excluded.");
   ["dashHeroActions","setupChecklist","dashWorkspaces","dashContentLink","dashExamLink"].forEach(id=>{if($(id))$(id).hidden=true;});
   if(guest)guest.hidden=true;if(main)main.hidden=false;if(error)error.hidden=true;set("dashDataStatus","Department scope · browser-local data");return;
  }
  const branches=activeCount(state.branches),grades=activeCount(state.grades),subjects=activeCount(state.subjects),classes=activeCount(state.classes),departments=activeCount(state.departments),assignments=activeCount(state.assignments),enrolments=activeCount(state.enrolments),students=members("student",institutionId).length,teachers=members("teacher",institutionId).length;
  let resources={banks:[],papers:[]};try{if(content&&content.currentInstitutionId()===institutionId)resources=content.list();}catch(_){}
  const allResources=[...(resources.banks||[]),...(resources.papers||[])],published=allResources.filter(x=>x.status==="published").length,drafts=allResources.filter(x=>x.status==="draft").length;
  const ent=iam.getEntitlements(institutionId)||{},examIds=ent.competitiveExams?.enabled?(ent.competitiveExams.examIds||[]):[];
  set("dashWelcome","Welcome to "+institution.name);set("dashInstitutionSubtitle",(institution.institutionType||"Institution").replace(/_/g," ")+" · Your academic and people operations, in one place.");set("dashRole",admin?"Institution Admin":"Institution Viewer · Read only");
  [["metricStudents",students],["metricTeachers",teachers],["metricClasses",classes],["metricBranches",branches],["metricSubjects",subjects],["metricDepartments",departments],["pulseAssignments",assignments],["pulseEnrolments",enrolments],["contentPublished",published]].forEach(([id,v])=>metric(id,v));
  set("metricStudentsNote",enrolments+" enrolments recorded");set("metricTeachersNote",assignments+" teaching assignments");set("linkBranches",branches+" locations");set("linkAcademic",grades+" grades · "+classes+" groups");set("linkDepartments",departments+" departments");set("linkUsers",students+" students · "+teachers+" teachers");set("linkEnrolments",enrolments+" enrolments");set("linkAssignments",assignments+" assignments");set("linkContent",published+" published · "+drafts+" drafts");set("linkExams",examIds.length?examIds.length+" programmes enabled":"No add-ons enabled");
  set("contentCopy",drafts?drafts+" draft resource"+(drafts===1?" is":"s are")+" waiting for review and publication.":"Institution-owned banks and papers stay separate from the global ExamGuru catalogue.");
  set("addonTitle",examIds.length?examIds.length+" programmes enabled":"Explore exam add-ons");set("addonCopy",examIds.length?"Enabled programmes: "+examIds.join(", ")+".":"Check which additional exam programmes have been granted to your institution.");
  const checks=[branches>0,grades>0&&classes>0,teachers>0&&students>0,assignments>0,published>0],els=Array.from(document.querySelectorAll(".io-dash-check"));els.forEach((el,i)=>check(el,checks[i]));
  const done=checks.filter(Boolean).length,pct=Math.round(done/checks.length*100);set("setupPercent",pct+"%");const bar=$("setupProgressBar");if(bar)bar.style.width=pct+"%";
  set("pulseTitle",pct===100?"Your workspace is taking shape":"A few steps to get fully operational");set("pulseCopy",pct===100?"Your core setup is in place. Keep your people, teaching assignments and learning resources up to date.":done+" of "+checks.length+" foundational steps complete. Use the checklist to see what to do next.");
  if($("dashHeroActions"))$("dashHeroActions").hidden=!admin;if($("setupChecklist"))$("setupChecklist").hidden=!admin;if($("dashWorkspaces"))$("dashWorkspaces").hidden=!admin;if($("dashContentLink"))$("dashContentLink").hidden=!admin;if($("dashExamLink"))$("dashExamLink").hidden=!admin;
  if(!admin){const panel=document.querySelector(".io-dash-setup");if(panel)panel.innerHTML='<div class="io-dash-section-heading"><div><p class="io-eyebrow">Institution summary</p><h2>Operational overview</h2><p>You have read-only access to this institution workspace.</p></div></div><p class="io-dash-readonly-note">Your institution currently has '+students+' students, '+teachers+' teachers, '+classes+' classes or cohorts and '+branches+' branches. Contact an Institution Admin if any information needs to be updated.</p>';}
  set("dashDataStatus","Updated from this browser");if(error)error.hidden=true;
  if(guest)guest.hidden=true;if(main)main.hidden=false;
 }catch(e){deny();if(error){error.textContent=e.message||"Unable to load institution overview.";error.hidden=false;}}
}
window.addEventListener("examguru-auth-state-ready",event=>render(event.detail));
if(window.ExamGuruAuthState)render(window.ExamGuruAuthState);
const refresh=$("dashRefresh");if(refresh)refresh.addEventListener("click",e=>{e.preventDefault();if(window.ExamGuruAuthState)render(window.ExamGuruAuthState);});
})();