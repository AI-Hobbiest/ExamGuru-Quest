/* Study Library model — published learning resources and local learner progress. */
(() => {
  "use strict";
  const TYPES = Object.freeze({
    "textbook-pdf":"Textbook / reading",
    "question-bank-pdf":"Question-bank PDF",
    "image-reference-pdf":"Image reference",
    notes:"Notes / study guide",
    "image-asset":"Visual resource",
    other:"Other resource"
  });
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function safePath(value) {
    const path=String(value||"").trim();
    return /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._~!%()-]+(?:\/[A-Za-z0-9._~!%()-]+)*$/.test(path);
  }
  function isValidResource(item) {
    return !!item && typeof item==="object" &&
      typeof item.resourceId==="string" && item.resourceId.trim().length>0 &&
      typeof item.title==="string" && item.title.trim().length>0 &&
      typeof item.type==="string" && Object.prototype.hasOwnProperty.call(TYPES,item.type) &&
      safePath(item.path) &&
      (item.status===undefined || ["draft","published"].includes(item.status)) &&
      (item.classIds===undefined || (Array.isArray(item.classIds) && item.classIds.every(id=>/^[A-Za-z0-9_-]{1,20}$/.test(String(id))))) &&
      (item.subject===undefined || typeof item.subject==="string") &&
      (item.chapter===undefined || typeof item.chapter==="string") &&
      (item.summary===undefined || typeof item.summary==="string");
  }
  function isValidManifest(value) {
    return !!value && value.schemaVersion===1 && value.kind==="knowledge-base-manifest" &&
      Array.isArray(value.resources) && value.resources.every(isValidResource);
  }
  function visibleResources(manifest,classId) {
    if(!isValidManifest(manifest)) return [];
    const current=String(classId||"");
    return manifest.resources
      .filter(item=>item.status==="published")
      .filter(item=>!Array.isArray(item.classIds)||!item.classIds.length||item.classIds.map(String).includes(current))
      .map(clone);
  }
  function filterResources(resources,filters={}) {
    const query=String(filters.query||"").trim().toLowerCase();
    const subject=String(filters.subject||"all");
    const type=String(filters.type||"all");
    const status=String(filters.status||"all");
    return (Array.isArray(resources)?resources:[]).filter(item=>{
      if(subject!=="all" && String(item.subject||"")!==subject) return false;
      if(type!=="all" && String(item.type||"")!==type) return false;
      if(status==="bookmarked" && !filters.bookmarkedIds?.includes(String(item.resourceId))) return false;
      if(status==="completed" && !filters.completedIds?.includes(String(item.resourceId))) return false;
      if(query) {
        const haystack=[item.title,item.subject,item.chapter,item.summary,item.type].join(" ").toLowerCase();
        if(!haystack.includes(query)) return false;
      }
      return true;
    }).sort((a,b)=>String(a.subject||"").localeCompare(String(b.subject||"")) ||
      String(a.chapter||"").localeCompare(String(b.chapter||"")) ||
      String(a.title||"").localeCompare(String(b.title||"")));
  }
  function toggleId(list,id) {
    const values=new Set(Array.isArray(list)?list.map(String):[]);
    const key=String(id);
    if(values.has(key)) values.delete(key); else values.add(key);
    return [...values];
  }
  function normalizeProgress(value) {
    const source=value&&typeof value==="object"?value:{};
    return {
      schemaVersion:1,
      kind:"study-library-progress",
      completedResourceIds:[...new Set((Array.isArray(source.completedResourceIds)?source.completedResourceIds:[]).map(String))],
      bookmarkedResourceIds:[...new Set((Array.isArray(source.bookmarkedResourceIds)?source.bookmarkedResourceIds:[]).map(String))]
    };
  }
  window.C10StudyModel=Object.freeze({TYPES,safePath,isValidResource,isValidManifest,visibleResources,filterResources,toggleId,normalizeProgress});
})();
