/* Provider-neutral, browser-local retrieval and role-scope policy. */
(() => {
  "use strict";
  const PROFILES=Object.freeze({
    student:{label:"Student",title:"Your learning assistant",greeting:"Ask about your class curriculum, Study Library, practice, revision or your own learning progress.",audiences:["student"],capabilities:["curriculum","study_library","practice_guidance","own_progress"]},
    parent:{label:"Parent / Guardian",title:"Family learning assistant",greeting:"Ask about linked-child learning guidance, assigned tests, progress reports and how to support revision.",audiences:["parent"],capabilities:["linked_child_guidance","assigned_tests","linked_child_reports"]},
    teacher:{label:"Teacher",title:"Teaching assistant",greeting:"Ask about your assigned classes and subjects, lesson resources, assessments and class performance.",audiences:["teacher"],capabilities:["assigned_classes","assigned_subjects","lesson_resources","assessments","class_reports"]},
    hod:{label:"Head of Department",title:"Department assistant",greeting:"Ask about your department, teacher workload, department performance and approved cross-department teaching assignments.",audiences:["hod"],capabilities:["department_scope","teacher_workload","department_reports","approved_cross_department_assignments"]},
    school_admin:{label:"Institution Admin",title:"Institution operations assistant",greeting:"Ask about institution operations, users, academic structure, content and institution-level reports.",audiences:["school_admin"],capabilities:["institution_operations","users","academic_structure","institution_content","institution_reports"]},
    institution_viewer:{label:"Institution Viewer",title:"Institution information assistant",greeting:"Ask about institution-level information and reports. This workspace is read-only.",audiences:["institution_viewer"],capabilities:["institution_information","institution_reports_read_only"]},
    platform_admin:{label:"Platform Admin",title:"Platform operations assistant",greeting:"Ask about platform documentation, question banks, institutions, demo management and operational guidance.",audiences:["platform_admin"],capabilities:["platform_documentation","question_banks","institutions","demo_management","operations"]}
  });
  const norm=value=>String(value??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const words=value=>[...new Set(norm(value).split(/\s+/).filter(word=>word.length>1))];
  function resolveProfile(auth){
    if(!auth||typeof auth!=="object")return null;
    let role=auth.role;
    if(role==="institution")role=auth.institutionRole||"institution_viewer";
    if(role==="admin")role="platform_admin";
    return PROFILES[role]?{role,...PROFILES[role],classId:role==="student"?String(auth.classId||""):"",institutionId:String(auth.institutionId||""),departmentIds:Array.isArray(auth.departmentIds)?auth.departmentIds.map(String):[],classIds:Array.isArray(auth.assignedClassIds)?auth.assignedClassIds.map(String):Array.isArray(auth.teachingClassIds)?auth.teachingClassIds.map(String):[]}:null;
  }
  const flattenCard=(card,board,chapter)=>{
    const parts=[card.title,card.content,card.highlight,card.note,card.examTip,card.question,card.answer,card.revealLabel,
      ...(Array.isArray(card.steps)?card.steps:[]),
      ...(Array.isArray(card.facts)?card.facts.flatMap(pair=>Array.isArray(pair)?pair:[]):[]),
      ...["left","right"].flatMap(side=>{const item=card[side]||{};return [item.heading,item.content];}),
      ...(Array.isArray(card.tags)?card.tags:[])].filter(Boolean);
    return {id:String(card.id||card.title||chapter.chapterKey),title:String(card.title||chapter.title),text:parts.join(" "),subject:board.subject,subjectLabel:board.subjectLabel||board.subject,classId:String(board.classId),chapter:chapter.title,chapterLabel:chapter.chapterLabel||("Chapter "+chapter.chapterNo),sourceType:"revision-card",path:"./study.html#visualRevisionBoard",audienceRoles:["student"]};
  };
  function resourceAllowed(item,profile){
    if(item.status!=="published")return false;
    if(Array.isArray(item.audienceRoles)&&item.audienceRoles.length&&!item.audienceRoles.includes(profile.role))return false;
    if(profile.role==="student"&&Array.isArray(item.classIds)&&item.classIds.length&&!item.classIds.map(String).includes(profile.classId))return false;
    if(item.institutionId&&(!profile.institutionId||String(item.institutionId)!==profile.institutionId))return false;
    if(Array.isArray(item.departmentIds)&&item.departmentIds.length&&(!profile.departmentIds.length||!item.departmentIds.some(id=>profile.departmentIds.includes(String(id)))))return false;
    if(Array.isArray(item.classIds)&&item.classIds.length&&profile.role!=="student"&&(!profile.classIds.length||!item.classIds.some(id=>profile.classIds.includes(String(id)))))return false;
    return true;
  }
  function buildIndex(visual,manifest,auth){
    const profile=typeof auth==="string"?{role:"student",classId:auth,institutionId:"",departmentIds:[]}:resolveProfile(auth);
    if(!profile)return [];
    const docs=[];
    if(profile.role==="student"&&visual&&visual.schemaVersion===1&&visual.kind==="visual-revision-manifest"&&Array.isArray(visual.boards)){
      visual.boards.filter(board=>String(board.classId)===profile.classId).forEach(board=>(board.chapters||[]).forEach(chapter=>(chapter.cards||[]).forEach(card=>docs.push(flattenCard(card,board,chapter)))));
    }
    if(manifest&&manifest.schemaVersion===1&&manifest.kind==="knowledge-base-manifest"&&Array.isArray(manifest.resources)){
      manifest.resources.filter(item=>resourceAllowed(item,profile)).forEach(item=>docs.push({id:item.resourceId,title:item.title,text:[item.title,item.summary,item.subject,item.chapter,item.content].filter(Boolean).join(" "),subject:item.subject||"",classId:profile.classId,chapter:item.chapter||"",sourceType:"published-resource",path:"./"+item.path,summary:item.summary||"",audienceRoles:item.audienceRoles||[]}));
    }
    return docs;
  }
  function search(index,query,limit=5){
    const q=norm(query),tokens=words(query);
    if(!q||!tokens.length)return [];
    return index.map(doc=>{
      const title=norm(doc.title),chapter=norm(doc.chapter),subject=norm(doc.subjectLabel||doc.subject),body=norm(doc.text);
      let score=0;
      tokens.forEach(token=>{if(title.includes(token))score+=5;if(chapter.includes(token))score+=4;if(subject.includes(token))score+=2;if(body.includes(token))score+=1;});
      if(body.includes(q))score+=6;
      return {...doc,score};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,Math.max(1,Math.min(10,limit)));
  }
  function answer(results,query,profile){
    if(!results.length)return {text:"I couldn't find a close match in the published material available to this "+(profile?.label||"workspace")+". Try a topic, subject or resource title. I won't guess beyond the sources I can access.",sources:[]};
    const best=results.slice(0,3);
    const lines=best.map((item,index)=>{const snippet=item.summary||item.text.replace(/\s+/g," ").slice(0,420);return (index+1)+". "+item.title+" — "+snippet+(item.chapter?" ("+item.chapter+")":"");});
    return {text:"I found these relevant sources for “"+String(query).trim()+"”:\n\n"+lines.join("\n\n")+"\n\nOpen a source below for the full material. You can continue with a follow-up question.",sources:best.map(item=>({title:item.title,chapter:item.chapter,subject:item.subjectLabel||item.subject,path:item.path}))};
  }
  const api=Object.freeze({PROFILES,norm,words,resolveProfile,buildIndex,search,answer});
  window.ExamGuruKnowledgeAssistantModel=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();