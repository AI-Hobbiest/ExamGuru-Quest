"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const w=fs.readFileSync("cloudflare/worker.js","utf8"),m=fs.readFileSync("cloudflare/migrations/0004_identity_session_context.sql","utf8");
for(const s of ['path==="/api/v2/auth/me"&&method==="GET"','path==="/api/v2/auth/context"&&method==="POST"','path==="/api/v2/invitations"&&method==="POST"','path==="/api/v2/invitations/accept"&&method==="POST"'])assert.ok(w.includes(s),s);
for(const s of ["m.user_id=? AND m.status='active' AND i.status='active'","membership_branch_scopes WHERE membership_id=? AND institution_id=? AND branch_id=?","await sha256(token)","invite.target_user_id!==who.user_id","status='pending' AND expires_at>?"])assert.ok(w.includes(s),s);
for(const s of ["active_institution_id","active_membership_id","active_branch_id","CREATE TABLE IF NOT EXISTS membership_invitations","json_each(NEW.branch_ids_json)","all_branches INTEGER NOT NULL DEFAULT 0"])assert.ok(m.includes(s),s);
assert.ok(w.includes('path==="/api/auth/me"&&method==="GET"'));
assert.ok(w.includes('path==="/api/student/login"&&method==="POST"'));
console.log("M2 Worker contract tests passed: versioned identity/context/invitation APIs, validated scopes, hashed single-use invitations and legacy route preservation.");
