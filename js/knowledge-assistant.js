/* Lightweight conversational search over published, class-scoped ExamGuru knowledge. */
(() => {
  "use strict";
  if(window.__examGuruKnowledgeAssistantLoaded)return;
  window.__examGuruKnowledgeAssistantLoaded=true;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const safeText=value=>String(value??"");
  async function loadJson(path){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok)throw new Error("Could not load "+path);
    return response.json();
  }
  function mount(auth){
    if(!auth||auth.role!=="student"||document.getElementById("egKnowledgeAssistant"))return;
    const classId=String(auth.classId||"");
    if(!classId)return;
    const launcher=el("button","eg-ka-launcher","✦ Ask your Study Library");
    launcher.type="button";launcher.setAttribute("aria-expanded","false");launcher.setAttribute("aria-controls","egKnowledgeAssistant");
    const panel=el("section","eg-ka-panel");panel.id="egKnowledgeAssistant";panel.hidden=true;panel.setAttribute("aria-label","Student Knowledge Assistant");
    const header=el("div","eg-ka-header"),heading=el("div","eg-ka-heading");
    heading.append(el("strong","","Study Assistant"),el("span","","Class "+classId+" · Published learning sources"));
    const close=el("button","eg-ka-close","×");close.type="button";close.setAttribute("aria-label","Close assistant");header.append(heading,close);
    const messages=el("div","eg-ka-messages");messages.setAttribute("aria-live","polite");
    const welcome=el("article","eg-ka-message eg-ka-bot");welcome.textContent="Hi! Ask me about a chapter, concept, formula or revision topic. I search the published Study Library and Visual Revision Boards for your class and show the sources I used.";
    messages.appendChild(welcome);
    const form=el("form","eg-ka-form"),input=el("input","eg-ka-input");input.type="search";input.placeholder="Ask about a topic…";input.maxLength=240;input.setAttribute("aria-label","Ask a study question");input.required=true;
    const send=el("button","eg-ka-send","Ask");send.type="submit";form.append(input,send);
    const status=el("p","eg-ka-status","Answers are grounded in published material. No question or student record is sent to an AI service.");
    panel.append(header,messages,form,status);document.body.append(launcher,panel);
    let index=[],loading=true,lastQuery="";
    const toggle=open=>{panel.hidden=!open;launcher.setAttribute("aria-expanded",String(open));if(open)input.focus();};
    launcher.addEventListener("click",()=>toggle(panel.hidden));close.addEventListener("click",()=>toggle(false));
    const addMessage=(text,kind)=>{const message=el("article","eg-ka-message "+(kind==="user"?"eg-ka-user":"eg-ka-bot"));message.textContent=text;messages.appendChild(message);messages.scrollTop=messages.scrollHeight;return message;};
    async function initialise(){
      try{
        const [visual,manifest]=await Promise.all([loadJson("./data/visual-revision.json"),loadJson("./data/knowledge-base.json")]);
        index=window.ExamGuruKnowledgeAssistantModel.buildIndex(visual,manifest,classId);
        loading=false;
        status.textContent=index.length+" published learning entries indexed for Class "+classId+". Search stays in this browser.";
      }catch(error){loading=false;status.textContent="The learning catalogue could not be loaded. Please refresh and try again.";addMessage("I couldn't load the published knowledge library just now. Please refresh the page and try again.","bot");}
    }
    form.addEventListener("submit",event=>{
      event.preventDefault();const query=input.value.trim();if(!query)return;
      addMessage(query,"user");input.value="";lastQuery=query;
      if(loading){addMessage("The learning library is still loading. Please try again in a moment.","bot");return;}
      const results=window.ExamGuruKnowledgeAssistantModel.search(index,query,5);
      const response=window.ExamGuruKnowledgeAssistantModel.answer(results,query);
      const message=addMessage(response.text,"bot");
      if(response.sources.length){
        const sources=el("div","eg-ka-sources");
        response.sources.forEach(source=>{
          const link=el("a","eg-ka-source",source.title+(source.chapter?" · "+source.chapter:""));
          link.href=source.path;link.target=source.path.startsWith("http")?"_blank":"_self";
          if(link.target==="_blank")link.rel="noopener noreferrer";
          sources.appendChild(link);
        });
        message.appendChild(sources);
      }
      messages.scrollTop=messages.scrollHeight;
    });
    initialise();
  }
  window.addEventListener("examguru-auth-state-ready",event=>mount(event.detail||window.ExamGuruAuthState));
  if(window.ExamGuruAuthState)mount(window.ExamGuruAuthState);
})();