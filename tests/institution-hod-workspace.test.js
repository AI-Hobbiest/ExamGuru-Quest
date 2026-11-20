"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const dashboard=fs.readFileSync("js/institution-dashboard.js","utf8");
const shell=fs.readFileSync("js/app-shell.js","utf8");
const iam=fs.readFileSync("js/iam-local-store.js","utf8");
const data=fs.readFileSync("js/institution-data-store.js","utf8");
assert.match(iam,/assignRole\(userId,role,institutionId/);
assert.doesNotMatch(iam,/role:"hod"/,"HOD must not be stored as a global IAM role");
assert.match(data,/hodMembershipIds=\[\.\.\.assigned,membershipId\]/,"HOD appointments are stored against teacher memberships");
assert.match(data,/assigned.length>=2/,"A third HOD appointment is rejected");
assert.match(data,/primaryDepartmentId!==departmentId/,"HOD appointment must match the teacher primary department");
assert.match(iam,/primaryDepartmentId/,"Teacher memberships require a primary department");
assert.match(iam,/role==="teacher".*primaryDepartmentId/s,"HOD is implemented as a Teacher membership with an additional department appointment");
assert.match(shell,/hodMembershipIds\|\|\[\]/,"local workspace derives HOD access from either of the two department appointments");
assert.match(shell,/institutionRoles:\["teacher","hod"\]/,"HODs retain teaching navigation when they also teach");
assert.match(shell,/current\.file!=="institution-operations\.html"&&\!\(auth\.role==="institution"&&auth\.institutionRole==="school_admin"\)/,"HOD cannot enter institution setup pages");
assert.match(dashboard,/institution_viewer/,"Institution Viewer remains an authorised institution-wide read-only role");
function run(auth,state,users){
 const ids=["institutionDashboard","dashGuestGate","dashError","dashWelcome","dashInstitutionSubtitle","dashRole","dashHeroActions","dashContentLink","dashExamLink","dashDataStatus","metricStudents","metricTeachers","metricClasses","metricBranches","metricSubjects","metricDepartments","metricStudentsNote","metricTeachersNote","linkBranches","linkAcademic","linkDepartments","linkUsers","linkEnrolments","linkAssignments","linkContent","linkExams","pulseAssignments","pulseEnrolments","contentPublished","contentCopy","addonTitle","addonCopy","setupPercent","setupProgressBar","pulseTitle","pulseCopy","setupChecklist","dashWorkspaces"];
 const elements=new Map(ids.map(id=>[id,{id,textContent:"",hidden:id==="institutionDashboard",style:{},classList:{toggle(){}},setAttribute(){},addEventListener(){}}]));
 const checks=Array.from({length:5},()=>({classList:{toggle(){}},querySelector(){return {textContent:""}},setAttribute(){}}));
 const doc={getElementById:id=>elements.get(id)||null,querySelectorAll:()=>checks,querySelector:()=>null};
 const listeners={};const context={document:doc,window:{addEventListener:(n,fn)=>listeners[n]=fn,ExamGuruLocalIAM:{allUsers:()=>users,findInstitution:id=>id==="INST-1"?{name:"Academy",institutionType:"school"}:null,getEntitlements:()=>({})},ExamGuruInstitutionData:{currentInstitutionId:()=>"INST-1",setInstitution:id=>id,getState:()=>state}},console};
 vm.createContext(context);vm.runInContext(dashboard,context);listeners["examguru-auth-state-ready"]({detail:auth});return elements;
}
const state={branches:[],grades:[],subjects:[{subjectId:"sci"}],classes:[{classId:"class-6",status:"active"},{classId:"class-10",status:"active"}],departments:[{departmentId:"science",name:"Science",memberIds:["teacher-1"],classIds:["class-6"],hodMembershipId:"teacher-mem-1",status:"active"},{departmentId:"maths",name:"Maths",memberIds:["teacher-2"],classIds:["class-10"],hodMembershipId:"teacher-mem-2",status:"active"}],assignments:[{teacherMembershipId:"teacher-1",classId:"class-6",subjectId:"sci",status:"active"},{teacherMembershipId:"teacher-2",classId:"class-10",subjectId:"math",status:"active"}],enrolments:[{studentMembershipId:"student-1",classId:"class-6",status:"active"},{studentMembershipId:"student-2",classId:"class-10",status:"active"}]};
const users=[{userId:"t1",status:"active",roles:[{role:"teacher",institutionId:"INST-1",membershipId:"teacher-mem-1"}]},{userId:"t2",status:"active",roles:[{role:"teacher",institutionId:"INST-1",membershipId:"teacher-mem-2"}]},{userId:"s1",status:"active",roles:[{role:"student",institutionId:"INST-1",membershipId:"student-1"}]},{userId:"s2",status:"active",roles:[{role:"student",institutionId:"INST-1",membershipId:"student-2"}]}];
const auth={role:"institution",institutionRole:"hod",institutionId:"INST-1",membershipId:"teacher-mem-1",teacherMembershipId:"teacher-mem-1",departmentIds:["science"]};
const out=run(auth,state,users),val=id=>out.get(id).textContent;
assert.equal(out.get("institutionDashboard").hidden,false);
assert.equal(val("dashRole"),"Head of Department · Scoped access");
assert.equal(val("metricStudents"),"1","HOD sees only students in the department's assigned class scope");
assert.equal(val("metricTeachers"),"1","HOD sees only department members");
assert.equal(val("metricClasses"),"1","HOD sees only assigned department classes");
assert.equal(val("pulseAssignments"),"1","HOD sees only assignments within department classes");
assert.equal(out.get("dashWorkspaces").hidden,true,"HOD cannot see institution-wide administration links");
const noScope={...state,departments:state.departments.map(d=>({...d,classIds:[]}))};
const denied=run(auth,noScope,users);assert.equal(denied.get("institutionDashboard").hidden,true,"HOD without explicit class scope fails closed");assert.equal(denied.get("dashGuestGate").hidden,false);

/* Exercise the actual local department store: two HODs are allowed, a third is rejected,
   and an HOD's teacher membership can still be assigned to a class in another department. */
const local={};const localUsers=[1,2,3].map(n=>({userId:"t"+n,status:"active",roles:[{role:"teacher",institutionId:"INST-X",membershipId:"tm"+n,primaryDepartmentId:null}]}));
const fakeIAM={institutionId:"INST-X",allUsers:()=>localUsers,findInstitution:id=>id==="INST-X"?{institutionId:id}:null,saveUser:u=>{const i=localUsers.findIndex(x=>x.userId===u.userId);if(i>=0)localUsers[i]=u;return u;}};
const storeContext={window:{ExamGuruLocalIAM:fakeIAM},localStorage:{getItem:k=>local[k]||null,setItem:(k,v)=>{local[k]=v;}},sessionStorage:{getItem:()=>null,setItem:()=>{}},Date,Math,Error};
vm.createContext(storeContext);vm.runInContext(data,storeContext);
const store=storeContext.window.ExamGuruInstitutionData;
const dept=store.createDepartment("Science","SCI"),other=store.createDepartment("Mathematics","MATH");
localUsers.forEach((u,i)=>{u.roles[0].primaryDepartmentId=dept.departmentId;store.addDepartmentMember(dept.departmentId,"tm"+(i+1));});
store.appointHod(dept.departmentId,"tm1");store.appointHod(dept.departmentId,"tm2");
assert.throws(()=>store.appointHod(dept.departmentId,"tm3"),/maximum of two active HODs/,"A third HOD cannot be appointed");
assert.equal(store.departments().find(x=>x.departmentId===dept.departmentId).hodMembershipIds.length,2);
const branch=store.createBranch("Main","MAIN"),grade=store.createGrade("Class 9","G9"),subject=store.createSubject("Mathematics","MATH");
const cls=store.createClass({name:"Class 9A",branchId:branch.branchId,gradeId:grade.gradeId,subjectIds:[subject.subjectId]});
assert.doesNotThrow(()=>store.assignTeacher({teacherMembershipId:"tm1",classId:cls.classId,subjectId:subject.subjectId}),"An HOD can teach a class outside their primary department");
assert.equal(store.departments().find(x=>x.departmentId===other.departmentId).memberIds.length,0,"Cross-department teaching does not change primary department membership");

console.log("HOD workspace tests passed: appointment-derived access, department membership and class scope isolation, and fail-closed empty scope.");
