/* ExamGuru Quest · temporary demo environment factory.
 * Uses the existing local institution services and their normal validation rules.
 * Demo records are isolated by a generated institution ID and are removed on Platform Admin sign-out.
 */
(() => {
  "use strict";
  const MANIFEST_KEY = "examguru_demo_environments_v2";
  const ADMIN_KEY = "examguru_mvp_admin_session_v1";
  const STUDENT_SESSION_KEY = "c10playground_static_student_v1";
  const text = value => String(value == null ? "" : value).trim();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const labels = { school_admin:"Institution Admin", institution_viewer:"Institution Viewer", teacher:"Teacher", parent:"Parent", student:"Student" };
  const now = () => new Date().toISOString();
  const uid = prefix => prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,8).toUpperCase();
  function readManifest() {
    try { const value = JSON.parse(localStorage.getItem(MANIFEST_KEY) || "[]"); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function writeManifest(rows) { localStorage.setItem(MANIFEST_KEY, JSON.stringify(rows)); }
  function isPlatformAdmin() {
    try {
      const session = JSON.parse(sessionStorage.getItem(ADMIN_KEY) || "null");
      return !!session && session.role === "admin" && session.username === "Jayaprakashganathe@gmail.com" && session.rbacTestMode === "local-platform-admin";
    } catch (_) { return false; }
  }
  function services() {
    const iam = window.ExamGuruLocalIAM, data = window.ExamGuruInstitutionData, content = window.ExamGuruInstitutionContent;
    if (!iam || !data || !window.C10Storage) throw new Error("The demo workspace services are still loading. Refresh and try again.");
    return { iam, data, content, storage: window.C10Storage };
  }
  function removeEnvironment(env) {
    if (!env) return;
    const api = services();
    (env.stores || []).forEach(item => {
      try {
        api.storage.createLocalStore({
          kind:item.kind, recordId:item.recordId, studentId:item.studentId || "",
          defaults:item.kind === "test-attempt-ledger" ? () => ({attempts:[],activeAttempt:null,answerRecords:[]}) : () => ({missed:[],answered:0,correct:0,attempts:[]}),
          validate:() => true
        }).clear();
      } catch (_) {}
    });
    try { if (api.content && typeof api.content.removeDemoEnvironment === "function") api.content.removeDemoEnvironment(env.institutionId,env.environmentId); } catch (_) {}
    try { if (api.data && typeof api.data.removeDemoEnvironment === "function") api.data.removeDemoEnvironment(env.institutionId,env.environmentId); } catch (_) {}
    try { if (api.iam && typeof api.iam.removeDemoEnvironment === "function") api.iam.removeDemoEnvironment(env.institutionId,env.environmentId,env.userIds||[]); } catch (_) {}
    try {
      const active = sessionStorage.getItem("examguru_active_institution_v1");
      if (active === env.institutionId) sessionStorage.removeItem("examguru_active_institution_v1");
      const previewId = sessionStorage.getItem("examguru_demo_preview_user_id");
      if ((env.userIds || []).includes(previewId)) sessionStorage.removeItem("examguru_demo_preview_user_id");
      const student = JSON.parse(sessionStorage.getItem(STUDENT_SESSION_KEY) || "null");
      if (student && env.studentIds && env.studentIds.includes(student.studentId)) sessionStorage.removeItem(STUDENT_SESSION_KEY);
      if (active === env.institutionId) {
        sessionStorage.setItem("examguru_rbac_test_role_v1", "platform_admin");
        sessionStorage.removeItem("examguru_active_demo_workspace_v1");
      }
    } catch (_) {}
  }
  function makeQuestions(prefix) {
    return [
      {questionId:prefix+"-Q1",question:"Which process do green plants use to prepare their food?",options:["Respiration","Photosynthesis","Transpiration","Digestion"],answer:1,explanation:"Plants use sunlight, water and carbon dioxide during photosynthesis.",difficulty:"Easy"},
      {questionId:prefix+"-Q2",question:"Which of these is a good conductor of electricity?",options:["Rubber","Wood","Copper","Plastic"],answer:2,explanation:"Copper allows electric current to pass through it easily.",difficulty:"Medium"},
      {questionId:prefix+"-Q3",question:"What is the SI unit of force?",options:["Joule","Newton","Watt","Pascal"],answer:1,explanation:"Force is measured in newtons.",difficulty:"Medium"},
      {questionId:prefix+"-Q4",question:"Which part of a plant absorbs most water from the soil?",options:["Flower","Leaf","Root hair","Stem"],answer:2,explanation:"Root hairs provide a large surface area for water absorption.",difficulty:"Hard"},
      {questionId:prefix+"-Q5",question:"Which material is generally transparent?",options:["Frosted glass","Clear glass","Cardboard","Wood"],answer:1,explanation:"Clear glass allows most light to pass through.",difficulty:"Easy"}
    ];
  }
  function seedStudentActivity(storage, studentId, classId, suffix) {
    const subjects = classId === "6"
      ? ["science","mathematics","english","social-science"]
      : ["science","mathematics","english","social-science","hindi"];
    const stores = [], daysAgo = [3,2,1,0];
    subjects.forEach((subject,index) => {
      const bankId = classId === "10" ? subject : "class-" + classId + "-" + subject;
      const ledger = storage.createLocalStore({
        kind:"test-attempt-ledger", recordId:bankId, studentId,
        defaults:() => ({attempts:[],activeAttempt:null,answerRecords:[]}),
        validate:value => !!value && Array.isArray(value.attempts) && Array.isArray(value.answerRecords) && (value.activeAttempt === null || typeof value.activeAttempt === "object")
      });
      const attempts = daysAgo.slice(0, index === 0 ? 4 : 2).map((days,position) => {
        const date = new Date(Date.now() - days * 86400000);
        date.setHours(10 + index, 15 + position * 5, 0, 0);
        const submittedAt = date.toISOString(), startedAt = new Date(date.getTime() - 12 * 60000).toISOString();
        const score = Math.min(10, 7 + ((index + position) % 4));
        return {
          attemptId:"DEMO-ATT-" + suffix + "-" + classId + "-" + subject + "-" + position,
          profileId:"",studentId,subjectId:subject,mode:"test",examType:"practice",
          examTitle:(subject.charAt(0).toUpperCase()+subject.slice(1).replace(/-/g," "))+" Skills Check",
          assessmentTitle:"Weekly Learning Check",status:"submitted",startedAt,submittedAt,
          score,maxScore:10,correctCount:score,questionCount:10,answeredCount:10,
          skippedCount:0,unansweredCount:0,durationSeconds:720,timeLimitSeconds:900,
          accuracyCount:score,accuracyTotal:10,marksEarned:score,maxMarks:10,marksAccuracy:score*10
        };
      });
      ledger.save({attempts,activeAttempt:null,answerRecords:[]});
      stores.push({kind:"test-attempt-ledger",recordId:bankId,studentId});
      const progress = storage.createLocalStore({
        kind:"subject-progress",recordId:bankId,studentId,
        defaults:() => ({missed:[],answered:0,correct:0,attempts:[]}),
        validate:value => !!value && Array.isArray(value.missed) && Number.isFinite(value.answered) && Number.isFinite(value.correct) && Array.isArray(value.attempts)
      });
      const answered = attempts.length * 10, correct = attempts.reduce((sum,row)=>sum+row.score,0);
      progress.save({missed:[],answered,correct,attempts:attempts.map(row=>({attemptId:row.attemptId,score:row.score,submittedAt:row.submittedAt}))});
      stores.push({kind:"subject-progress",recordId:bankId,studentId});
    });
    return stores;
  }
  function create(input) {
    const options = input || {};
    if (!isPlatformAdmin()) throw new Error("Sign in as Platform Admin to prepare a demo workspace.");
    if (options.source === "demo-account" && options.accountRulesConfirmed !== true) throw new Error("Please confirm that demo profiles should follow the standard account-creation rules.");
    const api = services(), iam = api.iam, data = api.data, storage = api.storage;
    const suffix = Date.now().toString(36).toLowerCase() + Math.random().toString(36).slice(2,5);
    const previousInstitution = sessionStorage.getItem("examguru_active_institution_v1") || "";
    const previousRole = sessionStorage.getItem("examguru_rbac_test_role_v1") || "platform_admin";
    const env = {environmentId:uid("DEMO"),institutionId:"",displayName:text(options.institutionName)||"Northstar Academy · Demo",createdAt:now(),cleanupOnLogout:true,userIds:[],studentIds:[],stores:[],accounts:{},classes:{},includeStudentActivity:options.includeStudentActivity !== false,source:options.source||"platform-admin"};
    try {
      const institution = iam.createInstitution({name:env.displayName,institutionType:"school"});
      env.institutionId = institution.institutionId;
      iam.markDemoEnvironment(env.institutionId,env.environmentId);
      data.setInstitution(env.institutionId);
      const branch = data.createBranch("Main Campus","MAIN");
      const grade6 = data.createGrade("Class 6","G06"), grade10 = data.createGrade("Class 10","G10");
      const subjects = ["Science","Mathematics","English","Social Science","Hindi"].map((name,index)=>data.createSubject(name,["SCI","MAT","ENG","SST","HIN"][index]));
      const class6 = data.createClass({name:"Class 6 · A",branchId:branch.branchId,gradeId:grade6.gradeId,subjectIds:subjects.slice(0,4).map(x=>x.subjectId),academicYear:"2026–27",contentClassId:"6"});
      const class10 = data.createClass({name:"Class 10 · A",branchId:branch.branchId,gradeId:grade10.gradeId,subjectIds:subjects.map(x=>x.subjectId),academicYear:"2026–27",contentClassId:"10"});
      env.classes = {class6:class6.classId,class10:class10.classId};
      const username = text(options.accountUsername);
      if (username && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) && !/^[a-z0-9._-]{3,32}$/i.test(username)) throw new Error("Enter a valid demo-account username using the normal account format.");
      const adminUser = iam.createUser({username:username||("demo.admin."+suffix+"@examguru.demo"),displayName:"Ananya Menon",roles:[{role:"school_admin",institutionId:env.institutionId,branchId:branch.branchId}],branchId:branch.branchId});
      const hodUser = iam.createUser({username:"demo.hod."+suffix+"@examguru.demo",displayName:"Kavya Nair",roles:[{role:"teacher",institutionId:env.institutionId,branchId:branch.branchId}],branchId:branch.branchId});
      const teacherUser = iam.createUser({username:"demo.teacher."+suffix+"@examguru.demo",displayName:"Rohan Iyer",roles:[{role:"teacher",institutionId:env.institutionId,branchId:branch.branchId}],branchId:branch.branchId});
      const viewerUser = iam.createUser({username:"demo.viewer."+suffix+"@examguru.demo",displayName:"Arjun Menon",roles:[{role:"institution_viewer",institutionId:env.institutionId,branchId:branch.branchId}],branchId:branch.branchId});
      const student6 = iam.createUser({username:"demo.student6."+suffix+"@examguru.demo",displayName:"Aarav Sharma",roles:[{role:"student",institutionId:env.institutionId,branchId:branch.branchId}],classId:class6.classId,branchId:branch.branchId,category:"school"});
      const student10 = iam.createUser({username:"demo.student10."+suffix+"@examguru.demo",displayName:"Diya Nair",roles:[{role:"student",institutionId:env.institutionId,branchId:branch.branchId}],classId:class10.classId,branchId:branch.branchId,category:"school"});
      const parent = iam.createUser({username:"demo.parent."+suffix+"@examguru.demo",displayName:"Meera Sharma",roles:[{role:"parent",institutionId:env.institutionId,branchId:branch.branchId}],branchId:branch.branchId});
      [adminUser,hodUser,teacherUser,viewerUser,student6,student10,parent].forEach(user=>env.userIds.push(user.userId));
      const hodMembership = hodUser.roles.find(role=>role.role==="teacher").membershipId;
      const teacherMembership = teacherUser.roles.find(role=>role.role==="teacher").membershipId;
      const adminMembership = adminUser.roles.find(role=>role.role==="school_admin").membershipId;
      const student6Membership = student6.roles.find(role=>role.role==="student").membershipId;
      const student10Membership = student10.roles.find(role=>role.role==="student").membershipId;
      const parentMembership = parent.roles.find(role=>role.role==="parent").membershipId;
      data.enrolStudent({studentMembershipId:student6Membership,classId:class6.classId,academicYear:"2026–27"});
      data.enrolStudent({studentMembershipId:student10Membership,classId:class10.classId,academicYear:"2026–27"});
      data.assignTeacher({teacherMembershipId:hodMembership,classId:class6.classId,subjectId:subjects[0].subjectId});
      data.assignTeacher({teacherMembershipId:teacherMembership,classId:class10.classId,subjectId:subjects[1].subjectId});
      const science = data.createDepartment("Science","SCI");
      data.addDepartmentMember(science.departmentId,hodMembership);
      data.setDepartmentClasses(science.departmentId,[class6.classId,class10.classId]);
      data.appointHod(science.departmentId,hodMembership);
      const academics = data.createDepartment("Mathematics","MAT");
      data.addDepartmentMember(academics.departmentId,teacherMembership);
      data.setDepartmentClasses(academics.departmentId,[class10.classId]);
      data.linkGuardian({parentMembershipId:parentMembership,studentMembershipId:student6Membership,relationship:"Parent/guardian"});
      env.accounts = {
        institutionAdmin:{userId:adminUser.userId,username:adminUser.username,displayName:adminUser.displayName,membershipId:adminMembership,role:"school_admin"},
        hod:{userId:hodUser.userId,username:hodUser.username,displayName:hodUser.displayName,membershipId:hodMembership,role:"teacher"},
        teacher:{userId:teacherUser.userId,username:teacherUser.username,displayName:teacherUser.displayName,membershipId:teacherMembership,role:"teacher"},
        institutionViewer:{userId:viewerUser.userId,username:viewerUser.username,displayName:viewerUser.displayName,membershipId:viewerUser.roles.find(role=>role.role==="institution_viewer").membershipId,role:"institution_viewer"},
        parent:{userId:parent.userId,username:parent.username,displayName:parent.displayName,membershipId:parentMembership,role:"parent"},
        student6:{userId:student6.userId,username:student6.username,displayName:student6.displayName,studentId:"DEMO-STUDENT6-"+suffix,classId:"6",membershipId:student6Membership,role:"student"},
        student10:{userId:student10.userId,username:student10.username,displayName:student10.displayName,studentId:"DEMO-STUDENT10-"+suffix,classId:"10",membershipId:student10Membership,role:"student"}
      };
      env.studentIds = [env.accounts.student6.studentId,env.accounts.student10.studentId];
      if (api.content) {
        const questions6 = makeQuestions("DEMO6");
        sessionStorage.setItem("examguru_rbac_test_role_v1","school_admin");
        const bank = api.content.saveBank({name:"Class 6 · Science · Demo Practice",contentClassId:"6",subject:"science",rows:questions6});
        api.content.publish("bank",bank.bankId);
        const paperRows = api.content.savePapers([{paperId:"DEMO-PAPER-"+suffix,title:"Class 6 Science · Sample Assessment",contentClassId:"6",subjectId:"science",subjectTitle:"Science",classId:"6",totalQuestions:questions6.length,totalMarks:questions6.length,durationMinutes:20,questions:questions6.map(q=>({questionId:q.questionId,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation}))}]);
        if (paperRows[0]) api.content.publish("paper",paperRows[0].paperId);
        sessionStorage.setItem("examguru_rbac_test_role_v1",previousRole);
      }
      if (env.includeStudentActivity) {
        env.stores.push(...seedStudentActivity(storage,env.accounts.student6.studentId,"6",suffix));
        env.stores.push(...seedStudentActivity(storage,env.accounts.student10.studentId,"10",suffix));
      }
      const record = {
        environmentId:env.environmentId,institutionId:env.institutionId,displayName:env.displayName,
        createdAt:env.createdAt,cleanupOnLogout:true,source:env.source,
        accountRulesValidated:true,includeStudentActivity:env.includeStudentActivity,
        userIds:env.userIds,studentIds:env.studentIds,stores:env.stores,accounts:env.accounts,classes:env.classes,
        counts:{branches:1,classes:2,subjects:5,departments:2,teachers:2,students:2,parents:1,assessments:api.content?2:0,studentAttempts:env.includeStudentActivity?22:0}
      };
      const all = readManifest(); all.push(record); writeManifest(all);
      try { if (previousInstitution) sessionStorage.setItem("examguru_active_institution_v1",previousInstitution); else sessionStorage.removeItem("examguru_active_institution_v1"); sessionStorage.setItem("examguru_rbac_test_role_v1",previousRole); } catch (_) {}
      return clone(record);
    } catch (error) {
      removeEnvironment(env);
      try { if (previousInstitution) sessionStorage.setItem("examguru_active_institution_v1",previousInstitution); else sessionStorage.removeItem("examguru_active_institution_v1"); sessionStorage.setItem("examguru_rbac_test_role_v1",previousRole); } catch (_) {}
      throw error;
    }
  }
  function cleanup(environmentId) {
    if (!isPlatformAdmin()) throw new Error("Only Platform Admin can reset or remove a demo workspace.");
    const all = readManifest(), targets = environmentId ? all.filter(x=>x.environmentId===environmentId) : all;
    targets.forEach(removeEnvironment);
    const removed = new Set(targets.map(x=>x.environmentId));
    writeManifest(all.filter(x=>!removed.has(x.environmentId)));
    try {
      const demos=JSON.parse(localStorage.getItem("examguru_m7_local_demos_v1")||"[]"),removedDemoIds=new Set(demos.filter(x=>removed.has(x.environmentId)).map(x=>x.demoId));
      localStorage.setItem("examguru_m7_local_demos_v1",JSON.stringify(demos.filter(x=>!removed.has(x.environmentId))));
      const events=JSON.parse(localStorage.getItem("examguru_m7_local_demo_audit_v1")||"[]");
      localStorage.setItem("examguru_m7_local_demo_audit_v1",JSON.stringify(events.filter(x=>!removedDemoIds.has(x.demoId))));
    } catch (_) {}
    return {removed:targets.length};
  }
  function cleanupOnLogout() {
    if (!isPlatformAdmin()) return {removed:0};
    return cleanup();
  }
  function previewOptions() {
    return readManifest().map(env => {
      const name = env.displayName || "Demo Institution";
      const inst = env.institutionId;
      const a = env.accounts || {};
      const rows = [];
      if (a.institutionAdmin) rows.push({key:"demo-admin@"+inst,role:"institution",institutionRole:"school_admin",institutionId:inst,demoUserId:a.institutionAdmin.userId,label:"Institution Admin · "+name});
      if (a.hod) rows.push({key:"demo-hod@"+inst,role:"institution",institutionRole:"hod",institutionId:inst,demoUserId:a.hod.userId,label:"HOD · "+name});
      if (a.teacher) rows.push({key:"demo-teacher@"+inst,role:"institution",institutionRole:"teacher",institutionId:inst,demoUserId:a.teacher.userId,label:"Teacher · "+name});
      if (a.institutionViewer) rows.push({key:"demo-viewer@"+inst,role:"institution",institutionRole:"institution_viewer",institutionId:inst,demoUserId:a.institutionViewer.userId,label:"Institution Viewer · "+name});
      if (a.parent) rows.push({key:"demo-parent@"+inst,role:"parent",institutionRole:"parent",institutionId:inst,demoUserId:a.parent.userId,label:"Parent · "+name});
      if (a.student6) rows.push({key:"demo-student6@"+inst,role:"student",institutionRole:"student",institutionId:inst,demoUserId:a.student6.userId,studentId:a.student6.studentId,classId:"6",username:a.student6.username,displayName:a.student6.displayName,label:"Student · Class 6 · "+name});
      if (a.student10) rows.push({key:"demo-student10@"+inst,role:"student",institutionRole:"student",institutionId:inst,demoUserId:a.student10.userId,studentId:a.student10.studentId,classId:"10",username:a.student10.username,displayName:a.student10.displayName,label:"Student · Class 10 · "+name});
      return rows;
    }).flat();
  }
  function mountWizard() {
    if (!document.body || !/admin\.html$/i.test(location.pathname) || !isPlatformAdmin()) return;
    const real = services().iam.institutions().filter(row=>!["TEST-INSTITUTION-001","INST-DIRECT-001"].includes(row.institutionId));
    if (readManifest().length || real.length || sessionStorage.getItem("examguru_demo_wizard_skipped_v2")) return;
    const style = document.createElement("style");
    style.textContent = ".eg-demo-wizard-backdrop{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(25,23,52,.54);backdrop-filter:blur(8px)}.eg-demo-wizard{width:min(700px,100%);max-height:92vh;overflow:auto;border:1px solid #e5e0f5;border-radius:26px;background:linear-gradient(145deg,#fff 0%,#fbfaff 62%,#f1f8f2 100%);box-shadow:0 30px 100px rgba(20,16,54,.28);padding:clamp(22px,4vw,36px);color:#29294c;font-family:system-ui,sans-serif}.eg-demo-wizard .kicker{display:inline-flex;gap:8px;align-items:center;padding:7px 11px;border-radius:999px;background:#efedff;color:#5143ad;font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.eg-demo-wizard h2{font-size:clamp(26px,4vw,36px);line-height:1.08;letter-spacing:-.035em;margin:16px 0 10px;color:#27264f}.eg-demo-wizard p{color:#6d6b84;line-height:1.6}.eg-demo-wizard .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.eg-demo-wizard .tile{padding:14px;border:1px solid #e5e1f0;border-radius:15px;background:#fff}.eg-demo-wizard .tile b{display:block;font-size:18px;color:#39336f}.eg-demo-wizard .tile span{display:block;font-size:12px;color:#77738c;margin-top:4px}.eg-demo-wizard .field{display:grid;gap:7px;margin:14px 0}.eg-demo-wizard label{font-size:13px;font-weight:750;color:#383653}.eg-demo-wizard input[type=text]{width:100%;box-sizing:border-box;border:1px solid #dcd7ec;border-radius:12px;padding:13px;font:inherit}.eg-demo-wizard .check{display:flex;align-items:flex-start;gap:10px;padding:13px;border:1px solid #e4e0ee;background:#fff;border-radius:13px;margin:12px 0}.eg-demo-wizard .check input{margin-top:3px;accent-color:#5c4cc2}.eg-demo-wizard .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.eg-demo-wizard button{border:0;border-radius:12px;padding:12px 17px;font:inherit;font-weight:800;cursor:pointer}.eg-demo-wizard .primary{background:#5143ad;color:#fff;box-shadow:0 8px 18px #5143ad2e}.eg-demo-wizard .secondary{background:#f0eef8;color:#5143ad}.eg-demo-wizard .status{padding:12px 14px;border-radius:12px;background:#f1f0fa;color:#49436f;font-size:13px;margin-top:12px}.eg-demo-wizard .status.ok{background:#eef8f0;color:#28623b}.eg-demo-wizard .status.error{background:#fff0f0;color:#982a36}@media(max-width:560px){.eg-demo-wizard .tiles{grid-template-columns:1fr}.eg-demo-wizard .actions button{width:100%}}";
    document.head.appendChild(style);
    const backdrop = document.createElement("div"); backdrop.className = "eg-demo-wizard-backdrop";
    backdrop.innerHTML = '<section class="eg-demo-wizard" role="dialog" aria-modal="true" aria-labelledby="egDemoWizardTitle"><div class="kicker">✦ Platform Admin · Demo setup</div><h2 id="egDemoWizardTitle">Let’s make your first institution demo feel alive.</h2><p>Prepare a complete sample school with realistic academic structure, staff, learners, department leadership and sample assessments. You can explore each role from the workspace switcher.</p><div class="tiles"><div class="tile"><b>6 roles</b><span>Admin, HOD, Teacher, Viewer, Parent & Student</span></div><div class="tile"><b>2 classes</b><span>Class 6 and Class 10</span></div><div class="tile"><b>Ready to explore</b><span>Sample exams and learner activity</span></div></div><div class="field"><label for="egDemoInstitutionName">Institution name</label><input id="egDemoInstitutionName" type="text" maxlength="80" value="Northstar Academy · Demo"></div><label class="check"><input id="egDemoActivity" type="checkbox" checked><span><b>Include student exam activity</b><br><small>Show completed tests, scores and learning progress in the Student experience.</small></span></label><p><small>We’re creating temporary demo data for this Platform Admin session. It will be cleared when you sign out. No existing institution or learner data will be changed.</small></p><div id="egDemoWizardStatus" class="status" role="status">Ready when you are.</div><div class="actions"><button class="primary" id="egDemoCreate">Create demo workspace</button><button class="secondary" id="egDemoSkip">Not now</button></div></section>';
    document.body.appendChild(backdrop);
    const status = backdrop.querySelector("#egDemoWizardStatus"), createButton = backdrop.querySelector("#egDemoCreate");
    let ready = false;
    backdrop.querySelector("#egDemoSkip").addEventListener("click",()=>{if(ready){sessionStorage.removeItem("examguru_demo_wizard_skipped_v2");location.reload();return;}sessionStorage.setItem("examguru_demo_wizard_skipped_v2","1");backdrop.remove();});
    createButton.addEventListener("click",()=>{
      if(ready){sessionStorage.removeItem("examguru_demo_wizard_skipped_v2");location.reload();return;}
      createButton.disabled = true; status.className = "status"; status.textContent = "Creating your demo data and preparing the role workspaces…";
      try {
        const result = create({source:"platform-admin",institutionName:backdrop.querySelector("#egDemoInstitutionName").value,includeStudentActivity:backdrop.querySelector("#egDemoActivity").checked});
        status.className = "status ok";
        status.textContent = "Your demo workspace is ready: 2 classes, 2 departments, 7 sample accounts and " + result.counts.studentAttempts + " completed student tests.";
        ready = true;
        createButton.textContent = "Open demo workspaces";
        createButton.disabled = false;
        backdrop.querySelector("#egDemoSkip").textContent = "Continue to Platform Admin";
      } catch (error) {
        createButton.disabled = false; status.className = "status error"; status.textContent = error.message || "We could not prepare the demo workspace. Please retry.";
      }
    });
  }
  const api = Object.freeze({create,cleanup,cleanupOnLogout,previewOptions,readManifest,isPlatformAdmin});
  window.ExamGuruDemoEnvironment = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mountWizard,{once:true});
  else mountWizard();
})();
