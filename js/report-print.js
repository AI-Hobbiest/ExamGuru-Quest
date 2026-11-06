/* Shared, mobile-friendly browser print flow for ExamGuru reports. */
(() => {
  "use strict";
  function open(html,options={}){
    if(typeof html!=="string"||!html.trim())return{ok:false,reason:"empty-report"};
    let reportWindow=null;
    // Must be called synchronously from the report button's click handler.
    // Do not pass noopener/noreferrer here: browsers return null for that mode.
    try{reportWindow=window.open("about:blank","_blank");}catch(_){}
    if(!reportWindow)return{ok:false,reason:"popup-blocked"};
    try{
      try{reportWindow.opener=null;}catch(_){}
      let printStarted=false;
      const triggerPrint=()=>{
        if(printStarted)return;
        printStarted=true;
        try{
          if(reportWindow.closed)return;
          reportWindow.focus();
          if(typeof reportWindow.print==="function")reportWindow.print();
        }catch(_){}
      };
      if(typeof reportWindow.addEventListener==="function"){
        reportWindow.addEventListener("load",()=>window.setTimeout(triggerPrint,Number(options.printDelayMs)||450),{once:true});
      }
      const doc=reportWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      // Safari/iOS may delay the load event for a newly opened tab; retain a
      // fallback timer and let the report's own Print button remain available.
      window.setTimeout(triggerPrint,Number(options.fallbackDelayMs)||900);
      return{ok:true};
    }catch(error){
      try{reportWindow.close();}catch(_){}
      return{ok:false,reason:"report-write-failed",error:String(error&&error.message||error)};
    }
  }
  window.C10ReportPrint=Object.freeze({open});
})();
