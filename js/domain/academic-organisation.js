/* Provider-neutral academic organisation domain rules.
 * HOD is an appointment scoped to one department and selected classes,
 * never a global login/institution membership role.
 */
(() => {
 "use strict";
 const ACTIVE="active";
 const ROLES=Object.freeze({
  school_admin:new Set(["department.read","department.manage","department.member.manage","department.head.appoint","department.head.read","department.assignment.manage","department.report.read"]),
  teacher:new Set(["department.read","department.head.read","department.assignment.read","department.report.read"]),
  institution_viewer:new Set(["department.read"])
 });
 const deny=reason=>Object.freeze({allowed:false,reason});
 const allow=(reason,departmentMembershipId=null,appointmentId=null)=>Object.freeze({allowed:true,reason,departmentMembershipId,appointmentId});
 function isDepartmentHead(appointments,departmentId,classId,at=new Date().toISOString()){
  return (appointments||[]).some(a=>{
   if(!a||a.status!==ACTIVE||a.departmentId!==departmentId)return false;
   if(a.effectiveFrom&&a.effectiveFrom>at)return false;
   if(a.effectiveTo&&a.effectiveTo<=at)return false;
   return a.scopeAllDepartmentClasses===true||(Array.isArray(a.classIds)&&a.classIds.includes(classId));
  });
 }
 async function authorize(repositories,actor,permission,context){
  const c=context||{};
  if(!actor||typeof actor.userId!=="string"||!actor.userId)return deny("unauthenticated");
  if(typeof permission!=="string"||!permission)return deny("invalid-permission");
  if(!repositories||!repositories.identity||!repositories.institution||!repositories.academicOrganisation)return deny("repositories-unavailable");
  try{
   const user=await repositories.identity.getUserById(actor.userId);
   if(!user||user.status==="disabled")return deny("identity-inactive");
   const platformRoles=await repositories.identity.listPlatformRoles(actor.userId);
   if((platformRoles||[]).some(r=>r&&r.role==="platform_admin"&&!r.revokedAt))return allow("platform-admin");
   if(!c.institutionId||!c.departmentId)return deny("department-scope-required");
   const institution=await repositories.institution.getInstitution(c.institutionId);
   const department=await repositories.academicOrganisation.getDepartment(c.departmentId);
   if(!institution||institution.status!=="active"||!department||department.status!=="active"||department.institutionId!==c.institutionId)return deny("department-tenant-mismatch");
   const memberships=await repositories.identity.listMemberships(actor.userId);
   const eligible=(memberships||[]).filter(m=>m&&m.status==="active"&&m.institutionId===c.institutionId&&ROLES[m.role]&&ROLES[m.role].has(permission)&&(!c.institutionMembershipId||m.membershipId===c.institutionMembershipId));
   if(!eligible.length)return deny("institution-role-permission-denied");
   if(!c.institutionMembershipId&&eligible.length>1)return deny("institution-membership-context-required");
   const institutionMembership=eligible[0];
   if(institutionMembership.allBranches!==true){
    const scopes=await repositories.institution.listMembershipBranchScopes(institutionMembership.membershipId);
    const allowed=new Set((scopes||[]).map(x=>x.branchId));
    if(!c.branchId||!allowed.has(c.branchId))return deny("branch-scope-denied");
   }
   if(c.branchId){
    const branch=await repositories.institution.getBranch(c.branchId);
    if(!branch||branch.institutionId!==c.institutionId||branch.status!=="active")return deny("branch-tenant-mismatch");
   }
   const departmentMemberships=await repositories.academicOrganisation.listDepartmentMemberships(institutionMembership.membershipId);
   const dm=(departmentMemberships||[]).find(x=>x&&x.status==="active"&&x.departmentId===c.departmentId);
   if(institutionMembership.role!=="school_admin"&&institutionMembership.role!=="institution_viewer"&&!dm)return deny("department-membership-required");
   if(permission==="department.head.appoint"||permission==="department.member.manage"||permission==="department.manage"){
    if(institutionMembership.role!=="school_admin")return deny("school-admin-required");
   }
   if(permission==="department.assignment.manage"||permission==="department.assignment.read"){
    if(institutionMembership.role==="teacher"){
     if(!dm)return deny("department-membership-required");
     if(c.institutionClassId){
      const assignments=await repositories.academic.listTeacherAssignments(institutionMembership.membershipId);
      if(!(assignments||[]).some(a=>a.status==="active"&&a.departmentId===c.departmentId&&a.institutionId===c.institutionId&&a.institutionClassId===c.institutionClassId&&(!c.subjectId||a.subjectId===c.subjectId)))return deny("teacher-department-assignment-required");
     }else return deny("teacher-class-scope-required");
    }
   }
   if(permission==="department.head.read"&&institutionMembership.role==="teacher"){
    if(!dm)return deny("department-membership-required");
    const appointments=await repositories.academicOrganisation.listActiveHeadAppointments(dm.departmentMembershipId);
    if(!(appointments||[]).some(a=>a.departmentId===c.departmentId&&a.status==="active"&&(!a.effectiveFrom||a.effectiveFrom<=(c.at||new Date().toISOString()))&&(!a.effectiveTo||a.effectiveTo>(c.at||new Date().toISOString()))))return deny("active-head-appointment-required");
    return allow("department-head-appointment",dm.departmentMembershipId);
   }
   if(permission==="department.report.read"&&institutionMembership.role==="teacher"){
    if(!dm)return deny("department-membership-required");
    if(!c.institutionClassId)return deny("department-class-scope-required");
    const departmentClasses=await repositories.academicOrganisation.listDepartmentClassScopes(c.departmentId);
    if(!(departmentClasses||[]).some(x=>x.institutionClassId===c.institutionClassId))return deny("department-class-scope-denied");
    const appointments=await repositories.academicOrganisation.listActiveHeadAppointments(dm.departmentMembershipId);
    const headAppointment=(appointments||[]).find(a=>a.departmentId===c.departmentId&&isDepartmentHead([a],c.departmentId,c.institutionClassId,c.at||new Date().toISOString()));
    if(headAppointment)return allow("department-head-scoped",dm.departmentMembershipId,headAppointment.appointmentId||null);
    const assignments=await repositories.academic.listTeacherAssignments(institutionMembership.membershipId);
    if(!(assignments||[]).some(a=>a.status==="active"&&a.departmentId===c.departmentId&&a.institutionClassId===c.institutionClassId&&a.institutionId===c.institutionId&&(!c.subjectId||a.subjectId===c.subjectId)&&(!c.branchId||a.branchId===c.branchId)))return deny("teacher-assignment-required");
    return allow("teacher-assignment",dm.departmentMembershipId);
   }
   return allow("department-membership",dm?.departmentMembershipId||null);
  }catch(_){return deny("authorization-evaluation-failed");}
 }
 const api=Object.freeze({authorize,isDepartmentHead,ROLE_PERMISSIONS:ROLES});
 globalThis.ExamGuruAcademicOrganisation=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
