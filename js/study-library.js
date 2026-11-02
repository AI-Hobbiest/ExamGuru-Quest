(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const empty=()=>({schemaVersion:1,kind:"study-library-progress",completedResourceIds:[],bookmarkedResourceIds:[]});
  let resources=[],progress=empty(),classId="10";
  const store=window.C10Storage.createLocalStore({
    kind:"study-library-progress",recordId:"resource-library",defaults:empty,
    validate:value=>!!value&&value.schemaVersion===1&&value.kind==="study-library-progress"&&
      Array.isArray(value.completedResourceIds)&&Array.isArray(value.bookmarkedResourceIds)
  });
  const LABELS={science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi"};
  const esc=value=>String(value??"").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
  const typeLabel=type=>window.C10StudyModel.TYPES[type]||"Study resource";
  function readClass(){
    try{
      const user=window.C10StudentAuth&&window.C10StudentAuth.currentUser?window.C10StudentAuth.currentUser():null;
      if(user&&user.classId)return String(user.classId);
    }catch(_){}
    try{
      const user=JSON.parse(sessionStorage.getItem("c10playground_static_student_v1")||"null");
      if(user&&user.classId)return String(user.classId);
    }catch(_){}
    return "10";
  }
  function populateFilters(){
    const subjects=[...new Set(resources.map(item=>String(item.subject||"")).filter(Boolean))].sort();
    subjects.forEach(subject=>{
      const option=document.createElement("option");option.value=subject;option.textContent=LABELS[subject]||subject;
      $("studySubject").appendChild(option);
    });
    const types=[...new Set(resources.map(item=>String(item.type||"")).filter(Boolean))].sort();
    types.forEach(type=>{
      const option=document.createElement("option");option.value=type;option.textContent=typeLabel(type);
      $("studyType").appendChild(option);
    });
  }
  function saveProgress(){progress=window.C10StudyModel.normalizeProgress(progress);store.save(progress);render();}
  function toggleBookmark(id){progress.bookmarkedResourceIds=window.C10StudyModel.toggleId(progress.bookmarkedResourceIds,id);saveProgress();}
  function toggleCompleted(id){progress.completedResourceIds=window.C10StudyModel.toggleId(progress.completedResourceIds,id);saveProgress();}
  function render(){
    $("studyAvailable").textContent=resources.length;
    $("studyCompleted").textContent=progress.completedResourceIds.filter(id=>resources.some(item=>item.resourceId===id)).length;
    $("studySaved").textContent=progress.bookmarkedResourceIds.filter(id=>resources.some(item=>item.resourceId===id)).length;
    const matches=window.C10StudyModel.filterResources(resources,{
      query:$("studySearch").value,subject:$("studySubject").value,type:$("studyType").value,status:$("studyStatus").value,
      completedIds:progress.completedResourceIds,bookmarkedIds:progress.bookmarkedResourceIds
    });
    const list=$("studyResourceList");list.innerHTML="";
    if(!matches.length){
      const emptyNode=document.createElement("div");emptyNode.className="study-empty";
      const title=document.createElement("strong");
      title.textContent=resources.length?"No resources match these filters.":"No study resources have been published for Class "+classId+" yet.";
      const detail=document.createElement("span");
      detail.textContent=resources.length?"Try another subject, type or search term.":"Your administrator can add permitted notes, reading material and visual references in Admin → Knowledge base. New materials will appear here after publication.";
      emptyNode.append(title,detail);list.appendChild(emptyNode);return;
    }
    matches.forEach(item=>{
      const card=document.createElement("article");card.className="study-card";
      const head=document.createElement("div");head.className="study-card-head";
      const kind=document.createElement("span");kind.className="study-type";kind.textContent=typeLabel(item.type);
      const state=document.createElement("span");state.className="study-chip";
      state.textContent=progress.completedResourceIds.includes(item.resourceId)?"✓ Completed":"For your class";
      head.append(kind,state);
      const title=document.createElement("h2");title.textContent=item.title;
      const meta=document.createElement("div");meta.className="study-meta";
      meta.textContent=[LABELS[item.subject]||item.subject||"General",item.chapter||""].filter(Boolean).join(" · ");
      const summary=document.createElement("p");summary.className="study-summary-text";
      summary.textContent=item.summary||"Open this resource to study the material.";
      const actions=document.createElement("div");actions.className="study-actions";
      const open=document.createElement("a");
      open.href="./"+item.path;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Open resource ↗";
      actions.appendChild(open);
      const saved=progress.bookmarkedResourceIds.includes(item.resourceId);
      const bookmark=document.createElement("button");bookmark.type="button";bookmark.textContent=saved?"✓ Saved":"☆ Save";
      bookmark.setAttribute("aria-pressed",String(saved));bookmark.addEventListener("click",()=>toggleBookmark(item.resourceId));actions.appendChild(bookmark);
      const completed=progress.completedResourceIds.includes(item.resourceId);
      const done=document.createElement("button");done.type="button";done.textContent=completed?"Undo completed":"Mark completed";
      done.setAttribute("aria-pressed",String(completed));done.addEventListener("click",()=>toggleCompleted(item.resourceId));actions.appendChild(done);
      card.append(head,title,meta,summary,actions);list.appendChild(card);
    });
  }
  async function init(){
    classId=readClass();progress=window.C10StudyModel.normalizeProgress(store.load());
    ["studySearch","studySubject","studyType","studyStatus"].forEach(id=>$(id).addEventListener(id==="studySearch"?"input":"change",render));
    try{
      const response=await fetch("./data/knowledge-base.json",{cache:"no-store"});
      if(!response.ok)throw new Error("The published resource catalogue could not be loaded.");
      const manifest=await response.json();
      if(!window.C10StudyModel.isValidManifest(manifest))throw new Error("The resource catalogue has an invalid format. Ask the administrator to review it.");
      resources=window.C10StudyModel.visibleResources(manifest,classId);
      populateFilters();render();
      $("studyStatus").textContent=resources.length
        ?resources.length+" published learning resource(s) available for Class "+classId+"."
        :"The Study Library is ready. No resources have been published for Class "+classId+" yet.";
    }catch(error){
      $("studyStatus").textContent=error.message||"Unable to load study resources.";
      $("studyResourceList").innerHTML='<div class="study-empty">The Study Library could not load. Please refresh or contact the administrator.</div>';
    }
  }
  init();
})();
