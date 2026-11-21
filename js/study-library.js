(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const empty=()=>({schemaVersion:1,kind:"study-library-progress",completedResourceIds:[],bookmarkedResourceIds:[]});
  let resources=[],progress=empty(),classId="10";
  let visualBoards=[],activeChapter=null,readOnlyView=false;
  const store=window.C10Storage.createLocalStore({
    kind:"study-library-progress",recordId:"resource-library",defaults:empty,
    validate:value=>!!value&&value.schemaVersion===1&&value.kind==="study-library-progress"&&
      Array.isArray(value.completedResourceIds)&&Array.isArray(value.bookmarkedResourceIds)
  });
  const LABELS={science:"Science",mathematics:"Mathematics",english:"English","social-science":"Social Science",hindi:"Hindi"};
  const VISUAL_TYPES={
    concept:{label:"Key concept",icon:"✦"},
    steps:{label:"Process / steps",icon:"↗"},
    compare:{label:"Compare & contrast",icon:"⇄"},
    "exam-alert":{label:"Exam alert",icon:"!"},
    fact:{label:"Facts & formulas",icon:"="},
    recall:{label:"Quick recall",icon:"?"},
    mnemonic:{label:"Memory aid",icon:"✧"}
  };
  const esc=value=>String(value??"").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
  const typeLabel=type=>window.C10StudyModel.TYPES[type]||"Study resource";
  async function readClass(){
    const params=new URLSearchParams(location.search);
    if(window.C10StudyViewerRole==="admin")return String(params.get("classId")||"10");
    if(window.C10StudyViewerRole==="parent"){
      const children=await window.C10StudentAuth.getLinkedChildren();
      const child=children.find(item=>String(item.studentId)===String(window.C10StudyChildId));
      if(!child)throw new Error("The selected child is no longer linked to this parent account.");
      return String(child.classId||"10");
    }
    const user=window.C10StudentAuth&&window.C10StudentAuth.currentUser?window.C10StudentAuth.currentUser():null;
    return String(user&&user.classId||"10");
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
  function saveProgress(){if(readOnlyView)return;progress=window.C10StudyModel.normalizeProgress(progress);store.save(progress);renderResources();}
  function toggleBookmark(id){progress.bookmarkedResourceIds=window.C10StudyModel.toggleId(progress.bookmarkedResourceIds,id);saveProgress();}
  function toggleCompleted(id){progress.completedResourceIds=window.C10StudyModel.toggleId(progress.completedResourceIds,id);saveProgress();}
  function renderResources(){
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
      const card=document.createElement("article");card.className="study-card eg-surface-card";
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
      if(!readOnlyView){
        const saved=progress.bookmarkedResourceIds.includes(item.resourceId);
        const bookmark=document.createElement("button");bookmark.type="button";bookmark.textContent=saved?"✓ Saved":"☆ Save";
        bookmark.setAttribute("aria-pressed",String(saved));bookmark.addEventListener("click",()=>toggleBookmark(item.resourceId));actions.appendChild(bookmark);
        const completed=progress.completedResourceIds.includes(item.resourceId);
        const done=document.createElement("button");done.type="button";done.textContent=completed?"Undo completed":"Mark completed";
        done.setAttribute("aria-pressed",String(completed));done.addEventListener("click",()=>toggleCompleted(item.resourceId));actions.appendChild(done);
      }
      card.append(head,title,meta,summary,actions);list.appendChild(card);
    });
  }

  function visualBoardsForClass(){
    return visualBoards.filter(board=>String(board.classId)===String(classId));
  }
  function selectedVisualBoard(){
    const subject=$("vrbSubject").value;
    return visualBoardsForClass().find(board=>board.subject===subject)||null;
  }
  function populateVisualSubjects(){
    const select=$("vrbSubject");select.innerHTML="";
    const boards=visualBoardsForClass();
    const subjects=[...new Set(boards.map(board=>board.subject))];
    subjects.forEach(subject=>{
      const option=document.createElement("option");option.value=subject;
      option.textContent=boards.find(board=>board.subject===subject)?.subjectLabel||LABELS[subject]||subject;
      select.appendChild(option);
    });
    if(!subjects.length){
      const option=document.createElement("option");option.value="";option.textContent="No subjects published yet";select.appendChild(option);
      select.disabled=true;$("vrbChapter").disabled=true;
      $("vrbChapterTitle").textContent="Revision notes are being prepared";
      $("vrbChapterSubtitle").textContent="More class and subject boards will be published in upcoming content batches.";
      $("vrbCount").textContent="Coming soon";
      $("vrbGrid").innerHTML='<div class="vrb-empty">There are no Visual Revision Board notes published for Class '+esc(classId)+' yet. The board is ready; additional chapter notes can be added through the JSON catalogue.</div>';
      $("vrbStatus").textContent="Static JSON delivery is active. No cloud services or image storage are required.";
      return;
    }
    select.disabled=false;$("vrbChapter").disabled=false;
    select.value=subjects[0];populateVisualChapters();
  }
  function populateVisualChapters(){
    const board=selectedVisualBoard(),select=$("vrbChapter");select.innerHTML="";
    const chapters=board&&Array.isArray(board.chapters)?board.chapters:[];
    chapters.forEach(chapter=>{
      const option=document.createElement("option");option.value=chapter.chapterKey;
      option.textContent="Chapter "+chapter.chapterNo+" · "+chapter.title;select.appendChild(option);
    });
    if(!chapters.length){
      const option=document.createElement("option");option.value="";option.textContent="No chapters published";select.appendChild(option);
    }
    select.value=chapters[0]?.chapterKey||"";
    renderVisualCards();
  }
  function createText(tag,className,value){
    const node=document.createElement(tag);if(className)node.className=className;
    if(value!==undefined)node.textContent=String(value);return node;
  }
  function addParagraph(parent,value,className=""){
    if(value)parent.appendChild(createText("p",className,value));
  }
  function renderVisualCard(card){
    const type=VISUAL_TYPES[card.type]||{label:"Revision note",icon:"✦"};
    const article=createText("article","vrb-card vrb-"+String(card.type||"concept"));
    const top=createText("div","vrb-card-top");
    top.append(createText("span","vrb-type",type.icon+"  "+(card.typeLabel||type.label)));
    article.append(top,createText("h4","",card.title||"Revision note"));
    if(card.type==="steps"){
      addParagraph(article,card.content);
      const list=createText("ol","vrb-steps-list");
      (card.steps||[]).forEach(step=>list.appendChild(createText("li","",step)));
      article.appendChild(list);
    }else if(card.type==="compare"){
      const grid=createText("div","vrb-compare-grid");
      ["left","right"].forEach(side=>{
        const item=card[side]||{},box=createText("div","vrb-compare-side");
        box.appendChild(createText("strong","",item.heading||""));
        addParagraph(box,item.content);grid.appendChild(box);
      });
      article.appendChild(grid);
    }else if(card.type==="fact"){
      const facts=createText("div","vrb-fact-list");
      (card.facts||[]).forEach(pair=>{
        const row=createText("div","vrb-fact-row");
        row.append(createText("span","",pair[0]),createText("strong","",pair[1]));facts.appendChild(row);
      });
      article.appendChild(facts);
    }else if(card.type==="recall"){
      addParagraph(article,card.question,"vrb-recall-question");
      const reveal=createText("button","vrb-reveal",card.revealLabel||"Reveal answer");
      reveal.type="button";reveal.setAttribute("aria-expanded","false");
      const answer=createText("div","vrb-answer",card.answer||"");answer.hidden=true;
      reveal.addEventListener("click",()=>{
        const open=answer.hidden;answer.hidden=!open;reveal.textContent=open?(card.hideLabel||"Hide answer"):(card.revealLabel||"Reveal answer");
        reveal.setAttribute("aria-expanded",String(open));
      });
      article.append(reveal,answer);
    }else{
      addParagraph(article,card.content);
    }
    if(card.highlight)article.appendChild(createText("div","vrb-highlight",card.highlight));
    if(card.examTip)article.appendChild(createText("p","vrb-note","Exam tip: "+card.examTip));
    if(card.note)article.appendChild(createText("p","vrb-note",card.note));
    if(Array.isArray(card.tags)&&card.tags.length){
      const tags=createText("div","vrb-tags");
      card.tags.forEach(tag=>tags.appendChild(createText("span","vrb-tag",tag)));
      article.appendChild(tags);
    }
    return article;
  }
  function renderVisualCards(){
    const board=selectedVisualBoard();
    const chapter=board&&board.chapters.find(item=>item.chapterKey===$("vrbChapter").value);
    activeChapter=chapter||null;
    const grid=$("vrbGrid");grid.innerHTML="";
    if(!chapter){
      $("vrbChapterTitle").textContent="No chapter selected";
      $("vrbChapterSubtitle").textContent="Choose an available chapter.";
      $("vrbCount").textContent="0 cards";$("vrbFilteredCount").textContent="";
      grid.appendChild(createText("div","vrb-empty","No revision cards are available for this selection yet."));return;
    }
    $("vrbChapterTitle").textContent=(chapter.chapterLabel||("Chapter "+chapter.chapterNo))+" · "+chapter.title;
    $("vrbChapterSubtitle").textContent=chapter.subtitle||"Quick chapter reference";
    const query=$("vrbSearch").value.trim().toLowerCase();
    const cards=(chapter.cards||[]).filter(card=>!query||JSON.stringify(card).toLowerCase().includes(query));
    $("vrbCount").textContent=(chapter.cards||[]).length+" revision cards";
    $("vrbFilteredCount").textContent=cards.length+" shown";
    if(!cards.length){
      grid.appendChild(createText("div","vrb-empty","No cards match “"+$("vrbSearch").value+"”. Try another keyword."));return;
    }
    cards.forEach(card=>grid.appendChild(renderVisualCard(card)));
  }
  async function loadVisualRevision(){
    try{
      const response=await fetch("./data/visual-revision.json",{cache:"no-store"});
      if(!response.ok)throw new Error("The Visual Revision Board catalogue could not be loaded.");
      const manifest=await response.json();
      if(!manifest||manifest.schemaVersion!==1||manifest.kind!=="visual-revision-manifest"||!Array.isArray(manifest.boards))throw new Error("The Visual Revision Board catalogue has an unsupported format.");
      visualBoards=manifest.boards.filter(board=>board&&/^[0-9]{1,2}$/.test(String(board.classId))&&typeof board.subject==="string"&&Array.isArray(board.chapters));
      populateVisualSubjects();
      $("vrbStatus").textContent="Quick revision notes are loaded from static JSON. Image-library integration is intentionally deferred to the cloud-storage phase.";
    }catch(error){
      $("vrbCount").textContent="Unavailable";
      $("vrbGrid").innerHTML='<div class="vrb-empty">The Visual Revision Board could not load. Please refresh the page or contact the administrator.</div>';
      $("vrbStatus").textContent=error.message||"Unable to load revision notes.";
    }
  }
  function initStudyLibraryTabs(){
    const tabs=[...document.querySelectorAll("[data-study-tab]")];
    tabs.forEach(tab=>tab.addEventListener("click",()=>{
      const target=tab.getAttribute("data-study-tab");
      tabs.forEach(item=>item.setAttribute("aria-selected",String(item===tab)));
      document.querySelectorAll(".study-library-view").forEach(section=>{
        section.hidden=section.id!==target;
      });
    }));
  }
  async function init(){
    initStudyLibraryTabs();
    if(window.C10StudyAccessReady)await window.C10StudyAccessReady;
    classId=await readClass();readOnlyView=window.C10StudyViewerRole==="parent"||window.C10StudyViewerRole==="admin";progress=readOnlyView?empty():window.C10StudyModel.normalizeProgress(store.load());
    ["studySearch","studySubject","studyType","studyStatus"].forEach(id=>$(id).addEventListener(id==="studySearch"?"input":"change",renderResources));
    $("vrbSubject").addEventListener("change",populateVisualChapters);
    $("vrbChapter").addEventListener("change",renderVisualCards);
    $("vrbSearch").addEventListener("input",renderVisualCards);
    if(window.C10StudyViewerRole==="admin"){
      const back=$("studyBackLink"),title=$("studyPageTitle"),intro=$("studyPageIntro"),notice=$("studyPreviewNotice");
      if(back){back.href="./admin.html#tab-knowledge";back.textContent="← Back to Admin · Knowledge Base";}
      if(title)title.textContent="Study Library Preview";
      if(intro)intro.textContent="Student-facing Study Library for Class "+classId+". This is a read-only preview; no student progress or account data is changed.";
      if(notice){notice.hidden=false;notice.style.display="block";notice.textContent="ADMIN PREVIEW · Class "+classId+" · Student experience · Read-only";}
    }else if(window.C10StudyViewerRole==="parent"){
      const back=$("studyBackLink");if(back){back.href="./parent.html";back.textContent="← Back to Family Dashboard";}
    }
    if(readOnlyView)$("studyLoadStatus").textContent="Preview mode · Class "+classId+" · Progress controls are disabled.";
    loadVisualRevision();
    try{
      const response=await fetch("./data/knowledge-base.json",{cache:"no-store"});
      if(!response.ok)throw new Error("The published resource catalogue could not be loaded.");
      const manifest=await response.json();
      if(!window.C10StudyModel.isValidManifest(manifest))throw new Error("The resource catalogue has an invalid format. Ask the administrator to review it.");
      resources=window.C10StudyModel.visibleResources(manifest,classId);
      populateFilters();renderResources();
      $("studyLoadStatus").textContent=resources.length
        ?resources.length+" published learning resource(s) available for Class "+classId+"."
        :"The Study Library is ready. No resources have been published for Class "+classId+" yet.";
    }catch(error){
      $("studyLoadStatus").textContent=error.message||"Unable to load study resources.";
      $("studyResourceList").innerHTML='<div class="study-empty">The Study Library could not load. Please refresh or contact the administrator.</div>';
    }
  }
  init();
})();