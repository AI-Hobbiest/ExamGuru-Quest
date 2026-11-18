(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const state={identity:null,departments:[],selected:null};
  const status=(message,kind="")=>{const el=$("departmentStatus");if(el){el.textContent=message;el.className="admin-status"+(kind?" "+kind:"");}};
  const split=value=>[...new Set(String(value||"").split(",").map(x=>x.trim()).filter(Boolean))];
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  function selectedMembership(){const id=$("departmentMembership").value;return (state.identity?.memberships||[]).find(m=>m.membershipId===id)||null;}
  async function loadIdentity(){
    if(!window.C10Api?.isAuthenticated())throw new Error("Sign in with the central account service first.");
    const result=await window.C10Api.identityV2();state.identity=result.identity;
    const select=$("departmentMembership");select.replaceChildren();
    const eligible=(state.identity.memberships||[]).filter(m=>m.role==="school_admin");
    for(const m of eligible){const option=el("option","",m.institutionName+" · "+m.role+" · "+m.membershipId);option.value=m.membershipId;select.append(option);}
    const active=state.identity.context?.membershipId;
    if(active&&eligible.some(m=>m.membershipId===active))select.value=active;
    if(!eligible.length)throw new Error("No School Admin or institution-viewer membership is available for this account.");
    await ensureContext();
  }
  async function ensureContext(){
    const m=selectedMembership();if(!m)throw new Error("Choose an institution membership.");
    if(m.role!=="school_admin")throw new Error("Department setup and changes require a School Admin membership. Institution viewers have read-only access.");
    if(state.identity.context?.membershipId!==m.membershipId||state.identity.context?.institutionId!==m.institutionId){
      await window.C10Api.selectInstitutionContext({institutionId:m.institutionId,membershipId:m.membershipId,branchId:null});
      const fresh=await window.C10Api.identityV2();state.identity=fresh.identity;
    }
  }
  function renderDepartments(){
    const host=$("departmentList");host.replaceChildren();
    if(!state.departments.length){host.append(el("p","admin-empty","No departments found in this institution yet."));return;}
    for(const d of state.departments){
      const b=el("button","admin-list-item",(d.name||"Department")+" · "+d.code+" · "+d.status);
      b.type="button";b.setAttribute("aria-pressed",String(state.selected?.departmentId===d.departmentId));
      b.addEventListener("click",()=>selectDepartment(d.departmentId));host.append(b);
    }
  }
  function renderMembers(){
    const select=$("hodDepartmentMember");select.replaceChildren();
    const members=(state.selected?.members||[]).filter(m=>m.status==="active");
    for(const m of members){const o=el("option","",(m.username||m.userId)+" · "+m.departmentRole);o.value=m.departmentMembershipId;select.append(o);}
    if(!members.length)select.append(el("option","","Add a teacher before appointing an HOD"));
    const heads=state.selected?.headAppointments||[];
    if(heads.length){
      const host=$("departmentList"),wrap=el("div","department-hod-list");
      wrap.append(el("strong","","HOD appointment history"));
      for(const h of heads){
        const line=el("div","admin-list-item",(h.status||"")+" · "+h.effectiveFrom+(h.effectiveTo?" to "+h.effectiveTo:""));
        if(h.status==="active"||h.status==="scheduled"){
          const end=el("button","admin-btn danger","End appointment");end.type="button";
          end.addEventListener("click",async()=>{try{await window.C10Api.endDepartmentHead(h.appointmentId,{status:"ended"});await loadDepartments();status("HOD appointment ended.","success");}catch(e){status(e.message,"error");}});
          line.append(end);
        }
        wrap.append(line);
      }
      host.append(wrap);
    }
  }
  function selectDepartment(id){
    state.selected=state.departments.find(d=>d.departmentId===id)||null;
    if(!state.selected)return;
    $("departmentSelectedTitle").textContent=state.selected.name+" · "+state.selected.code;
    $("departmentSubjects").value=(state.selected.subjects||[]).map(x=>x.subjectId).join(", ");
    $("departmentClasses").value=(state.selected.classScopes||[]).map(x=>x.classId).join(", ");
    renderDepartments();renderMembers();
  }
  async function loadDepartments(){
    await ensureContext();
    const result=await window.C10Api.departments();state.departments=result.departments||[];
    renderDepartments();
    if(state.selected)selectDepartment(state.selected.departmentId);
    else if(state.departments.length)selectDepartment(state.departments[0].departmentId);
    status(state.departments.length+" department(s) loaded for the selected institution.","success");
  }
  async function createDepartment(){
    await ensureContext();
    const name=$("departmentName").value.trim(),code=$("departmentCode").value.trim().toUpperCase();
    if(!name||!code)throw new Error("Enter both a department name and code.");
    const result=await window.C10Api.createDepartment({name,code,parentDepartmentId:$("departmentParent").value.trim()||null});
    $("departmentName").value="";$("departmentCode").value="";$("departmentParent").value="";
    await loadDepartments();selectDepartment(result.departmentId);status("Department created.","success");
  }
  async function saveScopes(){
    await ensureContext();if(!state.selected)throw new Error("Select a department first.");
    const subjects=split($("departmentSubjects").value),classes=split($("departmentClasses").value);
    await window.C10Api.setDepartmentSubjects(state.selected.departmentId,subjects);
    await window.C10Api.setDepartmentClasses(state.selected.departmentId,classes);
    await loadDepartments();status("Department subjects and class scopes saved.","success");
  }
  async function addTeacher(){
    await ensureContext();if(!state.selected)throw new Error("Select a department first.");
    const institutionMembershipId=$("departmentTeacherMembership").value.trim();
    if(!institutionMembershipId)throw new Error("Enter the teacher's institution membership ID.");
    await window.C10Api.addDepartmentTeacher(state.selected.departmentId,{institutionMembershipId,departmentRole:$("departmentRole").value});
    $("departmentTeacherMembership").value="";await loadDepartments();status("Teacher added to the department.","success");
  }
  async function appointHod(){
    await ensureContext();if(!state.selected)throw new Error("Select a department first.");
    const departmentMembershipId=$("hodDepartmentMember").value;
    if(!departmentMembershipId)throw new Error("Add an active teacher to this department first.");
    const effectiveFrom=$("hodEffectiveFrom").value||new Date().toISOString().slice(0,10);
    const classIds=split($("hodClasses").value);
    await window.C10Api.appointDepartmentHead(state.selected.departmentId,{departmentMembershipId,effectiveFrom,effectiveTo:$("hodEffectiveTo").value||null,scopeAllDepartmentClasses:classIds.length===0,classIds});
    $("hodClasses").value="";await loadDepartments();status("HOD appointment created with the selected class scope.","success");
  }
  function run(fn){return async()=>{try{status("Working…");await fn();}catch(e){status(e.message||"Department operation failed.","error");}};}
  function init(){
    if(!$("departmentMembership"))return;
    $("loadDepartmentsBtn").addEventListener("click",run(loadDepartments));
    $("createDepartmentBtn").addEventListener("click",run(createDepartment));
    $("departmentMembership").addEventListener("change",run(async()=>{state.selected=null;await ensureContext();await loadDepartments();}));
    $("saveDepartmentScopesBtn").addEventListener("click",run(saveScopes));
    $("addDepartmentTeacherBtn").addEventListener("click",run(addTeacher));
    $("appointHodBtn").addEventListener("click",run(appointHod));
    $("hodEffectiveFrom").value=new Date().toISOString().slice(0,10);
    if(window.C10Api?.isAuthenticated())run(async()=>{await loadIdentity();await loadDepartments();})();
    else status("Central Worker sign-in is required. Department APIs are not available in local/static prototype mode.");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
