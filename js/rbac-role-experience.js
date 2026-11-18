(()=>{"use strict";
const roles={
 platform_admin:{label:"Platform Admin",scope:"Platform-wide",summary:"Owns platform configuration, platform role grants, institution onboarding and cross-institution oversight.",description:"Global scope; platform role grants are separate from institution memberships.",nav:[["Admin Workspace","./admin.html"],["Institution Operations","./institution-operations.html"],["Role Matrix","./rbac-role-matrix.html"]]},
 school_admin:{label:"Institution Admin",scope:"One institution",summary:"Runs one institution: branches, classes, staff, learners, guardian links, assessments and institution reporting.",description:"May delegate permitted institution roles only within assigned institution/branch scope; cannot grant platform roles.",nav:[["Institution Operations","./institution-operations.html"],["Parent & Assessment Portal","./parent.html"],["Role Matrix","./rbac-role-matrix.html"]]},
 teacher:{label:"Teacher",scope:"Assigned classes",summary:"Works with assigned classes: learning content, class assessments, assigned tests and learner progress within teaching scope.",description:"Own assignments and class scope only; no institution-wide role management or platform publishing.",nav:[["Learning Dashboard","./dashboard.html"],["Learning Hub","./learning.html"],["Practice","./practice.html"],["Assigned Tests","./assigned-test.html"],["Assigned Papers","./assigned-paper.html"]]},
 parent:{label:"Parent",scope:"Linked children",summary:"Monitors linked child progress and manages permitted home practice or assigned assessments.",description:"Access is limited to explicitly linked children; no unrelated learner or institution records.",nav:[["Parent Portal","./parent.html"],["Assigned Papers","./assigned-paper.html"],["Role Matrix","./rbac-role-matrix.html"]]},
 student:{label:"Student",scope:"Own account",summary:"Learns, practises, sits assigned examinations and reviews own learning history.",description:"Own profile, attempts, bookmarks and progress only.",nav:[["Learning Dashboard","./dashboard.html"],["Learning Hub","./learning.html"],["Practice","./practice.html"],["Exam Practice","./exam-practice.html"],["My Profile","./profile.html"]]},
 institution_viewer:{label:"Institution Viewer",scope:"Read-only institution",summary:"Views permitted institution-level operational information and reports without changing records.",description:"Read-only and limited to explicitly assigned institution/branch visibility.",nav:[["Institution Operations (read-only preview)","./institution-operations.html"],["Role Matrix","./rbac-role-matrix.html"]]}
};
const capabilities=[
 ["Manage platform roles",["yes","no","no","no","no","no"]],
 ["Create / configure institutions",["yes","no","no","no","no","no"]],
 ["Assign institution roles",["yes","scope","no","no","no","no"]],
 ["Manage branches and classes",["yes","scope","no","no","no","no"]],
 ["Manage teacher assignments and enrolments",["yes","scope","scope","no","no","no"]],
 ["View learner progress",["yes","scope","scope","scope","own","scope"]],
 ["Create / assign assessments",["yes","scope","scope","linked","no","no"]],
 ["Take practice and examinations",["yes","yes","yes","no","own","no"]],
 ["Edit question-bank content / publish",["yes","no","no","no","no","no"]],
 ["View institution operational records",["yes","scope","assigned","no","no","scope"]]
];
const accessLabel=v=>v==="yes"?'<span class="yes">Allowed</span>':v==="no"?'<span class="no">Not allowed</span>':'<span class="scope">'+({scope:"Scoped",own:"Own records",linked:"Linked children",assigned:"Assigned classes"}[v]||v)+'</span>';
function init(){
 const picker=document.getElementById("rolePicker"),body=document.getElementById("matrixBody");
 Object.entries(roles).forEach(([key,r])=>{const o=document.createElement("option");o.value=key;o.textContent=r.label;picker.append(o);});
 body.innerHTML=capabilities.map(([name,values])=>'<tr><td><strong>'+name+'</strong></td>'+values.map(v=>'<td>'+accessLabel(v)+'</td>').join("")+'</tr>').join("");
 const params=new URLSearchParams(location.search),initial=params.get("role");
 try{const session=JSON.parse(sessionStorage.getItem("examguru_mvp_admin_session_v1")||"null");if(session?.rbacTestMode==="local-platform-admin"&&roles[initial])picker.value=initial;else if(session?.rbacTestMode==="local-platform-admin")picker.value="platform_admin";}catch(_){}
 function render(){const r=roles[picker.value];document.getElementById("roleScope").textContent=r.scope;document.getElementById("roleDescription").textContent=r.description;document.getElementById("roleTitle").textContent=r.label;document.getElementById("roleSummary").textContent=r.summary;const host=document.getElementById("roleNavigation");host.replaceChildren();r.nav.forEach(([label,url])=>{const a=document.createElement("a");a.href=url;a.textContent=label;host.append(a);});document.querySelectorAll(".role-card").forEach(x=>x.classList.toggle("active",x.dataset.role===picker.value));}
 picker.addEventListener("change",render);render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.ExamGuruRoleExperience=Object.freeze({roles,capabilities});
})();