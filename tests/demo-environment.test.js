"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("js/demo-environment.js", "utf8");
const shell = fs.readFileSync("js/app-shell.js", "utf8");
const iamSource = fs.readFileSync("js/iam-local-store.js", "utf8");
const dataSource = fs.readFileSync("js/institution-data-store.js", "utf8");
const contentSource = fs.readFileSync("js/institution-content-store.js", "utf8");
const parentPage = fs.readFileSync("js/parent-dashboard.js", "utf8");
const demoPage = fs.readFileSync("platform-demo-management.html", "utf8");
const local = new Map(), session = new Map(), storeRows = new Map();
const localStorage = {
  getItem:key=>local.has(key)?local.get(key):null,
  setItem:(key,value)=>local.set(key,String(value)),
  removeItem:key=>local.delete(key)
};
const sessionStorage = {
  getItem:key=>session.has(key)?session.get(key):null,
  setItem:(key,value)=>session.set(key,String(value)),
  removeItem:key=>session.delete(key)
};
localStorage.setItem("examguru_m7_local_demos_v1",JSON.stringify([{demoId:"OLD-GENERIC-DEMO"}]));
localStorage.setItem("examguru_m7_local_demo_audit_v1",JSON.stringify([{demoId:"OLD-GENERIC-DEMO",action:"created"}]));
const clone = value => JSON.parse(JSON.stringify(value));
const state = {institutions:[{institutionId:"INST-CLIENT-01",name:"Client School",institutionType:"school",status:"active"}],users:[{userId:"USR-CLIENT-01",username:"client.admin@school.test",displayName:"Client Admin",status:"active",roles:[{role:"school_admin",institutionId:"INST-CLIENT-01",membershipId:"CLIENT-MEMBER-01"}]}]};
const institutionData = {};
let currentInstitution = "";
let sequence = 0;
const iam = {
  key:"examguru_iam_local_v1",
  institutions:()=>state.institutions.filter(x=>x.status==="active"),
  createInstitution({name,institutionType}) {
    const item={institutionId:"INST-DEMO-"+(++sequence),name,institutionType,status:"active"};
    state.institutions.push(item);persistIam();return item;
  },
  markDemoEnvironment(institutionId,environmentId){const item=state.institutions.find(x=>x.institutionId===institutionId);item.demoEnvironmentId=environmentId;persistIam();return item;},
  removeDemoEnvironment(institutionId,environmentId,userIds=[]){const item=state.institutions.find(x=>x.institutionId===institutionId);if(!item||item.demoEnvironmentId!==environmentId)return false;state.institutions=state.institutions.filter(x=>x.institutionId!==institutionId);const ids=new Set(userIds);state.users=state.users.filter(x=>!ids.has(x.userId));persistIam();return true;},
  createUser({username,displayName,roles,classId,branchId}) {
    const clean=String(username||"").trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)&&!/^[a-z0-9._-]{3,32}$/i.test(clean))throw Error("Invalid username");
    if(state.users.some(x=>x.username===clean))throw Error("Duplicate username");
    const normalized=roles.map(r=>{
      if(r.branchId&&!institutionData[currentInstitution]?.branches?.some(x=>x.branchId===r.branchId))throw Error("Account branch must belong to its institution");
      if(r.role==="student"&&(!classId||!institutionData[currentInstitution]?.classes?.some(x=>x.classId===classId)))throw Error("Student account needs an existing class");
      return {...r,membershipId:"MEM-"+(++sequence),classId:r.role==="student"?classId:null,branchId:branchId||null};
    });
    const user={userId:"USR-"+(++sequence),username:clean,displayName,status:"active",roles:normalized};
    state.users.push(user);persistIam();return clone(user);
  }
};
function persistIam(){localStorage.setItem(iam.key,JSON.stringify(state));}
const data = {
  key:"examguru_institution_data_v1",
  setInstitution(id){currentInstitution=id;sessionStorage.setItem("examguru_active_institution_v1",id);institutionData[id] ||= {branches:[],grades:[],subjects:[],classes:[],departments:[],assignments:[],enrolments:[],guardianLinks:[]};persistData();},
  createBranch(name,code){const x={branchId:"BR-"+(++sequence),name,code};institutionData[currentInstitution].branches.push(x);persistData();return x;},
  createGrade(name,code){const x={gradeId:"GR-"+(++sequence),name,code};institutionData[currentInstitution].grades.push(x);persistData();return x;},
  createSubject(name,code){const x={subjectId:"SUB-"+(++sequence),name,code};institutionData[currentInstitution].subjects.push(x);persistData();return x;},
  createClass(args){const x={...args,classId:"CLS-"+(++sequence),status:"active"};institutionData[currentInstitution].classes.push(x);persistData();return x;},
  createDepartment(name,code){const x={departmentId:"DEP-"+(++sequence),name,code,memberIds:[],classIds:[],status:"active"};institutionData[currentInstitution].departments.push(x);persistData();return x;},
  addDepartmentMember(id,membershipId){institutionData[currentInstitution].departments.find(x=>x.departmentId===id).memberIds.push(membershipId);persistData();},
  setDepartmentClasses(id,classIds){institutionData[currentInstitution].departments.find(x=>x.departmentId===id).classIds=classIds;persistData();},
  appointHod(id,membershipId){institutionData[currentInstitution].departments.find(x=>x.departmentId===id).hodMembershipId=membershipId;persistData();},
  enrolStudent(args){institutionData[currentInstitution].enrolments.push(args);persistData();},
  assignTeacher(args){institutionData[currentInstitution].assignments.push(args);persistData();},
  linkGuardian(args){institutionData[currentInstitution].guardianLinks.push(args);persistData();},
  getStateFor(id){return clone(institutionData[id]||{});},
  removeDemoEnvironment(id,environmentId){if(state.institutions.find(x=>x.institutionId===id)?.demoEnvironmentId!==environmentId)return false;delete institutionData[id];persistData();return true;}
};
function persistData(){localStorage.setItem(data.key,JSON.stringify({schemaVersion:1,institutions:clone(institutionData)}));}
const content = {
  saveBank:()=>({bankId:"BANK-"+(++sequence)}),
  publish:()=>{if(sessionStorage.getItem("examguru_rbac_test_role_v1")!=="school_admin")throw Error("Institution Admin context required to publish demo content");return true;},
  savePapers:rows=>rows.map(row=>({...row})),
  removeDemoEnvironment:(id,environmentId)=>{if(state.institutions.find(x=>x.institutionId===id)?.demoEnvironmentId!==environmentId)return false;const store=storage.createLocalStore({kind:"institution-content",recordId:"all",studentId:"",defaults:()=>({schemaVersion:1,institutions:{}})});const root=store.load();delete root.institutions[id];store.save(root);return true;}
};
const storage = {
  createLocalStore(options) {
    const key=[options.kind,options.studentId||"",options.recordId].join(":");
    if(!storeRows.has(key))storeRows.set(key,clone(typeof options.defaults==="function"?options.defaults():options.defaults||{}));
    return {
      load:()=>clone(storeRows.get(key)),
      save:value=>{storeRows.set(key,clone(value));return {persisted:true};},
      clear:()=>storeRows.delete(key),
      storageKey:key
    };
  }
};
const window = {ExamGuruLocalIAM:iam,ExamGuruInstitutionData:data,ExamGuruInstitutionContent:content,C10Storage:storage};
const document = {readyState:"loading",addEventListener(){}};
const location = {pathname:"/admin.html"};
sessionStorage.setItem("examguru_mvp_admin_session_v1",JSON.stringify({role:"admin",username:"demo.admin",demoAccount:true,rbacTestMode:"local-platform-admin"}));
vm.runInNewContext(source,{window,document,localStorage,sessionStorage,location,Date,Math,JSON,Set,Array,String,Number,Error});
assert.ok(shell.includes("examguru_demo_preview_user_id")&&shell.includes("cleanupOnLogout"),"role previews and sign-out cleanup are connected to the shared shell");
assert.ok(shell.includes("demo-student6@")&&shell.includes("demo-hod@")&&shell.includes("demo-viewer@"),"all institution demo roles are exposed in the workspace switcher");
assert.ok(shell.includes('auth.localTestMode&&auth.role!=="admin"?workspaceOptions.filter(w=>w.institutionId===auth.institutionId):workspaceOptions'),"institution role preview is restricted to its own institution");
assert.ok(parentPage.includes("examguru_demo_environments_v2"),"Parent preview uses its linked synthetic learners");
assert.ok(demoPage.includes("same username, institution, branch and student class-assignment checks"),"demo account creation explains standard account validation");
const api=window.ExamGuruDemoEnvironment;
assert.ok(api,"Demo environment service is registered");
assert.equal(api.isPlatformAdmin(),true,"synthetic public demo administrator is recognized as Platform Admin");
assert.ok(shell.includes('admin.username==="demo.admin"&&admin.demoAccount===true'),"shared shell recognizes the synthetic demo administrator");
assert.ok(iamSource.includes('session.username==="demo.admin"&&session.demoAccount===true'),"IAM lifecycle accepts only the marked synthetic demo administrator");
assert.ok(dataSource.includes('session.username==="demo.admin"&&session.demoAccount===true'),"academic-data cleanup accepts the marked synthetic demo administrator");
assert.ok(contentSource.includes('session.username==="demo.admin"&&session.demoAccount===true'),"learning-content cleanup accepts the marked synthetic demo administrator");
assert.throws(()=>api.create({source:"demo-account"}),error=>/standard account-creation rules/.test(error.message),"demo-account creation requires explicit account-rule confirmation");
const created=api.create({source:"platform-admin",institutionName:"Northstar Academy · Demo",includeStudentActivity:true});
assert.equal(created.counts.branches,5);
assert.equal(created.counts.classes,10);
assert.equal(created.counts.departments,2);
assert.equal(created.counts.students,200);
assert.equal(created.counts.teachers,6);
assert.equal(created.counts.hods,2);
assert.equal(created.counts.nonTeachingStaff,2);
assert.equal(created.counts.staff,10);
assert.equal(created.counts.parents,5);
assert.equal(created.counts.studentAttempts,2200);
assert.equal(created.accountRulesValidated,true);
assert.equal(sessionStorage.getItem("examguru_rbac_test_role_v1"),"platform_admin","Platform Admin context is restored after publishing sample content");
assert.equal(created.userIds.length,217,"all staff, parent and 200 student accounts are created through the institution account service");
assert.equal(created.accounts.students.length,200,"two hundred student profiles are created");
assert.equal(created.accounts.branches.length,5,"five branch profiles are created");
assert.equal(api.previewOptions().length,15,"Institution Admin, two HODs, six teachers, two non-teaching staff, Viewer, Parent and two Student previews are available");
assert.equal(data.getStateFor(created.institutionId).guardianLinks.length,200,"each demo learner is linked to a branch parent");
assert.equal(data.getStateFor(created.institutionId).departments.length,2,"two institution-level departments are created");
assert.ok(data.getStateFor(created.institutionId).departments.every(department=>department.memberIds.length===4&&department.hodMembershipId&&department.classIds.length===5),"each department has three teachers plus an additional HOD across five branch cohorts");
assert.equal(data.getStateFor(created.institutionId).assignments.length,10,"HOD and teachers are assigned to their department subject across five branches");
assert.equal(created.accounts.nonTeachingStaff.length,2,"one non-teaching staff account exists per department");
assert.equal(created.accounts.students.filter(student=>student.department==="Science").length,100,"Science cohorts contain 100 unique students");
assert.equal(created.accounts.students.filter(student=>student.department==="Mathematics").length,100,"Mathematics cohorts contain 100 unique students");
assert.ok([...storeRows.keys()].some(key=>key.includes(created.accounts.student6.studentId)),"student exam activity is stored under the demo learner scope");
const result=api.cleanupOnLogout();
assert.equal(result.removed,1);
assert.equal(api.readManifest().length,0);
assert.equal(localStorage.getItem("examguru_m7_local_demos_v1"),null,"all temporary demo account records are removed on Platform Admin sign-out");
assert.equal(localStorage.getItem("examguru_m7_local_demo_audit_v1"),null,"temporary demo audit entries are removed on Platform Admin sign-out");
assert.equal(state.institutions.some(x=>x.institutionId===created.institutionId),false,"demo institution is removed");
assert.equal(state.institutions.some(x=>x.institutionId==="INST-CLIENT-01"),true,"real client institution is preserved");
assert.equal(state.users.some(x=>created.userIds.includes(x.userId)),false,"only generated demo accounts are removed");
assert.equal(state.users.some(x=>x.userId==="USR-CLIENT-01"),true,"real client accounts are preserved");
assert.equal([...storeRows.keys()].some(key=>key.includes("DEMO-STUDENT6-")||key.includes("DEMO-STUDENT10-")),false,"demo learner exam and progress records are cleared");
console.log("Demo environment tests passed: Platform Admin setup, demo-account confirmation, seven valid role profiles, scoped student exam activity and sign-out cleanup.");
