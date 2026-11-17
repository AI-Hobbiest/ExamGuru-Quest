/* Role-aware access for student, parent and Admin Study Library previews. */
(() => {
  "use strict";
  const key="c10playground_static_student_v1";
  const page=location.pathname.split("/").filter(Boolean).pop()||"index.html";
  const clatRoute=page==="clat.html"||page==="clat-dashboard.html";
  const class10Route=page==="pyq-library.html";
  const signInTarget=clatRoute?"./clat-login.html":"./index.html";
  const isAdminSession=()=>{
    try{const s=JSON.parse(sessionStorage.getItem("examguru_mvp_admin_session_v1")||"null");return !!(s&&s.role==="admin"&&s.username==="Jayaprakashganathe@gmail.com")||!!sessionStorage.getItem("c10playground_api_session");}catch(_){return false;}
  };
  let session=null;try{session=JSON.parse(sessionStorage.getItem(key)||"null");}catch(_){}
  if(page==="study.html"){
    if(isAdminSession()){window.C10StudyViewerRole="admin";return;}
    if(!session||typeof session.username!=="string"){location.replace(signInTarget);return;}
    if(!window.C10StudentAuth||!window.C10StudentAuth.restoreSession){location.replace(signInTarget);return;}
    window.C10StudyAccessReady=window.C10StudentAuth.restoreSession().then(async account=>{
      if(!account){location.replace(signInTarget);return;}
      if(account.role==="student"){window.C10StudyViewerRole="student";return;}
      if(account.role==="parent"){
        const childId=new URLSearchParams(location.search).get("childId");
        const children=await window.C10StudentAuth.getLinkedChildren();
        const child=children.find(item=>String(item.studentId)===String(childId));
        if(!child){location.replace("./parent.html");return;}
        window.C10StudyViewerRole="parent";window.C10StudyChildId=child.studentId;return;
      }
      location.replace(signInTarget);
    }).catch(()=>location.replace(signInTarget));
    return;
  }
  if(!session||typeof session.username!=="string"){location.replace(signInTarget);return;}
  if(session.role==="parent"){location.replace("./parent.html");return;}
  if(class10Route&&String(session.classId||"")!=="10"){location.replace("./dashboard.html");return;}
  if(window.C10StudentAuth&&window.C10StudentAuth.restoreSession){
    window.C10StudentAuth.restoreSession().then(account=>{
      if(!account||account.role!=="student")location.replace(account&&account.role==="parent"?"./parent.html":signInTarget);
      else if(clatRoute&&String(account.classId||"").toUpperCase()!=="CLAT")location.replace("./dashboard.html");
      else if(class10Route&&String(account.classId||"")!=="10")location.replace("./dashboard.html");
    }).catch(()=>location.replace(signInTarget));
  }
})();
