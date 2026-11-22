/* Responsive, session-aware navigation for ExamGuru Quest. */
(() => {
  "use strict";
  /* Resolve assistant assets beside this shell script, not against document.baseURI.
     A page-level <base> element or nested route must not redirect these requests. */
  const appShellScript=document.currentScript;
  const assistantAssetBase=appShellScript&&appShellScript.src
    ?new URL("../",appShellScript.src)
    :new URL("./",location.href);
  /* Cache-bust shared shell CSS so workspace-switcher styles reach every portal page. */
  const shellCss=document.querySelector('link[href*="css/app-shell.css"]');
  if(shellCss)shellCss.href="./css/app-shell.css?v=20261122-m8-role-chat";
  else{const shellLink=document.createElement("link");shellLink.rel="stylesheet";shellLink.href="./css/app-shell.css?v=20261119-iam-v1";document.head.appendChild(shellLink);}
  /* Load the shared Quest 2.0 light theme after legacy/page-local styles. */
  const softThemeId="c10SoftSpectrumTheme";
  if(!document.getElementById(softThemeId)){
    const themeLink=document.createElement("link");
    themeLink.id=softThemeId;themeLink.rel="stylesheet";
    themeLink.href="./css/theme-soft-spectrum.css?v=soft-spectrum-v15";
    document.head.appendChild(themeLink);
  }
  const themeColor=document.querySelector('meta[name="theme-color"]');
  const themeStorageKey="examguru_theme_preference_v1";
  function readThemePreference(){
    try{return localStorage.getItem(themeStorageKey)==="dark"?"dark":"light";}catch(_){return "light";}
  }
  function updateThemeButton(button,dark){
    button.textContent=dark?"☀":"☾";
    button.setAttribute("aria-label",dark?"Switch to light theme":"Switch to dark theme");
    button.setAttribute("aria-pressed",String(dark));
    button.title=dark?"Switch to light theme":"Switch to dark theme";
  }
  function applyTheme(mode,persist=true){
    const dark=mode==="dark";
    document.documentElement.classList.toggle("eg-theme-dark",dark);
    if(document.body)document.body.classList.toggle("eg-theme-dark",dark);
    if(themeColor)themeColor.setAttribute("content",dark?"#2B3948":"#FFFFFF");
    if(persist){try{localStorage.setItem(themeStorageKey,dark?"dark":"light");}catch(_){}}
    const button=document.getElementById("c10ThemeToggle");
    if(button)updateThemeButton(button,dark);
  }
  applyTheme(readThemePreference(),false);
  const links=[
    {label:"Sign in",icon:"🔐",href:"./index.html",page:"index.html",auth:"guest"},

    {label:"Family dashboard",group:"Family",icon:"👨‍👩‍👧‍👦",href:"./parent.html",page:"parent.html",auth:"parent"},
    {label:"Create & assign tests",group:"Family",icon:"📝",href:"./parent.html#assessments",page:"parent.html",hash:"#assessments",auth:"parent"},
    {label:"Exam Paper Practice",icon:"📝",href:"./parent.html#exam-paper-practice",page:"parent.html",hash:"#exam-paper-practice",auth:"parent"},
    {label:"FAQ & Guide",icon:"❔",href:"./help.html#parent-guide",page:"help.html",auth:"parent"},

    {label:"Dashboard",icon:"🏡",href:"./dashboard.html",page:"dashboard.html",clatHref:"./clat-dashboard.html",clatPage:"clat-dashboard.html",clatHash:"",auth:"student"},
    {label:"All subjects",group:"Subjects",icon:"📚",href:"./dashboard.html#subjects",page:"dashboard.html",hash:"#subjects",auth:"student"},

    {label:"Science",group:"Subjects",icon:"🧪",href:"./practice.html?subject=science",page:"practice.html",subject:"science",auth:"student"},
    {label:"Science - SOF",group:"Subjects",icon:"🏆",href:"./practice.html?subject=science-sof",page:"practice.html",subject:"science-sof",auth:"student"},
    {label:"Mathematics",group:"Subjects",icon:"📐",href:"./practice.html?subject=mathematics",page:"practice.html",subject:"mathematics",auth:"student"},
    {label:"Mathematics - SOF",group:"Subjects",icon:"🏆",href:"./practice.html?subject=mathematics-sof",page:"practice.html",subject:"mathematics-sof",auth:"student"},
    {label:"English",group:"Subjects",icon:"📖",href:"./practice.html?subject=english",page:"practice.html",subject:"english",auth:"student"},
    {label:"English - SOF",group:"Subjects",icon:"🏆",href:"./practice.html?subject=english-sof",page:"practice.html",subject:"english-sof",auth:"student"},
    {label:"Social Science",group:"Subjects",icon:"🌍",href:"./practice.html?subject=social-science",page:"practice.html",subject:"social-science",auth:"student"},
    {label:"Hindi",group:"Subjects",icon:"📝",href:"./practice.html?subject=hindi",page:"practice.html",subject:"hindi",auth:"student"},

    {label:"Study Library",group:"Learning Hub",icon:"📖",href:"./study.html",page:"study.html",auth:"student"},
    {label:"Institution content",group:"Learning Hub",icon:"🏢",href:"./institution-learning.html",page:"institution-learning.html",auth:"student",institutionOnly:true},
    {label:"My Learning",group:"Learning Hub",icon:"🧠",href:"./learning.html",page:"learning.html",auth:"student"},

    {label:"Assessment Test",group:"Assessments",icon:"📋",href:"./dashboard.html#assigned-tests",page:"dashboard.html",hash:"#assigned-tests",clatHref:"./clat.html#library",clatPage:"clat.html",clatHash:"#library",auth:"student"},
    {label:"Exam Paper Practice",icon:"📝",href:"./exam-practice.html",page:"exam-practice.html",classIds:["6","10"],auth:"student"},
    {label:"CBSE Previous Year Papers",group:"Assessments",icon:"📚",href:"./pyq-library.html",page:"pyq-library.html",classIds:["10"],auth:"student"},
    {label:"CLAT UG 2027",group:"Entrance Exams",icon:"⚖️",href:"./clat.html#library",page:"clat.html",clatHref:"./clat.html#library",clatPage:"clat.html",clatHash:"#library",classIds:["CLAT"],entitlement:"competitiveExams:CLAT",auth:"student"},
    {label:"JEE Main & Advanced",group:"Entrance Exams",icon:"📐",disabled:true,status:"Coming soon",classIds:["10"],entitlement:"competitiveExams:JEE_MAIN",auth:"student"},
    {label:"NEET UG",group:"Entrance Exams",icon:"🧬",disabled:true,status:"Coming soon",classIds:["10"],auth:"student"},
    {label:"CUET UG",group:"Entrance Exams",icon:"🎓",disabled:true,status:"Coming soon",classIds:["10"],entitlement:"competitiveExams:CUET_UG",auth:"student"},
    {label:"NDA (10+2)",group:"Entrance Exams",icon:"🛡️",disabled:true,status:"Coming soon",classIds:["10"],entitlement:"competitiveExams:NDA",auth:"student"},
    {label:"IPMAT",group:"Entrance Exams",icon:"📊",disabled:true,status:"Coming soon",classIds:["10"],entitlement:"competitiveExams:IPMAT",auth:"student"},
    {label:"My profile",group:"My Account",icon:"👤",href:"./profile.html#profile",page:"profile.html",hash:"#profile",auth:"student"},
    {label:"Test history",group:"My Account",icon:"📈",href:"./profile.html#history",page:"profile.html",hash:"#history",auth:"student"},
    {label:"Levels & rewards",group:"My Account",icon:"🏆",href:"./dashboard.html#rewards",page:"dashboard.html",hash:"#rewards",auth:"student"},
    {label:"Backup & restore",group:"My Account",icon:"💾",href:"./profile.html#backup",page:"profile.html",hash:"#backup",auth:"student"},
    {label:"FAQ & Guide",icon:"❔",href:"./help.html#student-guide",page:"help.html",auth:"student"},

    {label:"Overview",group:"Workspace",icon:"🏠",href:"./admin.html#tab-overview",page:"admin.html",hash:"#tab-overview",auth:"admin"},
    {label:"Question banks",group:"Workspace",icon:"🧩",href:"./admin.html#tab-banks",page:"admin.html",hash:"#tab-banks",auth:"admin"},
    {label:"CBSE question review",group:"Assessments & authoring",icon:"📄",href:"./admin.html#tab-cbse-review",page:"admin.html",hash:"#tab-cbse-review",auth:"admin"},
    
    {label:"Platform curriculum catalogue",group:"Workspace",icon:"🏫",href:"./admin.html#tab-classes",page:"admin.html",hash:"#tab-classes",auth:"admin"},
    {label:"Exam Paper Studio",group:"Assessments & authoring",icon:"📝",href:"./admin.html#tab-exam-papers",page:"admin.html",hash:"#tab-exam-papers",auth:"admin"},
    {label:"Knowledge base",group:"Workspace",icon:"📚",href:"./admin.html#tab-knowledge",page:"admin.html",hash:"#tab-knowledge",auth:"admin"},
    {label:"Students & reports",group:"People & insights",icon:"👩‍🎓",href:"./admin.html#tab-students",page:"admin.html",hash:"#tab-students",auth:"admin"},
    {label:"Leaderboards",group:"People & insights",icon:"🏆",href:"./admin.html#tab-leaderboard",page:"admin.html",hash:"#tab-leaderboard",auth:"admin"},
    {label:"User Management",group:"Institutions",icon:"👥",href:"./user-management.html",page:"user-management.html",auth:"admin"},
    {label:"Admin access",group:"System",icon:"🔐",href:"./admin.html#tab-access",page:"admin.html",hash:"#tab-access",auth:"admin"},
    {label:"Institution Operations",group:"Institutions",icon:"🏢",href:"./institution-operations.html",page:"institution-operations.html",auth:"admin"},
    {label:"Demo Management",group:"Platform operations",icon:"🧪",href:"./platform-demo-management.html",page:"platform-demo-management.html",auth:"admin"},
    {label:"Competitive Exams",group:"Workspace",icon:"⚖️",href:"./competitive-exams-admin.html",page:"competitive-exams-admin.html",auth:"admin"},
    {label:"Institution entitlements",group:"Institutions",icon:"🎟️",href:"./platform-entitlements.html",page:"platform-entitlements.html",auth:"admin"},
    {label:"Operations overview",group:"Institution",icon:"🏢",href:"./institution-operations.html",page:"institution-operations.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"HOD workspace",group:"Department",icon:"🏛️",href:"./institution-operations.html",page:"institution-operations.html",auth:"institution",institutionRoles:["hod"]},
    {label:"Branches & campuses",group:"Institution setup",icon:"🏫",href:"./institution-branches.html",page:"institution-branches.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"Academic structure",group:"Institution setup",icon:"📚",href:"./institution-academics.html",page:"institution-academics.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"Departments & HOD",group:"Academic administration",icon:"🏛️",href:"./institution-departments.html",page:"institution-departments.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"Teaching assignments",group:"Academic administration",icon:"🧑‍🏫",href:"./institution-assignments.html",page:"institution-assignments.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"Student enrolments",group:"People & enrolments",icon:"🎓",href:"./institution-enrolments.html",page:"institution-enrolments.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"User Management",group:"Institution",icon:"👥",href:"./user-management.html",page:"user-management.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"Institution content",group:"Institution",icon:"📥",href:"./institution-content.html",page:"institution-content.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"Competitive Exams",group:"Institution",icon:"⚖️",href:"./institution-competitive-exams.html",page:"institution-competitive-exams.html",auth:"institution",institutionRoles:["school_admin"]},
    {label:"My teaching workspace",group:"Teaching",icon:"🧑‍🏫",href:"./teacher-workspace.html",page:"teacher-workspace.html",auth:"institution",institutionRoles:["teacher"]},
    {label:"Assigned exam papers",group:"Teaching",icon:"📝",href:"./assigned-paper.html",page:"assigned-paper.html",auth:"institution",institutionRoles:["teacher"]},
    {label:"Institution overview (read only)",group:"Institution",icon:"👁️",href:"./institution-operations.html",page:"institution-operations.html",auth:"institution",institutionRoles:["institution_viewer"]},
    {label:"Release & maintenance",group:"Platform operations",icon:"⚙️",href:"./admin.html#tab-operations",page:"admin.html",hash:"#tab-operations",auth:"admin"}
  ];
  function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
  function getLocation(){const last=location.pathname.split("/").filter(Boolean).pop()||"index.html";const file=last.includes(".")?last:"index.html";const params=new URLSearchParams(location.search);return {file,subject:params.get("subject")||"",hash:location.hash||""};}
  function isActive(item,current){if(item.page!==current.file)return false;if(item.subject)return item.subject===current.subject;if(item.hash)return current.hash===item.hash||(current.file==="profile.html"&&!current.hash&&item.hash==="#profile");if(item.page==="dashboard.html")return current.hash!=="#rewards"&&current.hash!=="#subjects";if(item.page==="profile.html")return !["#profile","#history","#rewards","#backup"].includes(current.hash);return item.page!=="practice.html"&&!item.hash;}
  function readStaticStudent(){
    try{
      if(window.C10StudentAuth&&window.C10StudentAuth.currentUser)return window.C10StudentAuth.currentUser();
      const value=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");
      return value&&typeof value.username==="string"?{...value,username:value.username,role:value.role==="parent"?"parent":"student",classId:String(value.contentClassId||value.classId||"")}:null;
    }catch(_){return null;}
  }
  async function authState(){
    try{
      const admin=JSON.parse(sessionStorage.getItem("examguru_mvp_admin_session_v1")||"null");
      if(admin&&admin.role==="admin"&&admin.username==="Jayaprakashganathe@gmail.com"){
        if(admin.rbacTestMode==="local-platform-admin"){
          const preview=sessionStorage.getItem("examguru_rbac_test_role_v1")||"platform_admin";
          if(preview==="platform_admin")return {role:"admin",username:admin.username,localTestMode:true};
          if(["school_admin","teacher","institution_viewer","hod"].includes(preview)){let membership=null;try{const directory=JSON.parse(localStorage.getItem("examguru_iam_local_v1")||"null"),user=(directory?.users||[]).find(x=>String(x.username||"").toLowerCase()===String(admin.username||"").toLowerCase());membership=(user?.roles||[]).find(r=>r.role===(preview==="hod"?"teacher":preview)&&r.institutionId&&r.institutionId===(sessionStorage.getItem("examguru_active_institution_v1")||"TEST-INSTITUTION-001"));}catch(_){}const institutionId=sessionStorage.getItem("examguru_active_institution_v1")||membership?.institutionId||"TEST-INSTITUTION-001";let hodDepartments=[];if((preview==="teacher"||preview==="hod")&&membership?.membershipId){try{window.ExamGuruInstitutionData?.getStateFor(institutionId);}catch(_){}try{const directory=JSON.parse(localStorage.getItem("examguru_institution_data_v1")||"null"),tenant=directory?.institutions?.[institutionId]||{};hodDepartments=(tenant.departments||[]).filter(d=>d.status!=="inactive"&&d.hodMembershipId===membership.membershipId);}catch(_){}}const derivedHod=hodDepartments.length>0;try{sessionStorage.setItem("examguru_active_institution_v1",institutionId);}catch(_){}return {role:"institution",institutionRole:derivedHod?"hod":preview,institutionId,membershipId:membership?.membershipId||("LOCAL-PREVIEW-"+institutionId),departmentIds:hodDepartments.map(d=>d.departmentId),teacherMembershipId:derivedHod?membership.membershipId:null,username:admin.username,localTestMode:true};}
          if(preview==="parent"){let membership=null;try{const directory=JSON.parse(localStorage.getItem("examguru_iam_local_v1")||"null"),user=(directory?.users||[]).find(x=>String(x.username||"").toLowerCase()===String(admin.username||"").toLowerCase());membership=(user?.roles||[]).find(r=>r.role==="parent"&&r.institutionId===(sessionStorage.getItem("examguru_active_institution_v1")||"TEST-INSTITUTION-001"));}catch(_){}return {role:"parent",username:admin.username,displayName:"Local Parent Preview",membershipId:membership?.membershipId||"LOCAL-PARENT-PREVIEW",institutionId:membership?.institutionId||"TEST-INSTITUTION-001",localTestMode:true};}
          if(preview==="student"){const previewClass=sessionStorage.getItem("examguru_preview_content_class_v1")||"10";return {role:"student",username:"Local Student Preview",classId:previewClass,institutionId:"TEST-INSTITUTION-001",curriculumEnabled:true,localTestMode:true};}
        }
        return {role:"admin",username:admin.username};
      }
    }catch(_){}
    if(window.C10Api&&window.C10Api.isConfigured&&window.C10Api.isConfigured()&&window.C10Api.isAuthenticated()){
      try{
        const result=await window.C10Api.currentUser();
        if(result&&result.user){
          let identity={},memberships=[],platformRoles=[];
          try{const v2=await window.C10Api.identityV2();identity=v2.identity||{};memberships=identity.memberships||[];platformRoles=identity.platformRoles||identity.platform_roles||[];}catch(_){}
          const eligible=memberships.filter(m=>["school_admin","teacher","institution_viewer"].includes(m.role));
          const active=eligible.find(m=>m.membershipId===identity.context?.membershipId&&m.institutionId===identity.context?.institutionId);
          const platformAllowed=result.user.role==="admin"||platformRoles.includes("platform_admin");
          const workspaces=[];if(platformAllowed)workspaces.push({key:"platform_admin",role:"admin",label:"Platform Admin"});
          eligible.forEach(m=>workspaces.push({key:"institution:"+m.membershipId,role:"institution",institutionRole:m.role,institutionId:m.institutionId,membershipId:m.membershipId,departmentIds:m.departmentIds||[],teacherMembershipId:m.teacherMembershipId||null,label:(m.institutionName||m.institutionId)+" · "+m.role}));
          const requested=sessionStorage.getItem("examguru_active_workspace_v1");
          const requestedMembership=requested?.startsWith("institution:")?eligible.find(m=>"institution:"+m.membershipId===requested):null;
          if((requested==="platform_admin"||!requested)&&platformAllowed)return {role:"admin",username:identity.user?.displayName||identity.user?.username||result.user.githubLogin||result.user.username||"",availableWorkspaces:workspaces};
          const membership=requestedMembership||active;
          if(membership)return {role:"institution",institutionRole:membership.role,institutionId:membership.institutionId,membershipId:membership.membershipId,departmentIds:membership.departmentIds||[],teacherMembershipId:membership.teacherMembershipId||null,username:identity.user?.displayName||identity.user?.username||result.user.username||"",availableWorkspaces:workspaces};
          if(platformAllowed)return {role:"admin",username:identity.user?.displayName||identity.user?.username||result.user.githubLogin||result.user.username||"",availableWorkspaces:workspaces};
          if(eligible[0]){const membership=eligible[0];return {role:"institution",institutionRole:membership.role,institutionId:membership.institutionId,membershipId:membership.membershipId,departmentIds:membership.departmentIds||[],teacherMembershipId:membership.teacherMembershipId||null,username:identity.user?.displayName||identity.user?.username||result.user.username||"",availableWorkspaces:workspaces};}
          if(result.user.role==="student")return {role:"student",username:result.user.username||"",classId:String(result.user.contentClassId||result.user.classId||"")};
          if(result.user.role==="parent")return {role:"parent",username:result.user.username||"",displayName:result.user.displayName||result.user.username||""};
        }
      }catch(_){}
    }
    const student=readStaticStudent();
    if(!student)return {role:"guest",username:""};
    if(window.C10StudentAuth&&typeof window.C10StudentAuth.restoreSession==="function"){
      try{
        const verified=await window.C10StudentAuth.restoreSession();
        if(!verified)return {role:"guest",username:""};
        if(verified.role==="parent")return {role:"parent",username:verified.username,displayName:verified.displayName||verified.username};
        return {role:"student",username:verified.username,classId:String(verified.classId||"")};
      }catch(_){return {role:"guest",username:""};}
    }
    if(student.role==="parent")return {role:"parent",username:student.username,displayName:student.displayName||student.username};
    return {role:"student",username:student.username,classId:String(student.classId||"")};
  }
  async function configuredSubjects(classId){
    if(/^(CLS|COHORT)-/i.test(String(classId||"")))return {configured:true,subjects:[],label:"Institution curriculum not mapped"};
    try{
      const response=await fetch("./data/classes.json",{cache:"no-store"});
      if(!response.ok)return null;
      const data=await response.json();
      const entry=(data.classes||[]).find(item=>String(item.classId)===String(classId)&&item.active!==false);
      return entry&&Array.isArray(entry.subjects)?{configured:true,subjects:entry.subjects.map(String),label:entry.label||("Class "+classId)}:null;
    }catch(_){return null;}
  }
  function applySectionFocus(){
    const current=getLocation();
    if(current.file==="dashboard.html"){
      const main=document.getElementById("dashboard");
      if(main){
        const target=current.hash==="#subjects"?"subjects":current.hash==="#rewards"?"rewards":"";
        Array.from(main.children).forEach(child=>{child.hidden=!!target&&child.id!==target&&child.tagName!=="FOOTER";});
      }
      return;
    }
    if(current.file==="profile.html"){
      const target=["#profile","#history","#backup"].includes(current.hash)?current.hash.slice(1):"";
      ["profile","history","backup"].forEach(id=>{
        const section=document.getElementById(id);
        if(section)section.hidden=!!target&&id!==target;
      });
      const grid=document.querySelector(".profile-grid");
      if(grid&&target)grid.style.gridTemplateColumns="minmax(0,1fr)";
      else if(grid)grid.style.gridTemplateColumns="";
    }
  }
  function applyConfiguredSubjectVisibility(config){
    if(!config||getLocation().file!=="dashboard.html")return;
    const cards=Array.from(document.querySelectorAll(".subject-launch-card[href*='subject=']"));
    cards.forEach(card=>{const url=new URL(card.href,location.href);card.hidden=!config.subjects.includes(url.searchParams.get("subject"));});
    let notice=document.getElementById("configuredSubjectsNotice");
    if(!notice&&cards.length){notice=node("p","c10-subjects-notice");notice.id="configuredSubjectsNotice";notice.setAttribute("role","status");cards[0].parentElement.insertBefore(notice,cards[0]);}
    if(notice){notice.hidden=config.subjects.length>0;notice.textContent="No subjects have been configured for "+config.label+" yet. Please ask your administrator to configure the class subjects.";}

  }
  function applyHelpRoleVisibility(auth){
    if(getLocation().file!=="help.html"||!auth)return;
    if(auth.role==="student"){
      const parentLink=document.querySelector('.help-nav a[href="#parent-guide"]');
      const parentSection=document.getElementById("parent-guide");
      if(parentLink)parentLink.hidden=true;
      if(parentSection)parentSection.hidden=true;
    }
  }
  function applyClatAttribution(){
    document.querySelectorAll(".brand-signature,.site-credit,.study-footer,.learning-footer").forEach(element=>{
      element.innerHTML=element.innerHTML.replace(/\bJP Ganathe\b/g,"AI-Enthusiast");
    });
    const author=document.querySelector('meta[name="author"]');
    if(author)author.setAttribute("content","AI-Enthusiast");
  }
  function loadKnowledgeAssistant(auth){
    if(window.__egKnowledgeAssistantLoadPromise)return window.__egKnowledgeAssistantLoadPromise;
    window.__egKnowledgeAssistantLoadPromise=(async()=>{
      const fallback=(stage,error)=>{
        let link=document.getElementById("egKnowledgeAssistantFallback");
        if(!link){link=document.createElement("a");link.id="egKnowledgeAssistantFallback";link.className="eg-ka-fallback";document.body.appendChild(link);}
        const detail=error&&error.message?String(error.message).slice(0,140):"";
        link.href=auth.role==="student"?"./study.html":"./help.html";
        link.textContent="Ask ExamGuru unavailable · "+stage;
        link.title="Ask ExamGuru could not start at "+stage+(detail?" ("+detail+")":"");
        link.setAttribute("aria-label",link.title+". Open Knowledge and Help.");
        link.dataset.egAssistantFailure=stage;
        window.__egKnowledgeAssistantDiagnostic={stage,message:detail||null,role:auth.role||"unknown"};
        if(error&&window.console&&typeof console.error==="function")console.error("[ExamGuru] Ask ExamGuru failed at "+stage,error);
      };
      const addCss=()=>{
        if(document.querySelector('link[data-eg-knowledge-assistant-css]'))return;
        const css=document.createElement("link");css.rel="stylesheet";css.dataset.egKnowledgeAssistantCss="true";
        css.href=new URL("./css/knowledge-assistant.css?v=20261122-m8-loader-v4",assistantAssetBase).href;document.head.appendChild(css);
      };
      const loadScript=(id,path)=>{
        const existing=document.getElementById(id);
        if(existing&&existing.dataset.egLoaded==="true")return Promise.resolve(existing);
        if(existing)existing.remove();
        return new Promise((resolve,reject)=>{
          const script=document.createElement("script");script.id=id;script.async=false;
          script.src=new URL(path,assistantAssetBase).href;
          script.onload=()=>{script.dataset.egLoaded="true";resolve(script);};
          script.onerror=()=>{script.remove();reject(new Error("Unable to load "+path));};
          document.head.appendChild(script);
        });
      };
      try{
        addCss();
        if(!window.ExamGuruKnowledgeAssistantModel){try{await loadScript("egKnowledgeAssistantModelScript","./js/knowledge-assistant-model.js?v=20261122-m8-loader-v4");}catch(error){fallback("model script loading",error);return;}}
        if(!window.ExamGuruKnowledgeAssistantModel)throw new Error("model API missing after script load");
        if(!window.ExamGuruKnowledgeAssistant){try{await loadScript("egKnowledgeAssistantScript","./js/knowledge-assistant.js?v=20261122-m8-loader-v5");}catch(error){fallback("assistant script loading",error);return;}}
        if(!window.ExamGuruKnowledgeAssistant||typeof window.ExamGuruKnowledgeAssistant.mount!=="function")throw new Error("assistant mount API missing after script load");
        let mounted=false;
        try{mounted=window.ExamGuruKnowledgeAssistant.mount(auth);}catch(error){fallback("launcher initialisation",error);return;}
        if(!mounted&&!document.getElementById("egKnowledgeAssistant"))fallback("role profile or launcher initialisation");
        else{const link=document.getElementById("egKnowledgeAssistantFallback");if(link)link.remove();window.__egKnowledgeAssistantDiagnostic={stage:"mounted",role:auth.role||"unknown"};}
      }catch(error){fallback("script loading",error);}
    })().finally(()=>{window.__egKnowledgeAssistantLoadPromise=null;});
    return window.__egKnowledgeAssistantLoadPromise;
  }
  async function createNav(){
    if(document.getElementById("c10Sidebar"))return;
    /* Reserve the shell columns before auth/config reads to avoid first-paint overlap. */
    document.body.classList.add("c10-shell-ready");
    applyTheme(readThemePreference(),false);
    const current=getLocation(),auth=await authState();
    window.ExamGuruAuthState=auth;
    window.dispatchEvent(new CustomEvent("examguru-auth-state-ready",{detail:auth}));
    if(!["guest","student_pending"].includes(auth.role))loadKnowledgeAssistant(auth);
    if(!auth.localTestMode&&auth.role==="institution"){try{sessionStorage.setItem("examguru_active_role_v1",auth.institutionRole||"institution_viewer");sessionStorage.setItem("examguru_active_institution_v1",auth.institutionId||"");}catch(_){}}
    if(!auth.localTestMode&&auth.role==="admin"){try{sessionStorage.setItem("examguru_active_role_v1","platform_admin");}catch(_){}}
    if(auth.localTestMode&&current.file==="admin.html"&&auth.role!=="admin"){location.replace(auth.role==="institution"?"./institution-operations.html":auth.role==="parent"?"./parent.html":"./dashboard.html");return;}
    if(auth.role==="student_pending"){try{sessionStorage.setItem("examguru_student_access_notice_v1","Student access is not ready: this account has no class or learning cohort assigned. Ask the Institution Admin to assign an existing class/cohort, then sign in again.");sessionStorage.setItem("examguru_rbac_test_role_v1","platform_admin");}catch(_){}location.replace("./admin.html#tab-overview");return;}
    if(current.file.startsWith("institution-")&&current.file!=="institution-operations.html"&&!(auth.role==="institution"&&auth.institutionRole==="school_admin")){location.replace(auth.role==="institution"?"./assigned-test.html":auth.role==="parent"?"./parent.html":"./dashboard.html");return;}
    if(current.file==="user-management.html"&&!(auth.role==="admin"||(auth.role==="institution"&&auth.institutionRole==="school_admin"))){location.replace(auth.role==="institution"?"./assigned-test.html":auth.role==="parent"?"./parent.html":"./dashboard.html");return;}
    const isClatStudent=auth.role==="student"&&String(auth.classId||"").toUpperCase()==="CLAT";
    const clatExperience=current.file==="clat.html"||current.file==="clat-login.html"||isClatStudent;
    if(isClatStudent)applyClatAttribution();
    applyHelpRoleVisibility(auth);
    const subjectConfig=auth.role==="student"?await configuredSubjects(auth.classId):null;
    const sidebar=node("aside","c10-sidebar");sidebar.id="c10Sidebar";sidebar.setAttribute("aria-label","Main navigation");
    const sidebarTop=node("div","c10-sidebar-top");
    const brand=node("div","c10-brand");const mark=node("div","c10-brand-mark");const logo=node("img");logo.src="./assets/examguru-saraswati.svg";logo.alt="";logo.width=38;logo.height=38;mark.appendChild(logo);brand.appendChild(mark);
    const brandCopy=node("div","c10-brand-copy");brandCopy.append(node("div","c10-brand-title","ExamGuru Quest"),node("div","c10-brand-sub",clatExperience?"AI-Enthusiast":"Learn · Practise · Level up"));brand.appendChild(brandCopy);sidebarTop.appendChild(brand);
    const identity=node("div","c10-user-card");
    identity.append(node("div","c10-user-name",auth.localTestMode&&auth.role==="institution"?"Local preview · "+(auth.institutionRole==="hod"?"Head of Department":(auth.institutionRole||"Institution Admin").replace(/_/g," ")):auth.role==="guest"?"Welcome, learner":(auth.username||"Student")));
    identity.append(node("div","c10-user-class",auth.role==="admin"?"Administrator":auth.role==="student"?(String(auth.classId||"").toUpperCase()==="CLAT"?"CLAT UG 2027":"Class "+String(auth.classId||"not assigned")):auth.role==="parent"?"Parent / Guardian":auth.role==="institution"?(auth.institutionRole==="hod"?"Head of Department":(auth.institutionRole||"Institution member").replace(/_/g," ")):"Sign in to begin"));
    sidebarTop.appendChild(identity);sidebar.appendChild(sidebarTop);
    const list=node("nav","c10-nav-list");list.setAttribute("aria-label","Learning and account");
    const visibleLinks=links.filter(item=>{
      if(item.auth!==auth.role)return false;
      if(item.institutionOnly&&!auth.institutionId)return false;
      if(item.institutionRoles&&!item.institutionRoles.includes(auth.institutionRole))return false;
      if(isClatStudent&&!["CLAT UG 2027","Dashboard","Assessment Test","Study Library","My Learning","FAQ & Guide"].includes(item.label))return false;
      if(item.subject&&subjectConfig&&!subjectConfig.subjects.includes(item.subject))return false;
      if(auth.role==="student"&&auth.institutionId&&item.entitlement){const parts=item.entitlement.split(":");if(!window.ExamGuruLocalIAM?.hasEntitlement(auth.institutionId,parts[0],parts[1]))return false;}
      if(auth.role==="student"&&auth.institutionId&&!auth.curriculumEnabled&&["Subjects","Learning Hub"].includes(item.group))return false;
      if(item.classIds&&!item.classIds.includes(String(auth.classId||"")))return false;
      return true;
    });
    const groups=new Map();
    visibleLinks.forEach(item=>{if(item.group){if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item);}});
    const renderLink=item=>{
      if(item.disabled){
        const link=node("div","c10-nav-link is-disabled");
        link.setAttribute("aria-disabled","true");
        link.append(node("span","c10-nav-icon",item.icon),node("span","c10-nav-link-label",item.label));
        if(item.status)link.appendChild(node("span","c10-nav-link-status",item.status));
        return link;
      }
      const useClatTarget=!!(clatExperience&&item.clatHref);
      const link=node("a","c10-nav-link");
      link.href=auth.role==="guest"&&current.file==="clat-login.html"&&item.label==="Sign in"?"./clat-login.html":useClatTarget?item.clatHref:item.href;
      const active=useClatTarget?current.file===item.clatPage&&current.hash===item.clatHash:isActive(item,current);
      if(active){link.classList.add("active");link.setAttribute("aria-current","page");}
      link.append(node("span","c10-nav-icon",item.icon),node("span","c10-nav-link-label",item.label));
      link.addEventListener("click",()=>closeMenu());return link;
    };
    const renderedGroups=new Set();
    visibleLinks.forEach(item=>{
      if(!item.group){list.appendChild(renderLink(item));return;}
      if(renderedGroups.has(item.group))return;
      renderedGroups.add(item.group);
      const groupItems=groups.get(item.group);
      const groupId="c10-nav-submenu-"+item.group.toLowerCase().replace(/[^a-z0-9]+/g,"-");
      const active=groupItems.some(entry=>entry.clatHref&&clatExperience?current.file===entry.clatPage&&current.hash===entry.clatHash:isActive(entry,current));
      const wrapper=node("section","c10-nav-group"+(active?" is-active":""));
      const trigger=node("button","c10-nav-group-trigger");
      trigger.type="button";trigger.setAttribute("aria-expanded",String(active));trigger.setAttribute("aria-controls",groupId);
      trigger.append(node("span","c10-nav-icon",groupItems[0].icon||"▸"),node("span","c10-nav-group-label",item.group),node("span","c10-nav-chevron","⌄"));
      const submenu=node("div","c10-nav-submenu");submenu.id=groupId;submenu.hidden=!active;
      groupItems.forEach(entry=>submenu.appendChild(renderLink(entry)));
      trigger.addEventListener("click",()=>{
        const expanded=trigger.getAttribute("aria-expanded")==="true";
        trigger.setAttribute("aria-expanded",String(!expanded));submenu.hidden=expanded;
        wrapper.classList.toggle("is-expanded",!expanded);
      });
      wrapper.append(trigger,submenu);list.appendChild(wrapper);
    });
    sidebar.appendChild(list);
    const bottom=node("div","c10-sidebar-bottom");
    bottom.append(node("div","",auth.role==="guest"?"Sign in to open your learning dashboard.":"Signed in"+(auth.username?" as "+auth.username:"")+"."));
    sidebar.appendChild(bottom);
    const mobileBar=node("div","c10-mobilebar");mobileBar.setAttribute("role","banner");
    const toggle=node("button","c10-menu-toggle","☰");
    toggle.type="button";toggle.setAttribute("aria-label","Open navigation menu");toggle.setAttribute("aria-controls","c10Sidebar");toggle.setAttribute("aria-expanded","false");
    toggle.addEventListener("click",()=>sidebar.classList.contains("open")?closeMenu():openMenu());
    const mobileBrand=node("span","c10-topbar-brand"),mobileLogo=node("img");
    mobileLogo.src="./assets/examguru-saraswati.svg";mobileLogo.alt="";mobileLogo.width=32;mobileLogo.height=32;mobileBrand.appendChild(mobileLogo);
    const mobileCopy=node("div","c10-topbar-copy");
    mobileCopy.append(node("div","c10-mobile-title","ExamGuru Quest"),node("div","c10-mobile-sub",auth.localTestMode?"Local role preview · "+(auth.role==="admin"?"Platform Admin":auth.role==="institution"?(auth.institutionRole||"Institution Admin").replace(/_/g," "):auth.role):clatExperience?"AI-Enthusiast · CLAT UG 2027":auth.role==="guest"?"Sign in to continue":(auth.username||"Student")+" · "+(auth.role==="admin"?"Administrator":auth.role==="parent"?"Parent":"Class "+String(auth.classId||"not assigned"))));
    const localRoles=auth.localTestMode?(()=>{try{const directory=JSON.parse(localStorage.getItem("examguru_iam_local_v1")||"null");const u=(directory?.users||[]).find(x=>String(x.username||"").toLowerCase()===String(auth.username||"").toLowerCase());const roles=[...new Set((u?.roles||[]).filter(x=>x.role!=="student"||x.classId).map(x=>x.role))];return roles.length?roles:["platform_admin","school_admin","teacher","parent","institution_viewer"];}catch(_){return ["platform_admin","school_admin","teacher","parent","student","institution_viewer"];}})():[];
    const workspaceOptions=auth.localTestMode?[{key:"platform_admin",role:"admin",label:"Platform Admin"},...(()=>{try{const d=JSON.parse(localStorage.getItem("examguru_iam_local_v1")||"null"),u=(d?.users||[]).find(x=>String(x.username||"").toLowerCase()===String(auth.username||"").toLowerCase()),roles=(u?.roles||[]).filter(r=>r.role!=="platform_admin"&&(r.role!=="student"||r.classId)).map(r=>({key:r.role+"@"+(r.institutionId||""),role:["school_admin","institution_viewer","teacher"].includes(r.role)?"institution":r.role,institutionRole:r.role,institutionId:r.institutionId,label:({school_admin:"Institution Admin",teacher:"Teacher",parent:"Parent",student:"Student",institution_viewer:"Institution Viewer"})[r.role]||r.role}));roles.filter(x=>x.institutionRole==="teacher").slice().forEach(x=>roles.push({key:"hod@"+x.institutionId,role:"institution",institutionRole:"hod",institutionId:x.institutionId,label:"HOD + Teacher · "+((d?.institutions||[]).find(i=>i.institutionId===x.institutionId)?.name||"Institution")+" (preview)"}));const known=new Set(roles.filter(x=>x.institutionId).map(x=>x.institutionId));(d?.institutions||[]).filter(i=>i.status==="active"&&!known.has(i.institutionId)).forEach(i=>roles.push({key:"school_admin@"+i.institutionId,role:"institution",institutionRole:"school_admin",institutionId:i.institutionId,label:"Institution Admin · "+i.name+" (preview)"}));{const studentOptions=["3","6","10","CLAT"].map(cls=>({key:"student@"+cls,role:"student",institutionRole:"student",institutionId:"TEST-INSTITUTION-001",label:"Student · "+(cls==="CLAT"?"CLAT UG 2027":"Class "+cls),contentClassId:cls}));const idx=roles.findIndex(x=>x.key.startsWith("student@"));if(idx>=0)roles.splice(idx,1,...studentOptions);else roles.push(...studentOptions);}return roles;}catch(_){return [];}})()]:(auth.availableWorkspaces||[]);
    if(auth.localTestMode||workspaceOptions.length>1){
      const switcher=node("select","c10-role-switcher");switcher.id="c10RoleSwitcher";switcher.setAttribute("aria-label","Switch active workspace");
      workspaceOptions.forEach(w=>{const option=node("option","",w.label);option.value=w.key;switcher.append(option);});
      const localRole=sessionStorage.getItem("examguru_rbac_test_role_v1")||"platform_admin",localInstitution=sessionStorage.getItem("examguru_active_institution_v1")||"TEST-INSTITUTION-001",previewClass=sessionStorage.getItem("examguru_preview_content_class_v1")||"10";const currentKey=auth.localTestMode?(localRole==="platform_admin"?"platform_admin":localRole==="student"?"student@"+previewClass:localRole+"@"+localInstitution):(sessionStorage.getItem("examguru_active_workspace_v1")||(auth.role==="admin"?"platform_admin":"institution:"+String(auth.membershipId||"")));
      switcher.value=workspaceOptions.some(w=>w.key===currentKey)?currentKey:(workspaceOptions[0]?.key||"");
      switcher.addEventListener("change",async()=>{const selected=workspaceOptions.find(w=>w.key===switcher.value);if(!selected)return;
        if(auth.localTestMode){try{const role=selected.institutionRole||selected.key;sessionStorage.setItem("examguru_rbac_test_role_v1",role);if(selected.institutionId)sessionStorage.setItem("examguru_active_institution_v1",selected.institutionId);if(selected.contentClassId)sessionStorage.setItem("examguru_preview_content_class_v1",selected.contentClassId);}catch(_){}}
        else {try{sessionStorage.setItem("examguru_active_workspace_v1",selected.key);sessionStorage.setItem("examguru_active_role_v1",selected.institutionRole||"platform_admin");if(selected.institutionId)sessionStorage.setItem("examguru_active_institution_v1",selected.institutionId);if(selected.membershipId&&window.C10Api?.selectInstitutionContext)await window.C10Api.selectInstitutionContext({institutionId:selected.institutionId,membershipId:selected.membershipId,branchId:null});}catch(e){return;}}
        const role=auth.localTestMode?(selected.institutionRole||selected.key):selected.role==="admin"?"platform_admin":selected.institutionRole;
        if(auth.localTestMode&&selected.institutionId){try{sessionStorage.setItem("examguru_active_institution_v1",selected.institutionId);}catch(_){}}
        const hodPreview=auth.localTestMode&&selected.institutionRole==="teacher"&&(()=>{try{const d=JSON.parse(localStorage.getItem("examguru_iam_local_v1")||"null"),u=(d?.users||[]).find(x=>String(x.username||"").toLowerCase()===String(auth.username||"").toLowerCase()),m=(u?.roles||[]).find(x=>x.role==="teacher"&&x.institutionId===selected.institutionId);const org=JSON.parse(localStorage.getItem("examguru_institution_data_v1")||"null"),departments=org?.institutions?.[selected.institutionId]?.departments||[];return !!m&&departments.some(x=>x.status!=="inactive"&&x.hodMembershipId===m.membershipId);}catch(_){return false;}})();const target=role==="hod"||hodPreview?"./institution-operations.html":role==="platform_admin"?"./admin.html#tab-overview":role==="school_admin"||role==="institution_viewer"?"./institution-operations.html":role==="teacher"?"./teacher-workspace.html":role==="parent"?"./parent.html":"./dashboard.html";location.href=target;
      });
      mobileBar._workspaceSwitcher=switcher;
    }
    const themeToggle=node("button","c10-theme-toggle",document.body.classList.contains("eg-theme-dark")?"☀":"☾");
    themeToggle.id="c10ThemeToggle";themeToggle.type="button";
    updateThemeButton(themeToggle,document.body.classList.contains("eg-theme-dark"));
    themeToggle.addEventListener("click",()=>applyTheme(document.body.classList.contains("eg-theme-dark")?"light":"dark"));
    mobileBar.append(toggle,mobileBrand,mobileCopy);if(mobileBar._workspaceSwitcher)mobileBar.appendChild(mobileBar._workspaceSwitcher);mobileBar.append(themeToggle);
    if(auth.role!=="guest"){
      const isPreviewSession=auth.localTestMode&&auth.role!=="admin";
      const logout=node("button","c10-header-signout",isPreviewSession?"↩ Exit preview":"↪ Sign out");
      logout.id="c10HeaderSignout";logout.type="button";logout.setAttribute("aria-label",isPreviewSession?"Exit role preview":"Sign out of ExamGuru");
      logout.addEventListener("click",async()=>{
        logout.disabled=true;
        if(isPreviewSession){try{sessionStorage.setItem("examguru_rbac_test_role_v1","platform_admin");sessionStorage.removeItem("examguru_student_access_notice_v1");}catch(_){}location.replace("./admin.html#tab-overview");return;}
        try{if(window.C10Api&&window.C10Api.isAuthenticated())await window.C10Api.logout();}catch(_){}
        if(window.C10StudentAuth&&window.C10StudentAuth.logout)window.C10StudentAuth.logout();
        try{sessionStorage.removeItem("c10playground_static_student_v1");sessionStorage.removeItem("c10playground_api_session");sessionStorage.removeItem("examguru_mvp_admin_session_v1");}catch(_){}
        location.replace(clatExperience?"./clat-login.html":"./index.html");
      });
      mobileBar.appendChild(logout);
    }
    const scrim=node("button","c10-nav-scrim");scrim.type="button";scrim.setAttribute("aria-label","Close navigation menu");scrim.addEventListener("click",closeMenu);
    document.body.prepend(sidebar);document.body.prepend(mobileBar);document.body.prepend(scrim);document.body.classList.add("c10-shell-ready");
    if(auth.role==="student"&&subjectConfig?.configured&&!subjectConfig.subjects.length&&current.file==="dashboard.html"){const banner=node("div","c10-access-notice","Your institution has assigned a class/cohort, but it has not yet mapped a platform learning-content profile. Ask your Institution Admin to complete the mapping in Academic Structure.");banner.setAttribute("role","status");banner.style.cssText="position:relative;margin:18px auto;width:min(900px,calc(100% - 28px));padding:14px 18px;border:1px solid #d5a54a;border-radius:12px;background:#fff4d8;color:#654600;font-weight:700";document.body.appendChild(banner);}
    try{const notice=sessionStorage.getItem("examguru_student_access_notice_v1");if(notice&&current.file==="admin.html"){const banner=node("div","c10-access-notice",notice);banner.setAttribute("role","status");banner.style.cssText="position:fixed;z-index:10020;top:76px;left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 28px));padding:14px 18px;border:1px solid #d5a54a;border-radius:12px;background:#fff4d8;color:#654600;box-shadow:0 10px 30px rgba(0,0,0,.14);font-weight:700";document.body.appendChild(banner);sessionStorage.removeItem("examguru_student_access_notice_v1");}}catch(_){}

    if(subjectConfig)applyConfiguredSubjectVisibility(subjectConfig);
    window.addEventListener("keydown",event=>{if(event.key==="Escape")closeMenu();});
    window.addEventListener("hashchange",()=>{if(sidebar.classList.contains("open"))closeMenu();applySectionFocus();});
  }
  function openMenu(){const sidebar=document.getElementById("c10Sidebar"),toggle=document.querySelector(".c10-menu-toggle"),scrim=document.querySelector(".c10-nav-scrim");if(!sidebar)return;sidebar.classList.add("open");if(scrim)scrim.classList.add("visible");document.body.classList.add("c10-menu-open");toggle.setAttribute("aria-expanded","true");toggle.setAttribute("aria-label","Close navigation menu");toggle.textContent="×";}
  function closeMenu(){const sidebar=document.getElementById("c10Sidebar"),toggle=document.querySelector(".c10-menu-toggle"),scrim=document.querySelector(".c10-nav-scrim");if(!sidebar)return;sidebar.classList.remove("open");if(scrim)scrim.classList.remove("visible");document.body.classList.remove("c10-menu-open");if(toggle){toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open navigation menu");toggle.textContent="☰";}}
  window.addEventListener("c10-auth-changed",()=>{
    ["c10Sidebar",".c10-mobilebar",".c10-nav-scrim"].forEach(selector=>{
      const element=selector.startsWith(".")?document.querySelector(selector):document.getElementById(selector);
      if(element)element.remove();
    });
    document.body.classList.remove("c10-shell-ready","c10-menu-open");
    createNav();
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createNav,{once:true});else createNav();
})();
