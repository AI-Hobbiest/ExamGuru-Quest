(()=>{"use strict";const $=id=>document.getElementById(id),iam=window.ExamGuruLocalIAM,db=window.ExamGuruInstitutionData,root=document.querySelector("[data-module]"),moduleName=root?.dataset.module;
function status(message,bad=false){const el=$("moduleStatus");if(el){el.textContent=message;el.className="status"+(bad?" error":"");}}
function fill(id,rows,placeholder,value,label){const el=$(id);if(!el)return;const old=el.value;el.replaceChildren();if(!el.multiple){const p=document.createElement("option");p.value="";p.textContent=placeholder;el.append(p);}rows.forEach(x=>{const o=document.createElement("option");o.value=value(x);o.textContent=label(x);el.append(o);});if(rows.some(x=>String(value(x))===old))el.value=old;}
function showList(id,rows,format){const el=$(id);if(!el)return;el.replaceChildren();if(!rows.length){const d=document.createElement("div");d.className="item muted";d.textContent="No records yet.";el.append(d);return;}rows.forEach(x=>{const d=document.createElement("div");d.className="item";d.textContent=format(x);el.append(d);});}
function users(role){return iam.allUsers().filter(u=>u.status==="active"&&(u.roles||[]).some(r=>r.role===role&&r.institutionId===db.currentInstitutionId()));}
function members(role){return users(role).map(u=>({user:u,membership:(u.roles||[]).find(r=>r.role===role&&r.institutionId===db.currentInstitutionId())})).filter(x=>x.membership?.membershipId);}
function refresh(){
 const s=db.getState(),branches=db.branches(),grades=db.grades(),subjects=db.subjects(),classes=db.classes();
 fill("classBranch",branches,"Choose branch",x=>x.branchId,x=>x.name+" · "+x.code);
 fill("classGrade",grades,"Choose institution grade",x=>x.gradeId,x=>x.name+" · "+x.code);
 fill("classSubjects",subjects,"",x=>x.subjectId,x=>x.name+" · "+x.code);
 fill("departmentSelect",db.departments(),"Choose department",x=>x.departmentId,x=>x.name);
 fill("departmentClasses",classes.filter(x=>x.status==="active"),"",x=>x.classId,x=>x.name+" · "+x.classId);
 const selectedDepartment=db.departments().find(x=>x.departmentId===$( "departmentSelect")?.value);Array.from($( "departmentClasses")?.options||[]).forEach(o=>o.selected=!!selectedDepartment?.classIds?.includes(o.value));
 fill("teacherSelect",members("teacher"),"Choose teacher membership",x=>x.membership.membershipId,x=>x.user.displayName+" · "+x.membership.membershipId);
 fill("teacherSelect",members("teacher"),"Choose teacher membership",x=>x.membership.membershipId,x=>x.user.displayName+" · "+x.membership.membershipId);
 fill("studentSelect",members("student"),"Choose student membership",x=>x.membership.membershipId,x=>x.user.displayName+" · "+x.membership.membershipId);
 fill("linkedStudentSelect",members("student"),"Choose student membership",x=>x.membership.membershipId,x=>x.user.displayName+" · "+x.membership.membershipId);
 fill("parentSelect",members("parent"),"Choose parent membership",x=>x.membership.membershipId,x=>x.user.displayName+" · "+x.membership.membershipId);
 fill("branchAdminSelect",[...members("teacher"),...members("institution_viewer")],"Choose membership",x=>x.membership.membershipId,x=>x.user.displayName+" · "+x.membership.membershipId);
 fill("classSelect",classes.filter(x=>x.status==="active"),"Choose class / cohort",x=>x.classId,x=>x.name+" · "+x.classId);
 fill("subjectSelect",subjects,"Choose subject",x=>x.subjectId,x=>x.name+" · "+x.code);
 showList("branchList",s.branches,x=>x.name+" · "+x.code+" · "+x.branchId);
 showList("gradeList",s.grades,x=>x.name+" · "+x.code+" · "+x.gradeId);
 showList("subjectList",s.subjects,x=>x.name+" · "+x.code+" · "+x.subjectId);
 showList("classList",s.classes,x=>x.name+" · "+x.classType+" · "+x.classId+" · "+(x.academicYear||"")+" · Content profile: "+(x.contentClassId||"not mapped"));
 showList("departmentList",s.departments,x=>x.name+" · "+x.code+" · Classes in HOD scope: "+(x.classIds||[]).length+" · HOD: "+(x.hodMembershipId||"Not appointed"));
 showList("departmentMembers",db.departments().find(x=>x.departmentId===$("departmentSelect")?.value)?.memberIds?.map(id=>({id,hod:id===db.departments().find(x=>x.departmentId===$("departmentSelect").value)?.hodMembershipId}))||[],x=>x.id+(x.hod?" · HOD":""));
 showList("assignmentList",s.assignments,x=>x.teacherMembershipId+" → "+x.classId+" · "+x.subjectId);
 showList("enrolmentList",s.enrolments,x=>x.studentMembershipId+" → "+x.classId+" · "+x.academicYear);
 showList("guardianList",s.guardianLinks,x=>x.parentMembershipId+" → "+x.studentMembershipId+" · "+x.relationship);
 showList("branchAdminList",s.branchAdmins,x=>x.membershipId+" · "+x.branchId);
}
function act(fn){try{fn();refresh();status("Saved in this browser for "+(db.getInstitution()?.name||"the active institution")+".");}catch(e){status(e.message||"Operation failed.",true);}}
if(moduleName==="branches"){
 $("createBranch").addEventListener("click",()=>act(()=>db.createBranch($("branchName").value,$("branchCode").value)));
}
if(moduleName==="academics"){
 $("createGrade").addEventListener("click",()=>act(()=>db.createGrade($("gradeName").value,$("gradeCode").value)));
 $("createSubject").addEventListener("click",()=>act(()=>db.createSubject($("subjectName").value,$("subjectCode").value)));
 $("classType").addEventListener("change",()=>{$("gradeField").hidden=$("classType").value==="cohort";});
 $("createClass").addEventListener("click",()=>act(()=>db.createClass({name:$("className").value,branchId:$("classBranch").value,gradeId:$("classType").value==="grade"?$("classGrade").value:null,subjectIds:Array.from($("classSubjects").selectedOptions).map(o=>o.value),classType:$("classType").value,academicYear:$("classYear").value,contentClassId:$("classContentProfile").value||null})));
}
if(moduleName==="departments"){
 $("createDepartment").addEventListener("click",()=>act(()=>db.createDepartment($("departmentName").value,$("departmentCode").value)));
 $("addDepartmentMember").addEventListener("click",()=>act(()=>db.addDepartmentMember($("departmentSelect").value,$("teacherSelect").value)));
 $("appointHod").addEventListener("click",()=>act(()=>db.appointHod($("departmentSelect").value,$("teacherSelect").value)));
 $("saveDepartmentClasses").addEventListener("click",()=>act(()=>db.setDepartmentClasses($("departmentSelect").value,Array.from($("departmentClasses").selectedOptions).map(o=>o.value))));
 $("departmentSelect").addEventListener("change",refresh);
}
if(moduleName==="assignments"){
 $("assignTeacher").addEventListener("click",()=>act(()=>db.assignTeacher({teacherMembershipId:$("teacherSelect").value,classId:$("classSelect").value,subjectId:$("subjectSelect").value})));
}
if(moduleName==="enrolments"){
 $("enrolStudent").addEventListener("click",()=>act(()=>db.enrolStudent({studentMembershipId:$("studentSelect").value,classId:$("classSelect").value,academicYear:$("enrolmentYear").value})));
 $("linkGuardian").addEventListener("click",()=>act(()=>db.linkGuardian({parentMembershipId:$("parentSelect").value,studentMembershipId:$("linkedStudentSelect").value,relationship:$("relationship").value})));
 $("appointBranchAdmin").addEventListener("click",()=>act(()=>db.appointBranchAdmin($("branchSelect")?.value||$("classBranch")?.value,$("branchAdminSelect").value)));
 fill("branchSelect",db.branches(),"Choose branch",x=>x.branchId,x=>x.name+" · "+x.code);
}
refresh();status("Institution workspace ready · "+(db.getInstitution()?.name||"active institution")+" · local-only storage.");
})();