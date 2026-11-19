/* Browser-local IAM directory for RBAC demonstration. Not authentication or a secure identity provider. */
(()=>{"use strict";
const KEY="examguru_iam_local_v1",ADMIN="Jayaprakashganathe@gmail.com",INST="TEST-INSTITUTION-001";
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&v.schemaVersion===1){let changed=false;(v.users||[]).forEach(u=>(u.roles||[]).forEach(r=>{if(r.institutionId&&!r.membershipId){r.membershipId=memberId(u.userId,r.role);changed=true;}}));if(changed)localStorage.setItem(KEY,JSON.stringify(v));return v;}}catch(_){}return null;}
function memberId(userId,role){return "MEM-"+String(userId).replace(/[^A-Z0-9]/gi,"").slice(-12).toUpperCase()+"-"+String(role).toUpperCase();}
function seed(){const userId="USR-PLATFORM-001";return {schemaVersion:1,users:[{userId,username:ADMIN,displayName:"Platform Administrator",status:"active",roles:[{role:"platform_admin",institutionId:null},...["school_admin","teacher","parent","student","institution_viewer"].map(role=>({role,institutionId:INST,membershipId:memberId(userId,role)}))]}],institutions:[{institutionId:INST,name:"Demo Academy (local test)",status:"active"}]};}
let state=read()||seed();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(_){return false;}}
if(!read())persist();
const api={
 key:KEY, getState(){return JSON.parse(JSON.stringify(state));},
 users(){return state.users.filter(u=>u.status==="active").map(u=>({...u,roles:[...(u.roles||[])]}));},
 findUser(id){return state.users.find(u=>u.userId===id)||null;},
 saveUser(user){const i=state.users.findIndex(u=>u.userId===user.userId);if(i<0)state.users.push(user);else state.users[i]=user;return persist();},
 createUser({username,displayName,roles=[]}){const clean=String(username||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)&&!/^[a-z0-9._-]{3,32}$/i.test(clean))throw Error("Enter a valid email or username.");if(state.users.some(u=>u.username.toLowerCase()===clean))throw Error("That username already exists in this browser directory.");const userId="USR-LOCAL-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();const user={userId,username:clean,displayName:String(displayName||clean).trim(),status:"active",roles:roles.map(r=>({...r,membershipId:r.institutionId?memberId(userId,r.role):null}))};state.users.push(user);if(!persist())throw Error("Browser storage is unavailable; the user was not saved.");return user;},
 assignRole(userId,role,institutionId){const user=api.findUser(userId);if(!user)throw Error("Select an existing user.");user.roles=user.roles||[];if(user.roles.some(r=>r.role===role&&r.institutionId===(institutionId||null)))throw Error("This role is already assigned.");user.roles.push({role,institutionId:institutionId||null,membershipId:institutionId?memberId(userId,role):null});if(!persist())throw Error("Browser storage is unavailable; the role was not saved.");return user;},
 setStatus(userId,status){const user=api.findUser(userId);if(!user)throw Error("User not found.");user.status=status;if(!persist())throw Error("Browser storage is unavailable.");return user;},
 institutionId:INST, getActiveRole(username,preview){const user=state.users.find(u=>u.username.toLowerCase()===String(username||"").toLowerCase());if(!user)return [];return (user.roles||[]).filter(r=>r.role==="platform_admin"||!r.institutionId||r.institutionId===INST).map(r=>r.role);},
};window.ExamGuruLocalIAM=api;
})();