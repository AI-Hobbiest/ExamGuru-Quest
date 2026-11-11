/* Responsive, session-aware navigation for ExamGuru Quest. */
(() => {
  "use strict";
  /* Load the shared Quest 2.0 light theme after legacy/page-local styles. */
  const softThemeId="c10SoftSpectrumTheme";
  if(!document.getElementById(softThemeId)){
    const themeLink=document.createElement("link");
    themeLink.id=softThemeId;themeLink.rel="stylesheet";
    themeLink.href="./css/theme-soft-spectrum.css?v=soft-spectrum-v3";
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

    {label:"Study Library",group:"Study Pack",icon:"📖",href:"./study.html",page:"study.html",auth:"student"},
    {label:"Learning Hub",group:"My Learning",icon:"🧠",href:"./learning.html",page:"learning.html",auth:"student"},

    {label:"Assessment Test",group:"Assessments",icon:"📋",href:"./dashboard.html#assigned-tests",page:"dashboard.html",hash:"#assigned-tests",clatHref:"./clat.html#library",clatPage:"clat.html",clatHash:"#library",auth:"student"},
    {label:"Exam Paper Practice",icon:"📝",href:"./exam-practice.html",page:"exam-practice.html",classIds:["6","10"],auth:"student"},
    {label:"CLAT UG 2027",group:"Entrance Exams",icon:"⚖️",href:"./clat.html#library",page:"clat.html",clatHref:"./clat.html#library",clatPage:"clat.html",clatHash:"#library",classIds:["CLAT"],auth:"student"},
    {label:"JEE Main & Advanced",group:"Entrance Exams",icon:"📐",disabled:true,status:"Coming soon",classIds:["10"],auth:"student"},
    {label:"NEET UG",group:"Entrance Exams",icon:"🧬",disabled:true,status:"Coming soon",classIds:["10"],auth:"student"},
    {label:"CUET UG",group:"Entrance Exams",icon:"🎓",disabled:true,status:"Coming soon",classIds:["10"],auth:"student"},
    {label:"NDA (10+2)",group:"Entrance Exams",icon:"🛡️",disabled:true,status:"Coming soon",classIds:["10"],auth:"student"},
    {label:"IPMAT",group:"Entrance Exams",icon:"📊",disabled:true,status:"Coming soon",classIds:["10"],auth:"student"},
    {label:"My profile",group:"My Account",icon:"👤",href:"./profile.html#profile",page:"profile.html",hash:"#profile",auth:"student"},
    {label:"Test history",group:"My Account",icon:"📈",href:"./profile.html#history",page:"profile.html",hash:"#history",auth:"student"},
    {label:"Levels & rewards",group:"My Account",icon:"🏆",href:"./dashboard.html#rewards",page:"dashboard.html",hash:"#rewards",auth:"student"},
    {label:"Backup & restore",group:"My Account",icon:"💾",href:"./profile.html#backup",page:"profile.html",hash:"#backup",auth:"student"},
    {label:"FAQ & Guide",icon:"❔",href:"./help.html#student-guide",page:"help.html",auth:"student"},

    {label:"Overview",group:"Workspace",icon:"🏠",href:"./admin.html#tab-overview",page:"admin.html",hash:"#tab-overview",auth:"admin"},
    {label:"Question banks",group:"Workspace",icon:"🧩",href:"./admin.html#tab-banks",page:"admin.html",hash:"#tab-banks",auth:"admin"},
    {label:"Classes & subjects",group:"Workspace",icon:"🏫",href:"./admin.html#tab-classes",page:"admin.html",hash:"#tab-classes",auth:"admin"},
    {label:"Exam Paper Studio",group:"Assessment tools",icon:"📝",href:"./admin.html#tab-exam-papers",page:"admin.html",hash:"#tab-exam-papers",auth:"admin"},
    {label:"Knowledge base",group:"Workspace",icon:"📚",href:"./admin.html#tab-knowledge",page:"admin.html",hash:"#tab-knowledge",auth:"admin"},
    {label:"Students & reports",group:"People & insights",icon:"👩‍🎓",href:"./admin.html#tab-students",page:"admin.html",hash:"#tab-students",auth:"admin"},
    {label:"Leaderboards",group:"People & insights",icon:"🏆",href:"./admin.html#tab-leaderboard",page:"admin.html",hash:"#tab-leaderboard",auth:"admin"},
    {label:"Admin access",group:"System",icon:"🔐",href:"./admin.html#tab-access",page:"admin.html",hash:"#tab-access",auth:"admin"},
    {label:"Operations",group:"System",icon:"⚙️",href:"./admin.html#tab-operations",page:"admin.html",hash:"#tab-operations",auth:"admin"}
  ];
  function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
  function getLocation(){const last=location.pathname.split("/").filter(Boolean).pop()||"index.html";const file=last.includes(".")?last:"index.html";const params=new URLSearchParams(location.search);return {file,subject:params.get("subject")||"",hash:location.hash||""};}
  function isActive(item,current){if(item.page!==current.file)return false;if(item.subject)return item.subject===current.subject;if(item.hash)return current.hash===item.hash||(current.file==="profile.html"&&!current.hash&&item.hash==="#profile");if(item.page==="dashboard.html")return current.hash!=="#rewards"&&current.hash!=="#subjects";if(item.page==="profile.html")return !["#profile","#history","#rewards","#backup"].includes(current.hash);return item.page!=="practice.html"&&!item.hash;}
  function readStaticStudent(){
    try{
      if(window.C10StudentAuth&&window.C10StudentAuth.currentUser)return window.C10StudentAuth.currentUser();
      const value=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");
      return value&&typeof value.username==="string"?{...value,username:value.username,role:value.role==="parent"?"parent":"student",classId:String(value.classId||"")}:null;
    }catch(_){return null;}
  }
  async function authState(){
    try{
      const admin=JSON.parse(sessionStorage.getItem("examguru_mvp_admin_session_v1")||"null");
      if(admin&&admin.role==="admin"&&admin.username==="Jayaprakashganathe@gmail.com")return {role:"admin",username:admin.username};
    }catch(_){}
    if(window.C10Api&&window.C10Api.isConfigured&&window.C10Api.isConfigured()&&window.C10Api.isAuthenticated()){
      try{
        const result=await window.C10Api.currentUser();
        if(result&&result.user&&result.user.role==="admin")return {role:"admin",username:result.user.githubLogin||result.user.username||""};
        if(result&&result.user&&result.user.role==="student")return {role:"student",username:result.user.username||"",classId:String(result.user.classId||"")};
        if(result&&result.user&&result.user.role==="parent")return {role:"parent",username:result.user.username||"",displayName:result.user.displayName||result.user.username||""};
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
  async function createNav(){
    if(document.getElementById("c10Sidebar"))return;
    /* Reserve the shell columns before auth/config reads to avoid first-paint overlap. */
    document.body.classList.add("c10-shell-ready");
    applyTheme(readThemePreference(),false);
    const current=getLocation(),auth=await authState();
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
    identity.append(node("div","c10-user-name",auth.role==="guest"?"Welcome, learner":(auth.username||"Student")));
    identity.append(node("div","c10-user-class",auth.role==="admin"?"Administrator":auth.role==="student"?(String(auth.classId||"").toUpperCase()==="CLAT"?"CLAT UG 2027":"Class "+String(auth.classId||"not assigned")):auth.role==="parent"?"Parent / Guardian":"Sign in to begin"));
    sidebarTop.appendChild(identity);sidebar.appendChild(sidebarTop);
    const list=node("nav","c10-nav-list");list.setAttribute("aria-label","Learning and account");
    const visibleLinks=links.filter(item=>{
      if(item.auth!==auth.role)return false;
      if(isClatStudent&&!["CLAT UG 2027","Dashboard","Assessment Test","Study Library","Learning Hub","FAQ & Guide"].includes(item.label))return false;
      if(item.subject&&subjectConfig&&!subjectConfig.subjects.includes(item.subject))return false;
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
    mobileCopy.append(node("div","c10-mobile-title","ExamGuru Quest"),node("div","c10-mobile-sub",clatExperience?"AI-Enthusiast · CLAT UG 2027":auth.role==="guest"?"Sign in to continue":(auth.username||"Student")+" · "+(auth.role==="admin"?"Administrator":auth.role==="parent"?"Parent":"Class "+String(auth.classId||"not assigned"))));
    const themeToggle=node("button","c10-theme-toggle",document.body.classList.contains("eg-theme-dark")?"☀":"☾");
    themeToggle.id="c10ThemeToggle";themeToggle.type="button";
    updateThemeButton(themeToggle,document.body.classList.contains("eg-theme-dark"));
    themeToggle.addEventListener("click",()=>applyTheme(document.body.classList.contains("eg-theme-dark")?"light":"dark"));
    mobileBar.append(toggle,mobileBrand,mobileCopy,themeToggle);
    if(auth.role!=="guest"){
      const logout=node("button","c10-header-signout","↪ Sign out");
      logout.id="c10HeaderSignout";logout.type="button";logout.setAttribute("aria-label","Sign out of ExamGuru");
      logout.addEventListener("click",async()=>{
        logout.disabled=true;
        try{if(window.C10Api&&window.C10Api.isAuthenticated())await window.C10Api.logout();}catch(_){}
        if(window.C10StudentAuth&&window.C10StudentAuth.logout)window.C10StudentAuth.logout();
        try{sessionStorage.removeItem("c10playground_static_student_v1");sessionStorage.removeItem("c10playground_api_session");sessionStorage.removeItem("examguru_mvp_admin_session_v1");}catch(_){}
        location.replace(clatExperience?"./clat-login.html":"./index.html");
      });
      mobileBar.appendChild(logout);
    }
    const scrim=node("button","c10-nav-scrim");scrim.type="button";scrim.setAttribute("aria-label","Close navigation menu");scrim.addEventListener("click",closeMenu);
    document.body.prepend(sidebar);document.body.prepend(mobileBar);document.body.prepend(scrim);document.body.classList.add("c10-shell-ready");
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
