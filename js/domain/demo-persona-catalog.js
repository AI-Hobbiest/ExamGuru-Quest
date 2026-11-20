/* Read-only validation and lookup for versioned, non-secret demo persona templates. */
(() => {
  "use strict";
  const clone=value=>JSON.parse(JSON.stringify(value));
  const BASE_ROLES=new Set(["school_admin","institution_viewer","teacher","parent","student"]);
  function createDemoPersonaCatalog(source){
    const data=typeof source==="string"?JSON.parse(source):source;
    if(!data||data.schemaVersion!==1||data.kind!=="examguru-demo-persona-catalogue"||!Array.isArray(data.personas))throw new TypeError("A valid demo persona catalogue is required.");
    const entries=new Map();
    for(const persona of data.personas){
      if(!persona||!String(persona.templateId||"").trim()||!Number.isInteger(persona.version)||persona.version<1)throw new TypeError("Every demo persona needs a stable ID and positive version.");
      if(entries.has(persona.templateId))throw new TypeError("Duplicate demo persona template ID: "+persona.templateId);
      if(!Array.isArray(persona.roles)||!persona.roles.length||persona.roles.some(role=>!BASE_ROLES.has(role)&&role!=="hod"))throw new TypeError("Demo persona contains a prohibited role.");
      if(persona.roles.includes("hod")&&!persona.roles.includes("teacher"))throw new TypeError("HOD persona must also include Teacher.");
      if(!String(persona.dataProfile||"").trim())throw new TypeError("Demo persona needs a synthetic data profile.");
      entries.set(persona.templateId,clone(persona));
    }
    return Object.freeze({
      version:String(data.catalogueVersion||"1"),
      list(options){const includeInactive=!!(options&&options.includeInactive);return [...entries.values()].filter(x=>includeInactive||x.status==="active").map(clone);},
      get(id){const value=entries.get(String(id||""));return value&&value.status==="active"?clone(value):null;}
    });
  }
  const api=Object.freeze({createDemoPersonaCatalog});
  globalThis.ExamGuruDemoPersonaCatalog=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
