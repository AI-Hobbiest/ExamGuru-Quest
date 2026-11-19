(()=>{"use strict";
const $=id=>document.getElementById(id),state={identity:null},LOCAL_KEY="examguru_m4_local_v1";
const status=(m,error=false)=>{$("m4Status").textContent=m;$("m4Status").className="status"+(error?" error":"");};
const list=(id,rows,format)=>{const host=$(id);host.replaceChildren();(rows||[]).forEach(r=>{const d=document.createElement("div");d.className="item";d.textContent=format(r);host.append(d);});if(!rows?.length){const d=document.createElement("div");d.className="item muted";d.textContent="No records yet.";host.append(d);}};
const run=async fn=>{try{status("Working…");await fn();status("Saved.");}catch(e){status(e.message||"Operation failed.",true);}};
function isLocalPlatformAdminTest(){
 try{
  const s=JSON.parse(sessionStorage.getItem("examguru_mvp_admin_session_v1")||"null");
  return !!(s&&s.role==="admin"&&String(s.username||"").toLowerCase()==="jayaprakashganathe@gmail.com"&&s.rbacTestMode==="local-platform-admin");
 }catch(_){return false;}
}
const currentTestUser="Jayaprakashganathe@gmail.com";
const catalog={classes:[]};
function asSelect(id,placeholder){const el=$(id);if(!el||el.tagName==="SELECT")return el;const select=document.createElement("select");select.id=id;select.className=el.className;select.setAttribute("aria-label",el.getAttribute("aria-label")||placeholder);el.replaceWith(select);return select;}
function fill(id,rows,placeholder,valueFn,labelFn){const el=$(id);if(!el)return;const old=el.value;el.replaceChildren();const first=document.createElement("option");first.value="";first.textContent=placeholder;el.append(first);(rows||[]).forEach(row=>{const o=document.createElement("option");o.value=valueFn(row);o.textContent=labelFn(row);el.append(o);});if((rows||[]).some(x=>String(valueFn(x))===String(old)))el.value=old;}
function activeUsers(role){return (window.ExamGuruLocalIAM?.users()||[]).filter(u=>(u.roles||[]).some(r=>r.role===role&&r.institutionId==="TEST-INSTITUTION-001"));}
async function loadCatalog(){try{const res=await fetch("./data/classes.json",{cache:"no-store"});if(res.ok){const data=await res.json();catalog.classes=(data.classes||[]).filter(x=>x.active!==false);}}catch(_){} }
function refreshSelectors(){
 const ids=["classBranch","gradeId","teacherMembership","assignmentClass","assignmentSubject","studentMembership","enrollmentClass","parentMembership","linkedStudentMembership","adminBranch","adminMembership"];
 ids.forEach(id=>asSelect(id,id));asSelect("roleUser","Existing user");
 fill("classBranch",demo.branches,"Choose branch",x=>x.branchId,x=>x.name+" · "+x.branchId);
 fill("gradeId",catalog.classes,"Choose grade",x=>x.classId,x=>x.label||("Class "+x.classId));
 const classes=demo.classes;fill("assignmentClass",classes,"Choose class section",x=>x.classId,x=>x.gradeLabel+" "+x.sectionCode+" · "+x.classId);
 fill("enrollmentClass",classes,"Choose class section",x=>x.classId,x=>x.gradeLabel+" "+x.sectionCode+" · "+x.classId);
 const selected=classes.find(x=>x.classId===$("assignmentClass").value)||classes[0];const grade=catalog.classes.find(x=>String(x.classId)===String(selected?.gradeId));
 const subjects=(grade?.subjects||[]).map(id=>({id,label:id.replace(/-/g," ").replace(/\\b\\w/g,s=>s.toUpperCase())}));fill("assignmentSubject",subjects,"Choose subject",x=>x.id,x=>x.label);
 if(!$("assignmentClass").dataset.subjectBound){$("assignmentClass").addEventListener("change",()=>{const chosen=classes.find(x=>x.classId===$("assignmentClass").value);const item=catalog.classes.find(x=>String(x.classId)===String(chosen?.gradeId));const available=(item?.subjects||[]).map(id=>({id,label:id.replace(/-/g," ").replace(/\\b\\w/g,s=>s.toUpperCase())}));fill("assignmentSubject",available,"Choose subject",x=>x.id,x=>x.label);});$("assignmentClass").dataset.subjectBound="1";}
 const teachers=activeUsers("teacher"),students=activeUsers("student"),parents=activeUsers("parent"),admins=activeUsers("school_admin");
 fill("teacherMembership",teachers,"Choose teacher",x=>x.userId,x=>x.displayName+" · "+x.userId);
 fill("studentMembership",students,"Choose student",x=>x.userId,x=>x.displayName+" · "+x.userId);
 fill("linkedStudentMembership",students,"Choose student",x=>x.userId,x=>x.displayName+" · "+x.userId);
 fill("parentMembership",parents,"Choose parent",x=>x.userId,x=>x.displayName+" · "+x.userId);
 fill("adminMembership",admins,"Choose Institution Admin",x=>x.userId,x=>x.displayName+" · "+x.userId);
 fill("adminBranch",demo.branches,"Choose branch",x=>x.branchId,x=>x.name+" · "+x.branchId);
 const users=window.ExamGuruLocalIAM?.users()||[];fill("roleUser",users,"Choose existing user",x=>x.username,x=>x.displayName+" · "+x.username);
}
const institutionRoleLabels={school_admin:"Institution Admin",teacher:"Teacher",parent:"Parent",student:"Student",institution_viewer:"Institution Viewer"};
const demo={branches:[],classes:[],assignments:[],enrollments:[],parentLinks:[],branchAdmins:[],roleAssignments:[
 {username:currentTestUser,role:"school_admin",status:"active"},
 {username:currentTestUser,role:"teacher",status:"active"},
 {username:currentTestUser,role:"parent",status:"active"},
 {username:currentTestUser,role:"student",status:"active"},
 {username:currentTestUser,role:"institution_viewer",status:"active"}
],activeRole:"platform_admin"};
try{const saved=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null");if(saved&&saved.schemaVersion===1)Object.assign(demo,saved);}catch(_){}
const persistDemo=()=>{try{localStorage.setItem(LOCAL_KEY,JSON.stringify({...demo,schemaVersion:1}));return true;}catch(_){return false;}};
function renderRoleAssignments(){
 const host=$("roleAssignmentList");host.replaceChildren();
 const directory=window.ExamGuruLocalIAM?.getState();const assignments=(directory?.users||[]).flatMap(u=>(u.roles||[]).filter(r=>r.institutionId==="TEST-INSTITUTION-001").map(r=>({username:u.username,role:r.role,status:u.status})));(assignments.length?assignments:demo.roleAssignments).forEach(a=>{const d=document.createElement("div");d.className="item";d.textContent=a.username+" · "+(institutionRoleLabels[a.role]||a.role)+" · "+a.status;host.append(d);});
 const switcher=$("activeRole");switcher.replaceChildren();
 const own=(window.ExamGuruLocalIAM?.findUser("USR-PLATFORM-001")?.roles||demo.roleAssignments.filter(a=>a.username.toLowerCase()===currentTestUser.toLowerCase()&&a.status==="active").map(a=>({role:a.role}))).filter(a=>a.role!=="platform_admin");
 const options=[{value:"platform_admin",label:"Platform Admin (platform scope)"},...own.map(a=>({value:a.role,label:institutionRoleLabels[a.role]||a.role}))];
 options.forEach(x=>{const o=document.createElement("option");o.value=x.value;o.textContent=x.label;switcher.append(o);});
 switcher.value=demo.activeRole;
}

function applyLocalPersonaAccess(){
 const role=demo.activeRole;
 const sections=Array.from(document.querySelectorAll("main.wrap > section.panel"));
 const byTitle=title=>sections.find(s=>s.querySelector("h2")?.textContent.trim()===title);
 const rolePanel=$( "roleManagementPanel" );
 const branch=byTitle("Branches"),classes=byTitle("Class sections"),assignments=byTitle("Teacher assignments");
 const enrolments=byTitle("Student enrolments"),parents=byTitle("Parent / guardian links"),delegates=byTitle("Delegated branch administrators");
 const banner=$( "m4RoleAccessNote" )||document.createElement("div");
 banner.id="m4RoleAccessNote";banner.className="status";
 banner.style.cssText="background:#eef5ff;color:#28466f;border:1px solid #c8d9f0";
 const note={
  platform_admin:"Platform Admin preview: full demo operations are available in this local-only workspace.",
  school_admin:"Institution Admin preview: institution-scoped setup and role delegation are available. Platform role grants remain unavailable.",
  teacher:"Teacher preview: read-only teaching workspace. Management actions and unrelated institution records are hidden in this local preview.",
  parent:"Parent preview: this role has no access to Institution Operations. Use the Family Dashboard for linked-child information.",
  student:"Student preview: this role has no access to Institution Operations. Use the learner dashboard and practice tools.",
  institution_viewer:"Institution Viewer preview: read-only institution view. All create, assign and role-management controls are disabled."
 }[role]||"Role preview";
 banner.textContent=note;
 const statusHost=$( "m4Status" );if(statusHost&&statusHost.parentElement)statusHost.insertAdjacentElement("afterend",banner);
 const hide=(el,value)=>{if(el)el.hidden=value;};
 const setControls=(section,enabled)=>{if(!section)return;section.querySelectorAll("input,select,textarea,button").forEach(el=>{el.disabled=!enabled;});};
 hide(rolePanel,false);
 hide(branch,["teacher","parent","student"].includes(role));
 hide(classes,["parent","student"].includes(role));
 hide(assignments,["parent","student"].includes(role));
 hide(enrolments,["teacher","parent","student","institution_viewer"].includes(role));
 hide(parents,["teacher","parent","student","institution_viewer"].includes(role));
 hide(delegates,["teacher","parent","student","institution_viewer"].includes(role));
 const canManage=["platform_admin","school_admin"].includes(role);
 [branch,classes,assignments,enrolments,parents,delegates].forEach(s=>setControls(s,canManage));
 if(role==="teacher"){setControls(classes,false);setControls(assignments,false);}
 if(role==="institution_viewer"){[branch,classes,assignments,enrolments,parents,delegates].forEach(s=>setControls(s,false));}
 const roleUser=$( "roleUser" ),roleSelect=$( "institutionRole" );
 if(roleUser)roleUser.disabled=!canManage;
 if(roleSelect)roleSelect.disabled=!canManage;
 const roleGrid=rolePanel?.querySelector(".grid");
 if(roleGrid)roleGrid.hidden=!canManage;
 const roleList=$( "roleAssignmentList" );if(roleList)roleList.hidden=!canManage;
 const assignButton=$( "assignInstitutionRole" );
 if(assignButton)assignButton.disabled=!canManage;
 if(roleSelect){
  Array.from(roleSelect.options).forEach(o=>{if(o.value==="school_admin")o.disabled=role!=="platform_admin";});
 }
}
function renderDemo(){
 list("branchList",demo.branches,x=>x.name+" · "+x.code+" · "+x.branchId+" · "+x.status);
 list("classList",demo.classes,x=>x.gradeLabel+" "+x.sectionCode+" · "+x.academicYear+" · "+x.branchId+" · "+x.classId);
 list("assignmentList",demo.assignments,x=>x.subjectId+" · teacher "+x.teacherMembershipId+" · class "+x.classId+" · "+x.status);
 list("enrollmentList",demo.enrollments,x=>"student "+x.studentMembershipId+" · class "+x.classId+" · "+x.academicYear+" · "+x.status);
 list("parentLinkList",demo.parentLinks,x=>x.relationship+" · parent "+x.parentMembershipId+" → student "+x.studentMembershipId+" · "+x.status);
 list("branchAdminList",demo.branchAdmins,x=>x.username+" · "+x.branchId+" · "+x.status);
 refreshSelectors();
}
function initLocalPlatformAdminTest(){
 state.identity={user:{username:"Jayaprakashganathe@gmail.com"},platformRoles:["platform_admin"],memberships:[{membershipId:"TEST-INSTITUTION-001",institutionId:"TEST-INSTITUTION-001",institutionName:"Demo Academy (test only)",role:"school_admin"}],context:{membershipId:"TEST-INSTITUTION-001"}};
 const select=$("m4Membership");select.replaceChildren();
 const o=document.createElement("option");o.value="TEST-INSTITUTION-001";o.textContent="Demo Academy (test only) · school_admin";select.append(o);
 const banner=document.createElement("div");banner.className="status";banner.style.cssText="background:#fff4d8;color:#684900;border:1px solid #e7c76a";
 banner.textContent="LOCAL RBAC TEST MODE — signed in as the mapped Platform Admin. Demo records and test directory entries persist in this browser only. They are not production authentication and are not shared across browsers or devices.";
 $("m4Status").replaceWith(banner);banner.id="m4Status";
 try{const saved=sessionStorage.getItem("examguru_rbac_test_role_v1");if(["platform_admin","school_admin","teacher","parent","student","institution_viewer"].includes(saved))demo.activeRole=saved;}catch(_){}
 renderRoleAssignments();applyLocalPersonaAccess();refreshSelectors();
 $("activeRole").addEventListener("change",()=>{demo.activeRole=$("activeRole").value;state.identity.context.role=demo.activeRole;persistDemo();try{sessionStorage.setItem("examguru_rbac_test_role_v1",demo.activeRole);}catch(_){}const target=demo.activeRole==="platform_admin"?"./admin.html#tab-overview":demo.activeRole==="school_admin"||demo.activeRole==="institution_viewer"?"./institution-operations.html":demo.activeRole==="teacher"?"./assigned-test.html":demo.activeRole==="parent"?"./parent.html":"./dashboard.html";location.href=target;});
 $("assignInstitutionRole").addEventListener("click",()=>{
  const actor=demo.activeRole,target=$("roleUser").value.trim(),role=$("institutionRole").value;
  if(!target) return status("Enter an account username or email.",true);
  if(actor!=="platform_admin"&&actor!=="school_admin")return status("Only Platform Admin or Institution Admin can assign institution roles in this test.",true);
  if(actor==="school_admin"&&role==="school_admin")return status("Only Platform Admin can appoint another Institution Admin.",true);
  const user=(window.ExamGuruLocalIAM?.users()||[]).find(u=>u.username.toLowerCase()===target.toLowerCase());if(!user)return status("Choose a user already created in User Management.",true);
  if(user.roles?.some(a=>a.role===role&&a.institutionId==="TEST-INSTITUTION-001"))return status("That account already has this active role in Demo Academy.",true);window.ExamGuruLocalIAM.assignRole(user.userId,role,"TEST-INSTITUTION-001");demo.roleAssignments.push({username:target,role,status:"active"});persistDemo();renderRoleAssignments();refreshSelectors();status((actor==="platform_admin"?"Platform Admin":"Institution Admin")+" assigned "+institutionRoleLabels[role]+" to "+target+". Saved in this browser only.");
 });
 const add=(id,fn)=>$(id).addEventListener("click",()=>{try{fn();persistDemo();renderDemo();refreshSelectors();status("Demo action saved in this browser. It is not uploaded to a server.");}catch(e){status(e.message||"Demo action failed.",true);}});
 add("m4Refresh",renderDemo);
 add("createBranch",()=>{if(!$("branchName").value.trim()||!$("branchCode").value.trim())throw Error("Enter a branch name and code.");demo.branches.push({name:$("branchName").value.trim(),code:$("branchCode").value.trim(),branchId:"DEMO-BR-"+(demo.branches.length+1),status:"active"});});
 add("createClass",()=>{if(!$("classBranch").value.trim()||!$("gradeId").value.trim()||!$("sectionCode").value.trim())throw Error("Enter branch, grade and section.");demo.classes.push({branchId:$("classBranch").value.trim(),gradeLabel:"Grade "+$("gradeId").value.trim(),sectionCode:$("sectionCode").value.trim(),academicYear:$("academicYear").value.trim(),classId:"DEMO-CLASS-"+(demo.classes.length+1)});});
 add("assignTeacher",()=>{if(!$("teacherMembership").value||!$("assignmentClass").value||!$("assignmentSubject").value)throw Error("Choose an existing teacher, class section and subject.");demo.assignments.push({teacherMembershipId:$("teacherMembership").value,classId:$("assignmentClass").value,subjectId:$("assignmentSubject").value,status:"active"});});
 add("enrollStudent",()=>{if(!$("studentMembership").value||!$("enrollmentClass").value)throw Error("Choose an existing student and class section.");demo.enrollments.push({studentMembershipId:$("studentMembership").value,classId:$("enrollmentClass").value,academicYear:$("enrollmentYear").value.trim(),status:"active"});});
 add("linkParent",()=>{if(!$("parentMembership").value||!$("linkedStudentMembership").value)throw Error("Choose an existing parent and student.");demo.parentLinks.push({parentMembershipId:$("parentMembership").value,studentMembershipId:$("linkedStudentMembership").value,relationship:$("relationship").value.trim(),status:"active"});});
 add("appointBranchAdmin",()=>{if(!$("adminBranch").value||!$("adminMembership").value)throw Error("Choose an existing branch and Institution Admin.");demo.branchAdmins.push({branchId:$("adminBranch").value,username:$("adminMembership").value,status:"active"});});
 select.addEventListener("change",()=>status("Demo institution context selected."));
 renderDemo();
}
async function load(){
 if(isLocalPlatformAdminTest()){await loadCatalog();initLocalPlatformAdminTest();return;}
 if(!window.C10Api?.isAuthenticated())throw Error("Sign in with the central account service first.");
 const data=await C10Api.identityV2();state.identity=data.identity;
 const select=$("m4Membership");select.replaceChildren();
 for(const m of state.identity.memberships||[]){if(!["school_admin","teacher","institution_viewer"].includes(m.role))continue;const o=document.createElement("option");o.value=m.membershipId;o.textContent=m.institutionName+" · "+m.role+" · "+m.membershipId;select.append(o);}
 const active=state.identity.context?.membershipId;if(active)select.value=active;
 const m=(state.identity.memberships||[]).find(x=>x.membershipId===select.value);if(!m)throw Error("No eligible institutional membership is available.");
 if(state.identity.context?.membershipId!==m.membershipId)await C10Api.selectInstitutionContext({institutionId:m.institutionId,membershipId:m.membershipId,branchId:null});
 await refreshLists();
}
async function refreshLists(){
 const [b,c,a,e]=await Promise.all([C10Api.branches(),C10Api.institutionClasses(),C10Api.teacherAssignments(),C10Api.enrollments()]);
 list("branchList",b.branches,x=>x.name+" · "+x.code+" · "+x.branchId+" · "+x.status);
 list("classList",c.classes,x=>x.gradeLabel+" "+x.sectionCode+" · "+x.academicYear+" · "+x.branchId+" · "+x.classId);
 list("assignmentList",a.assignments,x=>x.subjectId+" · teacher "+x.teacherMembershipId+" · class "+x.classId+" · "+x.status);
 list("enrollmentList",e.enrollments,x=>"student "+x.studentMembershipId+" · class "+x.classId+" · "+x.academicYear+" · "+x.status);
 try{const p=await C10Api.parentLinks();list("parentLinkList",p.links,x=>x.relationship+" · parent "+x.parentMembershipId+" → student "+x.studentMembershipId+" · "+x.status);}catch(_){list("parentLinkList",[]);}
 try{const d=await C10Api.branchAdmins();list("branchAdminList",d.branchAdmins,x=>x.username+" · "+x.branchId+" · "+x.status);}catch(_){list("branchAdminList",[]);}
}
function bind(id,fn){$(id).addEventListener("click",()=>run(async()=>{await fn();await refreshLists();}));}
function init(){
 bind("m4Refresh",load);
 bind("createBranch",()=>C10Api.createBranch({name:$("branchName").value,code:$("branchCode").value}));
 bind("createClass",()=>C10Api.createInstitutionClass({branchId:$("classBranch").value,gradeId:$("gradeId").value,sectionCode:$("sectionCode").value,academicYear:$("academicYear").value}));
 bind("assignTeacher",()=>C10Api.createTeacherAssignment({teacherMembershipId:$("teacherMembership").value,classId:$("assignmentClass").value,subjectId:$("assignmentSubject").value}));
 bind("enrollStudent",()=>C10Api.createEnrollment({studentMembershipId:$("studentMembership").value,classId:$("enrollmentClass").value,academicYear:$("enrollmentYear").value}));
 bind("linkParent",()=>C10Api.createParentLink({parentMembershipId:$("parentMembership").value,studentMembershipId:$("linkedStudentMembership").value,relationship:$("relationship").value}));
 bind("appointBranchAdmin",()=>C10Api.appointBranchAdmin({branchId:$("adminBranch").value,membershipId:$("adminMembership").value}));
 $("m4Membership").addEventListener("change",()=>run(async()=>{const m=state.identity.memberships.find(x=>x.membershipId===$("m4Membership").value);if(!m)throw Error("Select a membership.");await C10Api.selectInstitutionContext({institutionId:m.institutionId,membershipId:m.membershipId,branchId:null});await refreshLists();}));
 run(load)();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();