/* Landing-page sign-in flow. Prefer the central server-verified account service when configured. */
(() => {
  "use strict";
  const form=document.getElementById("studentLoginForm");
  const username=document.getElementById("username");
  const password=document.getElementById("password");
  const submit=document.getElementById("loginSubmit");
  const adminForm=document.getElementById("adminLoginForm");
  const adminUsername=document.getElementById("adminUsername");
  const adminPassword=document.getElementById("adminPassword");
  const adminSubmit=document.getElementById("adminLoginSubmit");
  const status=document.getElementById("loginStatus");
  const say=(message,type="")=>{status.textContent=message;status.className="login-status"+(type?" "+type:"");};
  function hasStudentSession(){try{return !!JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null")?.username;}catch(_){return false;}}
  if(hasStudentSession()&&window.C10StudentAuth){
    window.C10StudentAuth.restoreSession().then(account=>{if(account)location.replace(account.role==="parent"?"./parent.html":String(account.classId||"").toUpperCase()==="CLAT"?"./clat-dashboard.html":"./dashboard.html");});
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    submit.disabled=true;submit.textContent="Signing in…";
    try{
      if(window.C10Api&&window.C10Api.isConfigured()){
        window.C10Api.studentLoginPage();
        return;
      }
      if(!window.C10StudentAuth)throw new Error("Student sign-in is unavailable. Please reload the page.");
      const result=await window.C10StudentAuth.login(username.value,password.value);
      password.value="";
      const destination=result.account&&result.account.role==="parent"?"./parent.html":String(result.account&&result.account.classId||"").toUpperCase()==="CLAT"?"./clat-dashboard.html":"./dashboard.html";
      say("Signed in. Opening your workspace…","success");
      location.assign(destination);
    }catch(error){say(error&&error.message?error.message:"Unable to sign in. Check your username and password.","error");}
    finally{submit.disabled=false;submit.innerHTML='Sign in to ExamGuru <span aria-hidden="true">→</span>';}
  });
  const ADMIN_USERNAME="Jayaprakashganathe@gmail.com";
  // Legacy local MVP digest; the public-build sanitizer removes this identity and digest.
  const ADMIN_PASSWORD_SHA256="c5c784554396ac628057cbad338efdf79fe7b1d797317728cf4b52d14af18ae2";
  // Synthetic-only staging account. Static authentication is bypassable and grants no server access.
  const DEMO_ADMIN_USERNAME="demo.admin";
  const DEMO_ADMIN_PASSWORD_SHA256="f61a5727d3c3d3ee7437fe3e1bdf4d8fc9ea5a2deb367f43b7636488b58539ac";
  async function sha256(text){
    const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
  }
  adminForm.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!adminForm.reportValidity())return;
    adminSubmit.disabled=true;
    try{
      const enteredUsername=adminUsername.value.trim().toLowerCase();
      const enteredHash=await sha256(adminPassword.value);
      const isDemoAdmin=enteredUsername===DEMO_ADMIN_USERNAME&&enteredHash===DEMO_ADMIN_PASSWORD_SHA256;
      const isLegacyAdmin=enteredUsername===ADMIN_USERNAME.toLowerCase()&&enteredHash===ADMIN_PASSWORD_SHA256;
      if(!isDemoAdmin&&!isLegacyAdmin)throw new Error("Admin username or password is incorrect.");
      const sessionUsername=isDemoAdmin?DEMO_ADMIN_USERNAME:ADMIN_USERNAME;
      sessionStorage.setItem("examguru_mvp_admin_session_v1",JSON.stringify({username:sessionUsername,role:"admin",platformRoles:["platform_admin"],rbacTestMode:"local-platform-admin",signedInAt:Date.now(),demoAccount:isDemoAdmin}));
      sessionStorage.removeItem("c10playground_static_student_v1");
      adminPassword.value="";
      say("Admin sign-in successful. Opening LMS Administration…","success");
      location.assign("./admin.html");
    }catch(error){
      say(error&&error.message?error.message:"Unable to sign in as administrator.","error");
    }finally{adminSubmit.disabled=false;}
  });
  const params=new URLSearchParams(location.search);
  if(params.get("admin")==="login-required")say("Please sign in with the administrator account to open the Admin Workspace.","error");

})();
