"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("js/institution-dashboard.js","utf8"),html=fs.readFileSync("institution-operations.html","utf8"),css=fs.readFileSync("css/institution-dashboard.css","utf8");
function run(auth){
 const ids=["institutionDashboard","dashGuestGate","dashError","io-dash-setup","dashWelcome","dashInstitutionSubtitle","dashRole","dashHeroActions","dashContentLink","dashExamLink","dashDataStatus","metricStudents","metricTeachers","metricClasses","metricBranches","metricSubjects","metricDepartments","metricStudentsNote","metricTeachersNote","linkBranches","linkAcademic","linkDepartments","linkUsers","linkEnrolments","linkAssignments","linkContent","linkExams","pulseAssignments","pulseEnrolments","contentPublished","contentCopy","addonTitle","addonCopy","setupPercent","setupProgressBar","pulseTitle","pulseCopy","setupChecklist","dashWorkspaces","dashRefresh"];
 const elements=new Map(ids.map(id=>[id,{id,textContent:"",hidden:id==="institutionDashboard",style:{},classList:{toggle(){}},setAttribute(){},addEventListener(){}}]));
 const checks=Array.from({length:5},()=>({classList:{toggle(){}},querySelector(){return {textContent:""}},setAttribute(){}}));
 const doc={getElementById:id=>elements.get(id)||null,querySelectorAll:()=>checks,querySelector:s=>s===".io-dash-setup"?elements.get("io-dash-setup"):null};
 const users=[{status:"active",roles:[{role:"school_admin",institutionId:"INST-1"}]},{status:"active",roles:[{role:"student",institutionId:"INST-1"}]},{status:"active",roles:[{role:"teacher",institutionId:"INST-1"}]},{status:"inactive",roles:[{role:"student",institutionId:"INST-1"}]},{status:"active",roles:[{role:"student",institutionId:"OTHER"}]}];
 const state={branches:[{status:"active"},{status:"inactive"}],grades:[{status:"active"}],subjects:[{status:"active"},{status:"active"}],classes:[{status:"active"}],departments:[{status:"active"}],assignments:[{status:"active"}],enrolments:[{status:"active"},{status:"active"}]};
 const listeners={};const context={document:doc,window:{addEventListener:(n,fn)=>listeners[n]=fn,ExamGuruLocalIAM:{allUsers:()=>users,findInstitution:id=>id==="INST-1"?{name:"North Star Academy",institutionType:"school"}:null,getEntitlements:()=>({competitiveExams:{enabled:true,examIds:["CLAT"]}})},ExamGuruInstitutionData:{currentInstitutionId:()=>"INST-1",setInstitution:id=>id,getState:()=>state},ExamGuruInstitutionContent:{currentInstitutionId:()=>"INST-1",list:()=>({banks:[{status:"published"},{status:"draft"}],papers:[{status:"published"}]})}},console};
 context.window.document=doc;vm.createContext(context);vm.runInContext(source,context);
 if(auth)listeners["examguru-auth-state-ready"]({detail:auth});
 return {elements,auth};
}
const guest=run({role:"guest"});assert.equal(guest.elements.get("institutionDashboard").hidden,true,"guest must never see institution dashboard");assert.equal(guest.elements.get("dashGuestGate").hidden,false,"guest sees sign-in gate");assert.equal(guest.elements.get("metricStudents").textContent,"","guest metrics must remain unpopulated");
for(const role of ["school_admin","institution_viewer"]){
 const {elements}=run({role:"institution",institutionRole:role,institutionId:"INST-1",membershipId:"MEM-1"});
 const val=id=>elements.get(id).textContent;
 assert.equal(elements.get("institutionDashboard").hidden,false);assert.equal(elements.get("dashGuestGate").hidden,true);
 assert.equal(val("dashWelcome"),"Welcome to North Star Academy");assert.equal(val("metricStudents"),"1");assert.equal(val("metricTeachers"),"1");assert.equal(val("metricBranches"),"1");assert.equal(val("metricClasses"),"1");assert.equal(val("metricSubjects"),"2");assert.equal(val("pulseAssignments"),"1");assert.equal(val("pulseEnrolments"),"2");assert.equal(val("contentPublished"),"2");assert.equal(val("linkContent"),"2 published · 1 drafts");assert.equal(val("linkExams"),"1 programmes enabled");
 if(role==="school_admin")assert.equal(elements.get("dashHeroActions").hidden,false);else{assert.equal(elements.get("dashHeroActions").hidden,true);assert.equal(elements.get("setupChecklist").hidden,true);assert.equal(elements.get("dashWorkspaces").hidden,true);assert.equal(elements.get("dashContentLink").hidden,true);assert.equal(elements.get("dashExamLink").hidden,true);}
}
const wrongTenant=run({role:"institution",institutionRole:"institution_viewer",institutionId:"OTHER",membershipId:"MEM-2"});assert.equal(wrongTenant.elements.get("institutionDashboard").hidden,true,"unknown tenant must fail closed");
const wrongRole=run({role:"student",institutionId:"INST-1"});assert.equal(wrongRole.elements.get("institutionDashboard").hidden,true,"non-institution role must fail closed");
for(const path of ["institution-branches.html","institution-academics.html","institution-departments.html","institution-assignments.html","institution-enrolments.html","user-management.html","institution-content.html","institution-competitive-exams.html"])assert.ok(html.includes("./"+path),"dashboard link retained: "+path);
assert.ok(html.includes('id="institutionDashboard" hidden')&&html.includes('id="dashGuestGate"'));
assert.ok(html.includes("./js/institution-dashboard.js?v=20261120-dept-v1")&&css.includes(".io-dash-guest"));
assert.ok(css.includes("@media(max-width:600px)")&&css.includes("eg-theme-dark"));
console.log("Institution dashboard security regression passed: guest denied, no guest metrics populated, authenticated tenant membership required, viewer/admin gating preserved.");
