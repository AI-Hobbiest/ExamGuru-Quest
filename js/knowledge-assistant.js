/* Universal role-aware conversational knowledge entry point. */
(() => {
  "use strict";
  if(window.__examGuruKnowledgeAssistantLoaded)return;
  window.__examGuruKnowledgeAssistantLoaded=true;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function addFallback(auth,message){
    if(document.getElementById("egKnowledgeAssistantFallback"))return;
    const link=el("a","eg-ka-fallback","Open Knowledge & Help");
    link.id="egKnowledgeAssistantFallback";link.href=auth?.role==="student"?"./study.html":"./help.html";
    link.setAttribute("aria-label","Open the traditional Knowledge and Help pages");
    if(message)link.title=message;
    document.body.appendChild(link);
  }
  async function loadJson(path){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok)throw new Error("Could not load "+path);
    return response.json();
  }
  function mount(auth){
    if(!auth||["guest","student_pending"].includes(auth.role)||document.getElementById("egKnowledgeAssistant"))return;
    const model=window.ExamGuruKnowledgeAssistantModel;
    const profile=model&&model.resolveProfile(auth);
    if(!profile)return;
    if(typeof fetch!=="function"||typeof Promise!=="function"||!document.createElement){
      addFallback(auth,"Conversational search is not supported in this browser.");
      return;
    }
    const launcher=el("button","eg-ka-launcher","✦ Ask ExamGuru");
    launcher.type="button";launcher.setAttribute("aria-expanded","false");launcher.setAttribute("aria-controls","egKnowledgeAssistant");
    const panel=el("section","eg-ka-panel");panel.id="egKnowledgeAssistant";panel.hidden=true;panel.setAttribute("aria-label",profile.label+" conversational assistant");
    const header=el("div","eg-ka-header"),heading=el("div","eg-ka-heading");
    heading.append(el("strong","","Ask ExamGuru"),el("span","",profile.label+" · "+(profile.classId?"Class "+profile.classId:profile.institutionId?"Institution workspace":"Platform workspace")));
    const close=el("button","eg-ka-close","×");close.type="button";close.setAttribute("aria-label","Close assistant");header.append(heading,close);
    const messages=el("div","eg-ka-messages");messages.setAttribute("aria-live","polite");
    const welcome=el("article","eg-ka-message eg-ka-bot");welcome.textContent=profile.greeting;messages.appendChild(welcome);
    const form=el("form","eg-ka-form"),input=el("input","eg-ka-input");input.type="search";input.placeholder="Ask ExamGuru…";input.maxLength=300;input.setAttribute("aria-label","Ask ExamGuru");input.required=true;
    const send=el("button","eg-ka-send","Ask");send.type="submit";form.append(input,send);
    const status=el("p","eg-ka-status","Searching only published material available to this workspace. Actions that change records are not enabled in this GitHub-only phase.");
    panel.append(header,messages,form,status);document.body.append(launcher,panel);
    let index=[],loading=true;
    const toggle=open=>{panel.hidden=!open;launcher.setAttribute("aria-expanded",String(open));if(open)input.focus();};
    launcher.addEventListener("click",()=>toggle(panel.hidden));close.addEventListener("click",()=>toggle(false));
    const addMessage=(text,kind)=>{const message=el("article","eg-ka-message "+(kind==="user"?"eg-ka-user":"eg-ka-bot"));message.textContent=text;messages.appendChild(message);messages.scrollTop=messages.scrollHeight;return message;};
    async function initialise(){
      try{
        const [visual,manifest]=await Promise.all([loadJson("./data/visual-revision.json"),loadJson("./data/knowledge-base.json")]);
        index=model.buildIndex(visual,manifest,auth);loading=false;
        status.textContent=index.length+" published entries available to the "+profile.label+" workspace. Search stays in this browser.";
      }catch(error){
        loading=false;status.textContent="The conversational catalogue is unavailable in this browser session.";
        addMessage("I couldn't load the published knowledge catalogue. You can still use the traditional learning and help pages.","bot");
        addFallback(auth,"Knowledge catalogue unavailable");
      }
    }
    form.addEventListener("submit",event=>{
      event.preventDefault();const query=input.value.trim();if(!query)return;
      addMessage(query,"user");input.value="";
      if(loading){addMessage("The knowledge catalogue is still loading. Please try again in a moment.","bot");return;}
      const results=model.search(index,query,5),response=model.answer(results,query,profile),message=addMessage(response.text,"bot");
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
  window.ExamGuruKnowledgeAssistant=Object.freeze({mount(auth){const before=!!document.getElementById("egKnowledgeAssistant");mount(auth);return before||!!document.getElementById("egKnowledgeAssistant");}});
  window.addEventListener("examguru-auth-state-ready",event=>mount(event.detail||window.ExamGuruAuthState));
  if(window.ExamGuruAuthState)mount(window.ExamGuruAuthState);
})();