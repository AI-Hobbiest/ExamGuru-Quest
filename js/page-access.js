/* Protect student-only routes and route parent sessions to the family dashboard. */
(() => {
  "use strict";
  const key="c10playground_static_student_v1";
  let session=null;
  try{session=JSON.parse(sessionStorage.getItem(key)||"null");}catch(_){}
  if(!session||typeof session.username!=="string"){location.replace("./index.html");return;}
  if(session.role==="parent"){location.replace("./parent.html");return;}
  if(window.C10StudentAuth&&window.C10StudentAuth.restoreSession){
    window.C10StudentAuth.restoreSession().then(account=>{
      if(!account||account.role!=="student")location.replace(account&&account.role==="parent"?"./parent.html":"./index.html");
    }).catch(()=>location.replace("./index.html"));
  }
})();
