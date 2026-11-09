/* Protect student-only routes and route parent sessions to the family dashboard. */
(() => {
  "use strict";
  const key="c10playground_static_student_v1";
  const page=location.pathname.split("/").filter(Boolean).pop()||"index.html";
  const clatRoute=page==="clat.html"||page==="clat-dashboard.html";
  const signInTarget=clatRoute?"./clat-login.html":"./index.html";
  let session=null;
  try{session=JSON.parse(sessionStorage.getItem(key)||"null");}catch(_){}
  if(!session||typeof session.username!=="string"){
    location.replace(signInTarget);
    return;
  }
  if(session.role==="parent"){location.replace("./parent.html");return;}
  if(window.C10StudentAuth&&window.C10StudentAuth.restoreSession){
    window.C10StudentAuth.restoreSession().then(account=>{
      if(!account||account.role!=="student")location.replace(account&&account.role==="parent"?"./parent.html":signInTarget);
      else if(clatRoute&&String(account.classId||"").toUpperCase()!=="CLAT")location.replace("./dashboard.html");
    }).catch(()=>location.replace(signInTarget));
  }
})();
