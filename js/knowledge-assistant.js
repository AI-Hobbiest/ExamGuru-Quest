/* GitHub-only Ask ExamGuru: retrieve published repository content in the browser.
   Static files are public. Role filters improve relevance only; they are NOT an authorization boundary. */
(() => {
  "use strict";
  if(window.__examGuruKnowledgeAssistantLoaded&&window.ExamGuruKnowledgeAssistant)return;
  window.__examGuruKnowledgeAssistantLoaded=true;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const ROLE_LABELS={admin:"Platform Admin",platform_admin:"Platform Admin",school_admin:"Institution Admin",teacher:"Teacher",hod:"HOD",institution_viewer:"Institution Viewer",parent:"Parent / Guardian",student:"Student"};
  const script=document.currentScript;
  const shell=document.querySelector('script[src*="app-shell.js"]');
  const appBase=new URL("../",shell?.src||script?.src||location.href);
  const asset=path=>new URL(path,appBase).href;
  let indexPromise=null;
  async function readJson(path){
    const response=await fetch(asset(path),{cache:"no-cache",credentials:"same-origin"});
    if(!response.ok)throw new Error("Unable to load published GitHub file: "+path+" ("+response.status+")");
    return response.json();
  }
  async function loadIndex(auth){
    if(!window.ExamGuruKnowledgeAssistantModel)throw new Error("Knowledge retrieval model is unavailable.");
    const [visual,manifest]=await Promise.all([
      readJson("data/visual-revision.json").catch(()=>null),
      readJson("data/knowledge-base.json").catch(()=>null)
    ]);
    if(!visual&&!manifest)throw new Error("No published GitHub knowledge files could be loaded.");
    return window.ExamGuruKnowledgeAssistantModel.buildIndex(visual,manifest,auth);
  }
  function addFallback(message){
    let link=document.getElementById("egKnowledgeAssistantFallback");
    if(!link){link=el("a","eg-ka-fallback");link.id="egKnowledgeAssistantFallback";document.body.appendChild(link);}
    link.href="./help.html";link.textContent="Ask ExamGuru unavailable · help";
    link.setAttribute("aria-label","Ask ExamGuru could not load GitHub-hosted knowledge. Open Help.");
    link.dataset.egAssistantFailure="github-content";if(message)link.title=message;
  }
  function sourceHref(path){
    if(!path)return null;
    const url=new URL(path,appBase);
    return url.origin===appBase.origin?url.href:null;
  }
  async function answerQuestion(query,auth){
    const q=query.toLowerCase();
    if(/\b(how many|count|total|number)\b/.test(q)&&/\b(question|questions|qbank|bank)\b/.test(q)&&/\b(class 10|grade 10)\b/.test(q)&&/\b(math|mathematics)\b/.test(q)){
      const bank=await readJson("data/exam-papers/question-banks/class-10-mathematics-2026-27-v1.json");
      const questions=Array.isArray(bank.questions)?bank.questions:[];
      const approved=questions.filter(item=>item.approvalStatus==="approved").length;
      return {text:"The GitHub-hosted Class 10 Mathematics Standard & Basic shared pool contains "+questions.length+" questions; "+approved+" are marked approved. Its current release status is "+String(bank.questionPoolStatus||"not specified")+". This is the published repository snapshot, not a live private database count.",sources:[{title:bank.title||"Class 10 Mathematics question bank",path:"data/exam-papers/question-banks/class-10-mathematics-2026-27-v1.json"}]};
    }
    const index=await loadIndex(auth);
    const model=window.ExamGuruKnowledgeAssistantModel;
    const results=model.search(index,query,5);
    const profile=model.resolveProfile(auth);
    const response=model.answer(results,query,profile);
    return {text:response.text,sources:response.sources.map(item=>({...item,path:item.path||""}))};
  }
  function mount(auth){
    if(!auth||["guest","student_pending"].includes(auth.role)||document.getElementById("egKnowledgeAssistant"))return;
    const role=auth.role==="admin"?"platform_admin":(auth.institutionRole||auth.role||"");
    const label=ROLE_LABELS[role]||"ExamGuru";
    const launcher=el("button","eg-ka-launcher","✦ Ask ExamGuru");
    launcher.type="button";launcher.setAttribute("aria-expanded","false");launcher.setAttribute("aria-controls","egKnowledgeAssistant");
    const panel=el("section","eg-ka-panel");panel.id="egKnowledgeAssistant";panel.hidden=true;panel.setAttribute("aria-label",label+" GitHub knowledge assistant");
    const header=el("div","eg-ka-header"),heading=el("div","eg-ka-heading");
    heading.append(el("strong","","Ask ExamGuru"),el("span","",label+" · GitHub knowledge"));
    const close=el("button","eg-ka-close","×");close.type="button";close.setAttribute("aria-label","Close assistant");header.append(heading,close);
    const messages=el("div","eg-ka-messages");messages.setAttribute("aria-live","polite");
    const welcome=el("article","eg-ka-message eg-ka-bot");welcome.textContent="Ask about published curriculum, Study Library resources and question-bank material stored in the ExamGuru GitHub repository. I search the latest published files available to this site. Private institution records and cross-user progress are not available in this GitHub-only version.";messages.appendChild(welcome);
    const form=el("form","eg-ka-form"),input=el("input","eg-ka-input");input.type="search";input.placeholder="Ask ExamGuru…";input.maxLength=300;input.setAttribute("aria-label","Ask ExamGuru");input.required=true;
    const send=el("button","eg-ka-send","Ask");send.type="submit";form.append(input,send);
    const status=el("p","eg-ka-status","GitHub-hosted published files · no external service.");
    panel.append(header,messages,form,status);document.body.append(launcher,panel);
    const toggle=open=>{panel.hidden=!open;launcher.setAttribute("aria-expanded",String(open));if(open)input.focus();};
    launcher.addEventListener("click",()=>toggle(panel.hidden));close.addEventListener("click",()=>toggle(false));
    const addMessage=(text,kind)=>{const message=el("article","eg-ka-message "+(kind==="user"?"eg-ka-user":"eg-ka-bot"));message.textContent=text;messages.appendChild(message);messages.scrollTop=messages.scrollHeight;return message;};
    form.addEventListener("submit",async event=>{
      event.preventDefault();const query=input.value.trim();if(!query)return;
      addMessage(query,"user");input.value="";send.disabled=true;send.textContent="…";status.textContent="Searching published GitHub files…";
      try{
        const result=await answerQuestion(query,auth);
        const message=addMessage(result.text,"bot");
        if(Array.isArray(result.sources)&&result.sources.length){
          const sources=el("div","eg-ka-sources");
          result.sources.forEach(source=>{
            const href=sourceHref(source.path);
            const item=el(href?"a":"span","eg-ka-source",source.title||"Source");
            if(href){item.href=href;item.target="_blank";item.rel="noopener noreferrer";}
            sources.appendChild(item);
          });
          message.appendChild(sources);
        }
        status.textContent="Repository retrieval · "+new Date().toLocaleString();
      }catch(error){
        addMessage("I couldn't load the relevant published GitHub material. Please retry, or open the Knowledge & Help pages directly. "+String(error&&error.message||""),"bot");
        status.textContent="GitHub file retrieval was not completed.";addFallback(String(error&&error.message||error));
      }finally{send.disabled=false;send.textContent="Ask";messages.scrollTop=messages.scrollHeight;}
    });
  }
  window.ExamGuruKnowledgeAssistant=Object.freeze({mount(auth){const before=!!document.getElementById("egKnowledgeAssistant");mount(auth);return before||!!document.getElementById("egKnowledgeAssistant");}});
  window.addEventListener("examguru-auth-state-ready",event=>mount(event.detail||window.ExamGuruAuthState));
  if(window.ExamGuruAuthState)mount(window.ExamGuruAuthState);
})();
