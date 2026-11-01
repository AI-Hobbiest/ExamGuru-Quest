/* Static account identity for the local-first ExamGuru MVP.
 * Convenience authentication only: GitHub Pages is static and published account files are public.
 */
(() => {
  "use strict";
  const STUDENT_FILE="./data/student-accounts.json", FAMILY_FILE="./data/family-access.json";
  const SESSION_KEY="c10playground_static_student_v1", DEFAULT_ITERATIONS=600000;
  function decodeBase64(value){const binary=atob(String(value||""));return Uint8Array.from(binary,c=>c.charCodeAt(0));}
  function encodeBase64(bytes){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
  function equalHash(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
  const normalizeUsername=value=>String(value||"").trim().toLowerCase();
  const validUsername=value=>/^[a-z0-9._-]{3,32}$/.test(normalizeUsername(value));
  function stableStudentId(account){return String(account&&account.studentId||("student-"+normalizeUsername(account&&account.username).replace(/[^a-z0-9_-]/g,"-")));}
  async function loadDatabase(){
    const response=await fetch(STUDENT_FILE,{cache:"no-store"});
    if(!response.ok)throw new Error("Student account file could not be loaded. Ask the administrator to check the published file.");
    const data=await response.json();
    if(!data||data.schemaVersion!==1||data.kind!=="c10-student-accounts"||!Array.isArray(data.accounts))throw new Error("Student account file is invalid.");
    return data;
  }
  async function loadFamilyDatabase(){
    const response=await fetch(FAMILY_FILE,{cache:"no-store"});
    if(!response.ok)throw new Error("Family access file is unavailable. Ask the administrator to publish data/family-access.json.");
    const data=await response.json();
    if(!data||data.schemaVersion!==1||data.kind!=="c10-family-access"||!Array.isArray(data.parents)||!Array.isArray(data.parentStudentLinks))throw new Error("Family access file is invalid.");
    return data;
  }
  async function deriveHash(password,saltText,iterations){
    if(!crypto||!crypto.subtle)throw new Error("This browser does not support password verification.");
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
    const bits=await crypto.subtle.deriveBits({name: "PBKDF2", salt: decodeBase64(saltText), iterations, hash: "SHA-256"},key,256);
    return encodeBase64(new Uint8Array(bits));
  }
  function publicView(row,role){
    if(role==="parent")return {username:row.username,role:"parent",parentId:String(row.parentId),displayName:String(row.displayName||row.username)};
    return {username:row.username,role:"student",studentId:stableStudentId(row),classId:String(row.classId||"10"),displayName:String(row.displayName||row.username)};
  }
  function readSession(){
    try{
      const value=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
      if(!value||typeof value.username!=="string")return null;
      return value.role==="parent"
        ?{username:value.username,role:"parent",parentId:String(value.parentId||""),displayName:String(value.displayName||value.username)}
        :{username:value.username,role:"student",studentId:String(value.studentId||stableStudentId(value)),classId:String(value.classId||"10"),displayName:String(value.displayName||value.username)};
    }catch(_){return null;}
  }
  async function login(usernameInput,password){
    const username=normalizeUsername(usernameInput);
    if(!validUsername(username)||typeof password!=="string"||!password)throw new Error("Enter a valid username and password.");
    const [students,family]=await Promise.all([loadDatabase(),loadFamilyDatabase()]);
    const student=students.accounts.find(item=>normalizeUsername(item.username)===username&&item.active!==false);
    const parent=family.parents.find(item=>normalizeUsername(item.username)===username&&item.active!==false);
    if((student&&parent)||(!student&&!parent))throw new Error("Invalid username or password.");
    const row=student||parent,iterations=Number(row.iterations||students.defaultIterations||family.defaultIterations||DEFAULT_ITERATIONS);
    if(!Number.isInteger(iterations)||iterations<10000||iterations>2000000)throw new Error("Invalid password configuration. Ask the administrator to reset this account.");
    if(!equalHash(await deriveHash(password,row.salt,iterations),row.passwordHash))throw new Error("Invalid username or password.");
    const account=publicView(row,parent?"parent":"student");
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(account));
    return {account};
  }
  async function restoreSession(){
    const current=readSession();if(!current)return null;
    try{
      if(current.role==="parent"){
        const family=await loadFamilyDatabase();
        const row=family.parents.find(item=>String(item.parentId)===current.parentId&&normalizeUsername(item.username)===normalizeUsername(current.username)&&item.active!==false);
        if(!row){logout();return null;}return publicView(row,"parent");
      }
      const db=await loadDatabase();
      const row=db.accounts.find(item=>normalizeUsername(item.username)===normalizeUsername(current.username)&&item.active!==false);
      if(!row){logout();return null;}return publicView(row,"student");
    }catch(_){return current;}
  }
  async function getLinkedChildren(){
    const current=readSession();if(!current||current.role!=="parent")throw new Error("A parent account is required.");
    const [family,db]=await Promise.all([loadFamilyDatabase(),loadDatabase()]);
    const ids=new Set(family.parentStudentLinks.filter(link=>String(link.parentId)===current.parentId&&link.active!==false).map(link=>String(link.studentId)));
    return db.accounts.filter(item=>item.active!==false&&ids.has(stableStudentId(item))).map(item=>publicView(item,"student"));
  }
  function logout(){sessionStorage.removeItem(SESSION_KEY);}
  window.C10StudentAuth=Object.freeze({loadDatabase,loadFamilyDatabase,stableStudentId,login,currentUser:readSession,restoreSession,getLinkedChildren,logout});
})();
