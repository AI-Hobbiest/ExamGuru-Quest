/* Browser-local, source-grounded student knowledge retrieval for ExamGuru Quest. */
(() => {
  "use strict";
  const norm=value=>String(value??"").toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const words=value=>[...new Set(norm(value).split(/\\s+/).filter(word=>word.length>1))];
  const flattenCard=(card,board,chapter)=>{
    const parts=[card.title,card.content,card.highlight,card.note,card.examTip,card.question,card.answer,card.revealLabel,
      ...(Array.isArray(card.steps)?card.steps:[]),
      ...(Array.isArray(card.facts)?card.facts.flatMap(pair=>Array.isArray(pair)?pair:[]):[]),
      ...["left","right"].flatMap(side=>{const item=card[side]||{};return [item.heading,item.content];}),
      ...(Array.isArray(card.tags)?card.tags:[])].filter(Boolean);
    return {id:String(card.id||card.title||chapter.chapterKey),title:String(card.title||chapter.title),text:parts.join(" "),subject:board.subject,subjectLabel:board.subjectLabel||board.subject,classId:String(board.classId),chapter:chapter.title,chapterLabel:chapter.chapterLabel||("Chapter "+chapter.chapterNo),sourceType:"revision-card",path:"./study.html#visualRevisionBoard"};
  };
  function buildIndex(visual,manifest,classId){
    const docs=[];
    if(visual&&visual.schemaVersion===1&&visual.kind==="visual-revision-manifest"&&Array.isArray(visual.boards)){
      visual.boards.filter(board=>String(board.classId)===String(classId)).forEach(board=>(board.chapters||[]).forEach(chapter=>(chapter.cards||[]).forEach(card=>docs.push(flattenCard(card,board,chapter)))));
    }
    if(manifest&&manifest.schemaVersion===1&&manifest.kind==="knowledge-base-manifest"&&Array.isArray(manifest.resources)){
      manifest.resources.filter(item=>item.status==="published"&&(!Array.isArray(item.classIds)||!item.classIds.length||item.classIds.map(String).includes(String(classId))))
        .forEach(item=>docs.push({id:item.resourceId,title:item.title,text:[item.title,item.summary,item.subject,item.chapter].filter(Boolean).join(" "),subject:item.subject||"",classId:String(classId),chapter:item.chapter||"",sourceType:"published-resource",path:"./"+item.path,summary:item.summary||""}));
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
  function answer(results,query){
    if(!results.length)return {text:"I couldn't find a close match in the published learning material for your class. Try a chapter name, topic keyword, or subject. I won't guess beyond the available sources.",sources:[]};
    const best=results.slice(0,3);
    const lines=best.map((item,index)=>{
      const snippet=item.summary||item.text.replace(/\\s+/g," ").slice(0,420);
      return (index+1)+". **"+item.title+"** — "+snippet+(item.chapter?" ( "+item.chapter+" )":"");
    });
    return {text:"I found these relevant parts of your learning library for “"+String(query).trim()+"”:\\n\\n"+lines.join("\\n\\n")+"\\n\\nOpen a source below to study the full material. You can ask a follow-up using the same topic.",sources:best.map(item=>({title:item.title,chapter:item.chapter,subject:item.subjectLabel||item.subject,path:item.path}))};
  }
  const api=Object.freeze({norm,words,buildIndex,search,answer});
  window.ExamGuruKnowledgeAssistantModel=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();