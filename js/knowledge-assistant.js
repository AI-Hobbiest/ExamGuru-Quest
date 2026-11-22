/* Live, server-backed Ask ExamGuru. No browser-side knowledge index or data cache. */
(() => {
  "use strict";
  if(window.__examGuruKnowledgeAssistantLoaded&&window.ExamGuruKnowledgeAssistant)return;
  window.__examGuruKnowledgeAssistantLoaded=true;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const ROLE_LABELS={admin:"Platform Admin",platform_admin:"Platform Admin",school_admin:"Institution Admin",teacher:"Teacher",hod:"HOD",institution_viewer:"Institution Viewer",parent:"Parent / Guardian",student:"Student"};
  function addFallback(auth,message){
    let link=document.getElementById("egKnowledgeAssistantFallback");
    if(!link){link=el("a","eg-ka-fallback");link.id="egKnowledgeAssistantFallback";document.body.appendChild(link);}
    link.href="./help.html";link.textContent="Ask ExamGuru unavailable · help";
    link.setAttribute("aria-label","Ask ExamGuru live service unavailable. Open Help.");
    link.dataset.egAssistantFailure="live-service";if(message)link.title=message;
  }
  function friendlyError(error){
    const message=String(error&&error.message||"");
    if(/not configured|C10_API_BASE|Cloudflare API/i.test(message))return "The live Ask ExamGuru service is not connected yet. The platform API must be deployed and configured before I can retrieve live data. No browser-local copy will be used.";
    if(/sign in|required|session expired|401/i.test(message))return "Your secure server session is missing or expired. Sign in through the central ExamGuru account service, then try again.";
    if(/permission|forbidden|403|role|workspace/i.test(message))return "Your current role or workspace does not have permission to access this information.";
    if(/temporarily unavailable|503|cannot reach|network|fetch/i.test(message))return "The live data service is temporarily unavailable. Please retry in a moment.";
    if(/422|connector|more specific/i.test(message))return message;
    if(/400|300 characters/i.test(message))return message;
    return "I couldn't complete that live request. Please try again; if it continues, share this question with the platform administrator.";
  }
  function loadScriptOnce(id,src){\n    return new Promise((resolve,reject)=>{\n      const existing=document.getElementById(id);if(existing&&existing.dataset.egLoaded==="true"){resolve();return;}if(existing)existing.remove();\n      const script=document.createElement("script");script.id=id;script.async=false;script.src=src;script.onload=()=>{script.dataset.egLoaded="true";resolve();};script.onerror=()=>{script.remove();reject(new Error("Unable to load "+src));};document.head.appendChild(script);\n    });\n  }\n  async function ensureApiClient(){\n    if(window.C10Api)return;\n    const shell=document.querySelector("script[src*=\\\"app-shell.js\\\"]");\n    const base=new URL("../",shell?.src||location.href);\n    await loadScriptOnce("egAssistantApiConfig",new URL("./js/api-config.js",base).href);\n    await loadScriptOnce("egAssistantApiClient",new URL("./js/api-client.js",base).href);\n    if(!window.C10Api)throw new Error("Central API client did not initialise.");\n  }\n  function mount(auth){
    if(!auth||["guest","student_pending"].includes(auth.role)||document.getElementById("egKnowledgeAssistant"))return;
    const role=auth.role==="admin"?"platform_admin":(auth.institutionRole||auth.role||"");
    const label=ROLE_LABELS[role]||"ExamGuru";
    const launcher=el("button","eg-ka-launcher","✦ Ask ExamGuru");
    launcher.type="button";launcher.setAttribute("aria-expanded","false");launcher.setAttribute("aria-controls","egKnowledgeAssistant");
    const panel=el("section","eg-ka-panel");panel.id="egKnowledgeAssistant";panel.hidden=true;panel.setAttribute("aria-label",label+" live assistant");
    const header=el("div","eg-ka-header"),heading=el("div","eg-ka-heading");
    heading.append(el("strong","","Ask ExamGuru"),el("span","",label+" · Live assistant"));
    const close=el("button","eg-ka-close","×");close.type="button";close.setAttribute("aria-label","Close assistant");header.append(heading,close);
    const messages=el("div","eg-ka-messages");messages.setAttribute("aria-live","polite");
    const welcome=el("article","eg-ka-message eg-ka-bot");welcome.textContent="Ask about platform data, question banks, institutional information or your role's permitted learning resources. Answers are retrieved live from authorised services.";messages.appendChild(welcome);
    const form=el("form","eg-ka-form"),input=el("input","eg-ka-input");input.type="search";input.placeholder="Ask ExamGuru…";input.maxLength=300;input.setAttribute("aria-label","Ask ExamGuru");input.required=true;
    const send=el("button","eg-ka-send","Ask");send.type="submit";form.append(input,send);
    const status=el("p","eg-ka-status","Live retrieval only · no browser-side knowledge cache.");
    panel.append(header,messages,form,status);document.body.append(launcher,panel);
    const toggle=open=>{panel.hidden=!open;launcher.setAttribute("aria-expanded",String(open));if(open)input.focus();};
    launcher.addEventListener("click",()=>toggle(panel.hidden));close.addEventListener("click",()=>toggle(false));
    const addMessage=(text,kind)=>{const message=el("article","eg-ka-message "+(kind==="user"?"eg-ka-user":"eg-ka-bot"));message.textContent=text;messages.appendChild(message);messages.scrollTop=messages.scrollHeight;return message;};
    form.addEventListener("submit",async event=>{
      event.preventDefault();const query=input.value.trim();if(!query)return;
      addMessage(query,"user");input.value="";send.disabled=true;send.textContent="…";status.textContent="Contacting the live ExamGuru service…";
      try{
        if(!window.C10Api||!window.C10Api.isConfigured())throw new Error("Live API not configured");
        if(!window.C10Api.isAuthenticated())throw new Error("Secure server sign in required");
        const result=await window.C10Api.request("/api/assistant/query",{method:"POST",body:{query}});
        if(!result||!result.answer)throw new Error("The live service returned an empty response.");
        const message=addMessage(result.answer,"bot");
        if(Array.isArray(result.sources)&&result.sources.length){
          const sources=el("div","eg-ka-sources");
          result.sources.forEach(source=>{
            const item=el(source.url?"a":"span","eg-ka-source",source.title||"Source");
            if(source.url){item.href=source.url;item.target="_blank";item.rel="noopener noreferrer";}
            sources.appendChild(item);
          });
          message.appendChild(sources);
        }
        status.textContent="Live answer · "+(result.generatedAt?new Date(result.generatedAt).toLocaleString():"just now");
      }catch(error){
        addMessage(friendlyError(error),"bot");status.textContent="Live request was not completed.";
        if(/not configured|sign in|required|session expired/i.test(String(error&&error.message||"")))addFallback(auth,String(error.message||error));
      }finally{send.disabled=false;send.textContent="Ask";messages.scrollTop=messages.scrollHeight;}
    });
  }
  window.ExamGuruKnowledgeAssistant=Object.freeze({mount(auth){const before=!!document.getElementById("egKnowledgeAssistant");mount(auth);return before||!!document.getElementById("egKnowledgeAssistant");}});
  window.addEventListener("examguru-auth-state-ready",event=>mount(event.detail||window.ExamGuruAuthState));
  if(window.ExamGuruAuthState)mount(window.ExamGuruAuthState);
})();
