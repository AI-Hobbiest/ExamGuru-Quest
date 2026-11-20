"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("js/institution-dashboard.js","utf8");
const html=fs.readFileSync("institution-operations.html","utf8");
const css=fs.readFileSync("css/institution-dashboard.css","utf8");
function run(role){
 const ids=["dashError","io-dash-setup","dashWelcome","dashInstitutionSubtitle","dashRole","dashHeroActions","dashDataStatus","metricStudents","metricTeachers","metricClasses","metricBranches","metricSubjects","metricDepartments","metricStudentsNote","metricTeachersNote","linkBranches","linkAcademic","linkDepartments","linkUsers","linkEnrolments","linkAssignments","linkContent","linkExams","pulseAssignments","pulseEnrolments","contentPublished","contentCopy","addonTitle","addonCopy","setupPercent","setupProgressBar","pulseTitle","pulseCopy","setupChecklist","dashWorkspaces","dashRefresh"];
 const elements=new Map(ids.map(id=>[id,{id,textContent:"",hidden:false,style:{},classList:{toggle(){}},setAttribute(){},addEventListener(){}}]));
 const checks=Array.from({length:5},()=>({classList:{toggle(){}},querySelector(){return {textContent:""}},setAttribute(){}}));
 elements.get("io-dash-setup").innerHTML="";
 const doc={getElementById:id=>elements.get(id)||null,querySelectorAll:()=>checks,querySelector:selector=>selector===".io-dash-setup"?elements.get("io-dash-setup"):null};
 const users=[
  {status:"active",roles:[{role:"school_admin",institutionId:"INST-1"}]},
  {status:"active",roles:[{role:"student",institutionId:"INST-1"}]},
  {status:"active",roles:[{role:"teacher",institutionId:"INST-1"}]},
  {status:"inactive",roles:[{role:"student",institutionId:"INST-1"}]},
  {status:"active",roles:[{role:"student",institutionId:"OTHER"}]}
 ];
 const state={branches:[{status:"active"},{status:"inactive"}],grades:[{status:"active"}],subjects:[{status:"active"},{status:"active"}],classes:[{status:"active"}],departments:[{status:"active"}],assignments:[{status:"active"}],enrolments:[{status:"active"},{status:"active"}]};
 const context={document:doc,window:{
  ExamGuruLocalIAM:{allUsers:()=>users,findInstitution:id=>id==="INST-1"?{name:"North Star Academy",institutionType:"school"}:null,getEntitlements:()=>({competitiveExams:{enabled:true,examIds:["CLAT"]}})},
  ExamGuruInstitutionData:{currentInstitutionId:()=>"INST-1",getState:()=>state},
  ExamGuruInstitutionContent:{currentInstitutionId:()=>"INST-1",list:()=>({banks:[{status:"published"},{status:"draft"}],papers:[{status:"published"}]})}
 },sessionStorage:{getItem:key=>key==="examguru_active_role_v1"?role:null},console};
 context.window.document=doc;context.window.sessionStorage=context.sessionStorage;vm.createContext(context);vm.runInContext(source,context);
 const val=id=>elements.get(id).textContent;
 assert.equal(val("dashWelcome"),"Welcome to North Star Academy");
 assert.equal(val("metricStudents"),"1","only active students in this tenant are counted");
 assert.equal(val("metricTeachers"),"1");
 assert.equal(val("metricBranches"),"1");
 assert.equal(val("metricClasses"),"1");
 assert.equal(val("metricSubjects"),"2");
 assert.equal(val("pulseAssignments"),"1");
 assert.equal(val("pulseEnrolments"),"2");
 assert.equal(val("contentPublished"),"2");
 assert.equal(val("linkContent"),"2 published · 1 drafts");
 assert.equal(val("linkExams"),"1 programmes enabled");
 assert.equal(elements.get("dashError").hidden,true);
 if(role==="school_admin"){assert.equal(elements.get("dashHeroActions").hidden,false);assert.equal(elements.get("setupChecklist").hidden,false);assert.equal(elements.get("dashWorkspaces").hidden,false);}
 else {assert.equal(elements.get("dashHeroActions").hidden,true);assert.equal(elements.get("setupChecklist").hidden,true);assert.equal(elements.get("dashWorkspaces").hidden,true);assert.ok(elements.get("io-dash-setup").innerHTML.includes("read-only access"));}
}
run("school_admin");run("institution_viewer");
for(const path of ["institution-branches.html","institution-academics.html","institution-departments.html","institution-assignments.html","institution-enrolments.html","user-management.html","institution-content.html","institution-competitive-exams.html"])assert.ok(html.includes("./"+path),"dashboard link retained: "+path);
assert.ok(html.includes("./js/institution-dashboard.js")&&html.includes("./css/institution-dashboard.css"));
assert.ok(css.includes("@media(max-width:600px)")&&css.includes("eg-theme-dark"));
console.log("Institution dashboard tests passed: tenant-scoped metrics, setup progress, content entitlements, admin/viewer gating, responsive and dark-theme assets.");
