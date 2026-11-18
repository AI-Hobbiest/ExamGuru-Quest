(()=>{"use strict";
const $=id=>document.getElementById(id),state={identity:null};
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
const institutionRoleLabels={school_admin:"Institution Admin",teacher:"Teacher",parent:"Parent",student:"Student",institution_viewer:"Institution Viewer"};
const demo={branches:[],classes:[],assignments:[],enrollments:[],parentLinks:[],branchAdmins:[],roleAssignments:[
 {username:currentTestUser,role:"school_admin",status:"active"},
 {username:currentTestUser,role:"teacher",status:"active"},
 {username:currentTestUser,role:"parent",status:"active"},
 {username:currentTestUser,role:"student",status:"active"},
 {username:currentTestUser,role:"institution_viewer",status:"active"}
],activeRole:"platform_admin"};
function renderRoleAssignments(){
 const host=$("roleAssignmentList");host.replaceChildren();
 demo.roleAssignments.forEach((a,index)=>{const d=document.createElement("div");d.className="item";d.textContent=a.username+" · "+(institutionRoleLabels[a.role]||a.role)+" · "+a.status;host.append(d);});
 const switcher=$("activeRole");switcher.replaceChildren();
 const own=demo.roleAssignments.filter(a=>a.username.toLowerCase()===currentTestUser.toLowerCase()&&a.status==="active");
 const options=[{value:"platform_admin",label:"Platform Admin (platform scope)"},...own.map(a=>({value:a.role,label:institutionRoleLabels[a.role]}))];
 options.forEach(x=>{const o=document.createElement("option");o.value=x.value;o.textContent=x.label;switcher.append(o);});
 switcher.value=demo.activeRole;
}

function renderDemo(){
 list("branchList",demo.branches,x=>x.name+" · "+x.code+" · "+x.branchId+" · "+x.status);
 list("classList",demo.classes,x=>x.gradeLabel+" "+x.sectionCode+" · "+x.academicYear+" · "+x.branchId+" · "+x.classId);
 list("assignmentList",demo.assignments,x=>x.subjectId+" · teacher "+x.teacherMembershipId+" · class "+x.classId+" · "+x.status);
 list("enrollmentList",demo.enrollments,x=>"student "+x.studentMembershipId+" · class "+x.classId+" · "+x.academicYear+" · "+x.status);
 list("parentLinkList",demo.parentLinks,x=>x.relationship+" · parent "+x.parentMembershipId+" → student "+x.studentMembershipId+" · "+x.status);
 list("branchAdminList",demo.branchAdmins,x=>x.username+" · "+x.branchId+" · "+x.status);
}
function initLocalPlatformAdminTest(){
 state.identity={user:{username:"Jayaprakashganathe@gmail.com"},platformRoles:["platform_admin"],memberships:[{membershipId:"TEST-INSTITUTION-001",institutionId:"TEST-INSTITUTION-001",institutionName:"Demo Academy (test only)",role:"school_admin"}],context:{membershipId:"TEST-INSTITUTION-001"}};
 const select=$("m4Membership");select.replaceChildren();
 const o=document.createElement("option");o.value="TEST-INSTITUTION-001";o.textContent="Demo Academy (test only) · school_admin";select.append(o);
 const banner=document.createElement("div");banner.className="status";banner.style.cssText="background:#fff4d8;color:#684900;border:1px solid #e7c76a";
 banner.textContent="LOCAL RBAC TEST MODE — signed in as the mapped Platform Admin. Demo records exist only in this browser tab and are discarded on refresh. This is not production authentication or a real institution.";
 $("m4Status").replaceWith(banner);banner.id="m4Status";
 renderRoleAssignments();
 $("activeRole").addEventListener("change",()=>{demo.activeRole=$("activeRole").value;state.identity.context.role=demo.activeRole;status("Test persona switched to "+(demo.activeRole==="platform_admin"?"Platform Admin":institutionRoleLabels[demo.activeRole])+". This changes the local UI test context only.");});
 $("assignInstitutionRole").addEventListener("click",()=>{
  const actor=demo.activeRole,target=$("roleUser").value.trim(),role=$("institutionRole").value;
  if(!target) return status("Enter an account username or email.",true);
  if(actor!=="platform_admin"&&actor!=="school_admin")return status("Only Platform Admin or Institution Admin can assign institution roles in this test.",true);
  if(demo.roleAssignments.some(a=>a.username.toLowerCase()===target.toLowerCase()&&a.role===role&&a.status==="active"))return status("That account already has this active role in Demo Academy.",true);
  demo.roleAssignments.push({username:target,role,status:"active"});
  renderRoleAssignments();status((actor==="platform_admin"?"Platform Admin":"Institution Admin")+" assigned "+institutionRoleLabels[role]+" to "+target+". Local demo only.");
 });
 const add=(id,fn)=>$(id).addEventListener("click",()=>{try{fn();renderDemo();status("Demo action completed. Changes are temporary and not saved to a server.");}catch(e){status(e.message||"Demo action failed.",true);}});
 add("m4Refresh",renderDemo);
 add("createBranch",()=>{if(!$("branchName").value.trim()||!$("branchCode").value.trim())throw Error("Enter a branch name and code.");demo.branches.push({name:$("branchName").value.trim(),code:$("branchCode").value.trim(),branchId:"DEMO-BR-"+(demo.branches.length+1),status:"active"});});
 add("createClass",()=>{if(!$("classBranch").value.trim()||!$("gradeId").value.trim()||!$("sectionCode").value.trim())throw Error("Enter branch, grade and section.");demo.classes.push({branchId:$("classBranch").value.trim(),gradeLabel:"Grade "+$("gradeId").value.trim(),sectionCode:$("sectionCode").value.trim(),academicYear:$("academicYear").value.trim(),classId:"DEMO-CLASS-"+(demo.classes.length+1)});});
 add("assignTeacher",()=>{if(!$("teacherMembership").value.trim()||!$("assignmentClass").value.trim()||!$("assignmentSubject").value.trim())throw Error("Enter teacher, class and subject IDs.");demo.assignments.push({teacherMembershipId:$("teacherMembership").value.trim(),classId:$("assignmentClass").value.trim(),subjectId:$("assignmentSubject").value.trim(),status:"active"});});
 add("enrollStudent",()=>{if(!$("studentMembership").value.trim()||!$("enrollmentClass").value.trim())throw Error("Enter student and class IDs.");demo.enrollments.push({studentMembershipId:$("studentMembership").value.trim(),classId:$("enrollmentClass").value.trim(),academicYear:$("enrollmentYear").value.trim(),status:"active"});});
 add("linkParent",()=>{if(!$("parentMembership").value.trim()||!$("linkedStudentMembership").value.trim())throw Error("Enter parent and student membership IDs.");demo.parentLinks.push({parentMembershipId:$("parentMembership").value.trim(),studentMembershipId:$("linkedStudentMembership").value.trim(),relationship:$("relationship").value.trim(),status:"active"});});
 add("appointBranchAdmin",()=>{if(!$("adminBranch").value.trim()||!$("adminMembership").value.trim())throw Error("Enter branch and membership IDs.");demo.branchAdmins.push({branchId:$("adminBranch").value.trim(),username:$("adminMembership").value.trim(),status:"active"});});
 select.addEventListener("change",()=>status("Demo institution context selected."));
 renderDemo();
}
async function load(){
 if(isLocalPlatformAdminTest()){initLocalPlatformAdminTest();return;}
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