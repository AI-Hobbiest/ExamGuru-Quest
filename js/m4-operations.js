(()=>{"use strict";
const $=id=>document.getElementById(id),state={identity:null};
const status=(m,error=false)=>{$("m4Status").textContent=m;$("m4Status").className="status"+(error?" error":"");};
const list=(id,rows,format)=>{const host=$(id);host.replaceChildren();(rows||[]).forEach(r=>{const d=document.createElement("div");d.className="item";d.textContent=format(r);host.append(d);});if(!rows?.length){const d=document.createElement("div");d.className="item muted";d.textContent="No records yet.";host.append(d);}};
const run=async fn=>{try{status("Working…");await fn();status("Saved.");}catch(e){status(e.message||"Operation failed.",true);}};
async function load(){
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