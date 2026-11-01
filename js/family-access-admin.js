/* Admin editor for parent accounts and many-to-many parent–student links. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const FAMILY_FILE="./data/family-access.json",STUDENT_FILE="./data/student-accounts.json",ITERATIONS=600000;
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let family=null,students=null,dirty=false;
  function say(message,error=false){const el=$("familyAccessStatus");if(!el)return;el.textContent=message;el.className="admin-status"+(error?" error":"");}
  function bytes(length){const data=new Uint8Array(length);crypto.getRandomValues(data);return data;}
  function base64(data){let binary="";for(const value of data)binary+=String.fromCharCode(value);return btoa(binary);}
  function makeId(prefix){return prefix+"-"+Array.from(bytes(16),value=>value.toString(16).padStart(2,"0")).join("");}
  function makePassword(length=16){let value="";for(const item of bytes(length))value+=chars[item%chars.length];return value;}
  async function hashPassword(password,salt){
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
    const result=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},key,256);
    return base64(new Uint8Array(result));
  }
  function studentIdFor(account){return String(account.studentId||("student-"+String(account.username||"").toLowerCase().replace(/[^a-z0-9_-]/g,"-")));}
  async function fetchJson(path,label){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok)throw new Error("Cannot load "+label+" (HTTP "+response.status+").");
    return response.json();
  }
  async function load(){
    const [nextFamily,nextStudents]=await Promise.all([fetchJson(FAMILY_FILE,"data/family-access.json"),fetchJson(STUDENT_FILE,"data/student-accounts.json")]);
    if(!nextFamily||nextFamily.schemaVersion!==1||nextFamily.kind!=="c10-family-access"||!Array.isArray(nextFamily.parents)||!Array.isArray(nextFamily.parentStudentLinks))throw new Error("Family access file has an unsupported structure.");
    if(!nextStudents||!Array.isArray(nextStudents.accounts))throw new Error("Student account file is invalid.");
    family=nextFamily;students=nextStudents;dirty=false;render();
    say("Loaded "+family.parents.length+" parent account(s), "+family.parentStudentLinks.filter(x=>x.active!==false).length+" active relationship(s), and "+students.accounts.length+" student account(s).");
  }
  function download(){
    const blob=new Blob([JSON.stringify(family,null,2)+"\n"],{type:"application/json"});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download="family-access.json";anchor.style.display="none";
    document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);dirty=false;
  }
  function render(){
    const parentSelect=$("familyParentSelect"),previous=parentSelect.value;
    parentSelect.innerHTML="";
    [...family.parents].sort((a,b)=>a.username.localeCompare(b.username)).forEach(parent=>{
      const option=document.createElement("option");option.value=parent.parentId;
      option.textContent=(parent.displayName||parent.username)+" · "+parent.username+(parent.active===false?" (disabled)":"");
      parentSelect.appendChild(option);
    });
    if([...parentSelect.options].some(option=>option.value===previous))parentSelect.value=previous;
    const childSelect=$("familyChildrenSelect"),previousChildren=new Set(Array.from(childSelect.selectedOptions||[]).map(option=>option.value));
    childSelect.innerHTML="";
    [...students.accounts].filter(item=>item.active!==false).sort((a,b)=>a.username.localeCompare(b.username)).forEach(account=>{
      const option=document.createElement("option");option.value=studentIdFor(account);
      option.textContent=account.username+" · Class "+String(account.classId||"10");
      option.selected=previousChildren.has(option.value);childSelect.appendChild(option);
    });
    loadSelectedLinks();renderTable();
  }
  function loadSelectedLinks(){
    const parentId=$("familyParentSelect").value;
    const linked=new Set(family.parentStudentLinks.filter(link=>String(link.parentId)===parentId&&link.active!==false).map(link=>String(link.studentId)));
    Array.from($("familyChildrenSelect").options).forEach(option=>{option.selected=linked.has(option.value);});
  }
  function renderTable(){
    const container=$("familyLinksTable");container.innerHTML="";
    if(!family.parentStudentLinks.length){const empty=document.createElement("div");empty.className="admin-empty";empty.textContent="No parent–child relationships have been created yet.";container.appendChild(empty);return;}
    const parentMap=new Map(family.parents.map(item=>[String(item.parentId),item]));
    const studentMap=new Map(students.accounts.map(item=>[studentIdFor(item),item]));
    const table=document.createElement("table");table.className="admin-table";
    const head=document.createElement("thead"),heading=document.createElement("tr");
    ["Parent username","Student username","Class","Status"].forEach(label=>{const th=document.createElement("th");th.textContent=label;heading.appendChild(th);});
    head.appendChild(heading);table.appendChild(head);
    const body=document.createElement("tbody");
    family.parentStudentLinks.forEach(link=>{
      const parent=parentMap.get(String(link.parentId)),student=studentMap.get(String(link.studentId)),row=document.createElement("tr");
      [parent?parent.username:"Unknown parent",student?student.username:"Unknown student",student?"Class "+String(student.classId||"10"):"—",link.active===false?"Inactive":"Active"].forEach(value=>{
        const cell=document.createElement("td");cell.textContent=value;row.appendChild(cell);
      });
      body.appendChild(row);
    });
    table.appendChild(body);container.appendChild(table);
  }
  async function createParent(){
    try{
      if(!family||!students)await load();
      const username=$("parentAccountUsername").value.trim().toLowerCase();
      const displayName=$("parentAccountDisplayName").value.trim()||username;
      if(!/^[a-z0-9._-]{3,32}$/.test(username))throw new Error("Use 3–32 lowercase letters, numbers, dot, underscore or hyphen.");
      if(students.accounts.some(item=>String(item.username).toLowerCase()===username)||family.parents.some(item=>String(item.username).toLowerCase()===username))throw new Error("That username is already used by another account.");
      const password=makePassword(),salt=bytes(16),parentId=makeId("parent");
      family.parents.push({parentId,username,displayName,salt:base64(salt),passwordHash:await hashPassword(password,salt),iterations:ITERATIONS,active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      family.parents.sort((a,b)=>a.username.localeCompare(b.username));dirty=true;render();
      $("familyParentSelect").value=parentId;loadSelectedLinks();download();
      $("parentAccountUsername").value="";$("parentAccountDisplayName").value="";
      $("parentTempPasswordBox").hidden=false;$("parentTempPassword").value=password;
      say("Parent account prepared. Commit the downloaded family-access.json to data/family-access.json. Then select this parent and map one or more students.");
    }catch(error){say(error.message||"Unable to create parent account.",true);}
  }
  function saveLinks(){
    try{
      if(!family||!students)throw new Error("Load the published family access file first.");
      const parentId=$("familyParentSelect").value;
      if(!parentId)throw new Error("Create or select a parent account first.");
      const selected=Array.from($("familyChildrenSelect").selectedOptions).map(option=>option.value);
      if(!selected.length&&!confirm("This will remove every child link for the selected parent. Continue?"))return;
      family.parentStudentLinks=family.parentStudentLinks.filter(link=>String(link.parentId)!==parentId);
      selected.forEach(studentId=>family.parentStudentLinks.push({parentId,studentId,relationship:"parent/guardian",active:true,createdAt:new Date().toISOString()}));
      dirty=true;render();$("familyParentSelect").value=parentId;loadSelectedLinks();download();
      say("Relationships exported. A parent can have multiple children, and a student can be linked to multiple parents. Commit family-access.json to publish the mapping.");
    }catch(error){say(error.message||"Unable to save family links.",true);}
  }
  function init(){
    if(!$("familyAccessPanel"))return;
    $("createParentAccountBtn").addEventListener("click",createParent);
    $("saveFamilyLinksBtn").addEventListener("click",saveLinks);
    $("reloadFamilyAccessBtn").addEventListener("click",()=>load().catch(error=>say(error.message,true)));
    $("downloadFamilyAccessBtn").addEventListener("click",()=>{if(!family){say("Load the family file first.",true);return;}download();say("Downloaded family-access.json. Publish it to data/family-access.json.");});
    $("familyParentSelect").addEventListener("change",loadSelectedLinks);
    $("copyParentTempPasswordBtn").addEventListener("click",async()=>{
      const value=$("parentTempPassword").value;if(!value)return;
      try{await navigator.clipboard.writeText(value);say("Temporary parent password copied. Share it privately.");}
      catch(_){$("parentTempPassword").focus();$("parentTempPassword").select();say("Clipboard was blocked; the password is selected for manual copying.");}
    });
    load().catch(error=>say(error.message||"Unable to load family access.",true));
    window.addEventListener("beforeunload",event=>{if(dirty){event.preventDefault();event.returnValue="";}});
  }
  init();
})();
