/* Browser-local IAM directory for RBAC demonstration. Not authentication or a secure identity provider. */
(()=>{"use strict";
const KEY="examguru_iam_local_v1",ADMIN="Jayaprakashganathe@gmail.com",INST="TEST-INSTITUTION-001";
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&v.schemaVersion===1)return v;}catch(_){}return null;}
function seed(){return {schemaVersion:1,users:[{userId:"USR-PLATFORM-001",username:ADMIN,displayName:"Platform Administrator",status:"active",roles:[{role:"platform_admin",institutionId:null},{role:"school_admin",institutionId:INST},{role:"teacher",institutionId:INST},{role:"parent",institutionId:INST},{role:"student",institutionId:INST},{role:"institution_viewer",institutionId:INST}]}],institutions:[{institutionId:INST,name:"Demo Academy (local test)",status:"active"}]};}
let state=read()||seed();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(_){return false;}}
if(!read())persist();
const api={
 key:KEY, getState(){return JSON.parse(JSON.stringify(state));},
 users(){return state.users.filter(u=>u.status==="active").map(u=>({...u,roles:[...(u.roles||[])]}));},
 findUser(id){return state.users.find(u=>u.userId===id)||null;},
 saveUser(user){const i=state.users.findIndex(u=>u.userId===user.userId);if(i<0)state.users.push(user);else state.users[i]=user;return persist();},
 createUser({username,displayName,roles=[]}){const clean=String(username||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)&&!/^[a-z0-9._-]{3,32}$/i.test(clean))throw Error("Enter a valid email or username.");if(state.users.some(u=>u.username.toLowerCase()===clean))throw Error("That username already exists in this browser directory.");const user={userId:"USR-LOCAL-"+Date.now().toString(36).toUpperCase(),username:clean,displayName:String(displayName||clean).trim(),status:"active",roles};state.users.push(user);if(!persist())throw Error("Browser storage is unavailable; the user was not saved.");return user;},
 assignRole(userId,role,institutionId){const user=api.findUser(userId);if(!user)throw Error("Select an existing user.");user.roles=user.roles||[];if(user.roles.some(r=>r.role===role&&r.institutionId===(institutionId||null)))throw Error("This role is already assigned.");user.roles.push({role,institutionId:institutionId||null});if(!persist())throw Error("Browser storage is unavailable; the role was not saved.");return user;},
 setStatus(userId,status){const user=api.findUser(userId);if(!user)throw Error("User not found.");user.status=status;if(!persist())throw Error("Browser storage is unavailable.");return user;},
 institutionId:INST, getActiveRole(username,preview){const user=state.users.find(u=>u.username.toLowerCase()===String(username||"").toLowerCase());if(!user)return [];return (user.roles||[]).filter(r=>r.role==="platform_admin"||!r.institutionId||r.institutionId===INST).map(r=>r.role);},
};window.ExamGuruLocalIAM=api;
})();