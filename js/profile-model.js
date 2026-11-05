/* Profile model and India State/UT options for C10 Playground Phase 3. */
(() => {
  "use strict";
  const STATES_AND_UTS = [
  {
    "name": "Andhra Pradesh",
    "type": "State"
  },
  {
    "name": "Arunachal Pradesh",
    "type": "State"
  },
  {
    "name": "Assam",
    "type": "State"
  },
  {
    "name": "Bihar",
    "type": "State"
  },
  {
    "name": "Chhattisgarh",
    "type": "State"
  },
  {
    "name": "Goa",
    "type": "State"
  },
  {
    "name": "Gujarat",
    "type": "State"
  },
  {
    "name": "Haryana",
    "type": "State"
  },
  {
    "name": "Himachal Pradesh",
    "type": "State"
  },
  {
    "name": "Jharkhand",
    "type": "State"
  },
  {
    "name": "Karnataka",
    "type": "State"
  },
  {
    "name": "Kerala",
    "type": "State"
  },
  {
    "name": "Madhya Pradesh",
    "type": "State"
  },
  {
    "name": "Maharashtra",
    "type": "State"
  },
  {
    "name": "Manipur",
    "type": "State"
  },
  {
    "name": "Meghalaya",
    "type": "State"
  },
  {
    "name": "Mizoram",
    "type": "State"
  },
  {
    "name": "Nagaland",
    "type": "State"
  },
  {
    "name": "Odisha",
    "type": "State"
  },
  {
    "name": "Punjab",
    "type": "State"
  },
  {
    "name": "Rajasthan",
    "type": "State"
  },
  {
    "name": "Sikkim",
    "type": "State"
  },
  {
    "name": "Tamil Nadu",
    "type": "State"
  },
  {
    "name": "Telangana",
    "type": "State"
  },
  {
    "name": "Tripura",
    "type": "State"
  },
  {
    "name": "Uttar Pradesh",
    "type": "State"
  },
  {
    "name": "Uttarakhand",
    "type": "State"
  },
  {
    "name": "West Bengal",
    "type": "State"
  },
  {
    "name": "Andaman and Nicobar Islands",
    "type": "Union Territory"
  },
  {
    "name": "Chandigarh",
    "type": "Union Territory"
  },
  {
    "name": "Dadra and Nagar Haveli and Daman and Diu",
    "type": "Union Territory"
  },
  {
    "name": "Delhi",
    "type": "Union Territory"
  },
  {
    "name": "Jammu and Kashmir",
    "type": "Union Territory"
  },
  {
    "name": "Ladakh",
    "type": "Union Territory"
  },
  {
    "name": "Lakshadweep",
    "type": "Union Territory"
  },
  {
    "name": "Puducherry",
    "type": "Union Territory"
  }
];
  const now = () => new Date().toISOString();
  const studentIdFor = profileId => {
    const token=String(profileId||"").replace(/[^a-z0-9]/gi,"").toUpperCase();
    return "C10-"+(token.slice(0,8)||"LEARNER");
  };
  function normalizeProfile(input, generatedId) {
    const source=input&&typeof input==="object"?input:{};
    const profileId=typeof source.profileId==="string"&&source.profileId?source.profileId:generatedId;
    const createdAt=source.createdAt||now();
    return {
      schemaVersion:1,
      kind:"student-profile",
      profileId,
      studentId:source.studentId||studentIdFor(profileId),
      displayName:typeof source.displayName==="string"?source.displayName:"",
      school:typeof source.school==="string"?source.school:"",
      classLevel:String(source.classLevel||"10"),
      city:typeof source.city==="string"?source.city:"",
      state:typeof source.state==="string"?source.state:"",
      createdAt,
      updatedAt:source.updatedAt||createdAt
    };
  }
  function validateProfile(profile) {
    return !!profile && profile.schemaVersion===1 && profile.kind==="student-profile" &&
      typeof profile.profileId==="string" && profile.profileId.length>0 &&
      /^C10-[A-Z0-9-]{4,20}$/.test(String(profile.studentId||"")) &&
      typeof profile.displayName==="string" && profile.displayName.trim().length>0 &&
      typeof profile.school==="string" && profile.school.trim().length>0 &&
      typeof profile.classLevel==="string" && /^[A-Za-z0-9_-]{1,20}$/.test(profile.classLevel) &&
      typeof profile.city==="string" && profile.city.trim().length>0 &&
      STATES_AND_UTS.some(item=>item.name===profile.state) &&
      typeof profile.createdAt==="string" && typeof profile.updatedAt==="string";
  }
  function isValidBackup(bundle) {
    if(!bundle||bundle.schemaVersion!==1||bundle.kind!=="c10-playground-backup"||
       !validateProfile(bundle.profile)||!bundle.subjectData||typeof bundle.subjectData!=="object")return false;
    const legacySubjects=["science","mathematics","english","social-science","hindi"],banksByClass={"3":["class-3-mathematics","class-3-mathematics-sof","class-3-english"],"6":["class-6-science","class-6-mathematics","class-6-english","class-6-social-science","class-6-science-sof","class-6-mathematics-sof","class-6-english-sof"],"10":legacySubjects};
    const expected=banksByClass[String(bundle.profile.classLevel)]||legacySubjects,provided=Object.keys(bundle.subjectData);
    const hasCurrent=expected.every(subject=>Object.prototype.hasOwnProperty.call(bundle.subjectData,subject));
    const legacyOnly=legacySubjects.every(subject=>Object.prototype.hasOwnProperty.call(bundle.subjectData,subject))&&provided.every(subject=>legacySubjects.includes(subject));
    if(!hasCurrent&&!legacyOnly)return false;
    if(bundle.studyLibraryProgress!==undefined){
      const study=bundle.studyLibraryProgress;
      if(!study||study.schemaVersion!==1||study.kind!=="study-library-progress"||
         !Array.isArray(study.completedResourceIds)||!study.completedResourceIds.every(id=>typeof id==="string")||
         !Array.isArray(study.bookmarkedResourceIds)||!study.bookmarkedResourceIds.every(id=>typeof id==="string"))return false;
    }
    if(bundle.learningLibrary!==undefined){
      const library=bundle.learningLibrary;
      if(!library||library.schemaVersion!==1||library.kind!=="learning-library"||
         !Array.isArray(library.mistakes)||!Array.isArray(library.bookmarks)||!Array.isArray(library.responses))return false;
      for(const item of [...library.mistakes,...library.bookmarks]){
        if(!item||typeof item.questionKey!=="string"||typeof item.question!=="string"||
           typeof item.subjectId!=="string"||!Array.isArray(item.options)||
           !Number.isInteger(item.answer)&&item.answer!==null)return false;
      }
      for(const response of library.responses){
        if(!response||typeof response.responseId!=="string"||typeof response.questionKey!=="string"||
           typeof response.subjectId!=="string"||!["answered","skipped"].includes(response.status))return false;
      }
    }
    const allowed=new Set([...legacySubjects,...banksByClass["3"],...banksByClass["6"]]);
    for(const [subject,data] of Object.entries(bundle.subjectData)){
      if(!allowed.has(subject)||!data||typeof data!=="object")return false;
      if(data.progress && (!Array.isArray(data.progress.missed)||!Array.isArray(data.progress.attempts)||
         !Number.isFinite(data.progress.answered)||!Number.isFinite(data.progress.correct)))return false;
      if(data.ledger && (!Array.isArray(data.ledger.attempts)||!Array.isArray(data.ledger.answerRecords)||
         !(data.ledger.activeAttempt===null||typeof data.ledger.activeAttempt==="object")))return false;
    }
    return true;
  }
  window.C10ProfileModel=Object.freeze({
    schemaVersion:1,statesAndUTs:STATES_AND_UTS.map(item=>({...item})),
    studentIdFor,normalizeProfile,validateProfile,isValidBackup
  });
})();
