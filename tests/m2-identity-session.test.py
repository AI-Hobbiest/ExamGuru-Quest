import pathlib, sqlite3
root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(":memory:"); db.execute("PRAGMA foreign_keys=ON")
db.executescript((root/"cloudflare/schema.sql").read_text())
db.executescript((root/"cloudflare/migrations/0003_multitenant_rbac_foundation.sql").read_text())
db.executescript((root/"cloudflare/migrations/0004_identity_session_context.sql").read_text())
now="2026-11-18T00:00:00.000Z"
def user(uid,name): db.execute("INSERT INTO users(id,username,role,enabled,must_change_password,created_at,updated_at) VALUES(?,?,'student',1,0,?,?)",(uid,name,now,now))
for x in [("u-shared","shared-person"),("u-target","invite-target"),("u-admin","platform-admin")]: user(*x)
for iid in ["ins-a","ins-b"]: db.execute("INSERT INTO institutions(institution_id,name,slug,status,timezone,created_at,updated_at) VALUES(?,?,?,'active','Asia/Kolkata',?,?)",(iid,iid,iid,now,now))
for bid,iid in [("branch-a","ins-a"),("branch-b","ins-a"),("branch-x","ins-b")]: db.execute("INSERT INTO branches(branch_id,institution_id,name,code,created_at,updated_at) VALUES(?,?,?,?,?,?)",(bid,iid,bid,bid,now,now))
db.execute("INSERT INTO institution_memberships(membership_id,user_id,institution_id,role,status,all_branches,created_at,updated_at) VALUES('m-a','u-shared','ins-a','teacher','active',0,?,?)",(now,now))
db.execute("INSERT INTO institution_memberships(membership_id,user_id,institution_id,role,status,all_branches,created_at,updated_at) VALUES('m-b','u-shared','ins-b','parent','active',1,?,?)",(now,now))
db.execute("INSERT INTO membership_branch_scopes VALUES('m-a','ins-a','branch-a',?)",(now,))
db.execute("INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at,last_seen_at,active_institution_id,active_membership_id,active_branch_id) VALUES('hash','u-shared','2099-01-01',?,?, 'ins-a','m-a','branch-a')",(now,now))
assert db.execute("SELECT active_institution_id,active_membership_id,active_branch_id FROM auth_sessions").fetchone()==("ins-a","m-a","branch-a")
db.execute("""INSERT INTO membership_invitations(invitation_id,token_hash,institution_id,target_user_id,role,branch_ids_json,all_branches,invited_by_user_id,status,expires_at,created_at,updated_at) VALUES('invite-1','token-hash','ins-a','u-target','teacher','["branch-a"]',0,'u-admin','pending','2099-01-01',?,?)""",(now,now))
assert db.execute("SELECT target_user_id,role,status FROM membership_invitations").fetchone()==("u-target","teacher","pending")
def reject(sql,params):
 try: db.execute(sql,params)
 except sqlite3.IntegrityError:return
 raise AssertionError("expected DB constraint to reject invalid invitation")
reject("""INSERT INTO membership_invitations(invitation_id,token_hash,institution_id,target_user_id,role,branch_ids_json,all_branches,invited_by_user_id,status,expires_at,created_at,updated_at) VALUES('bad-branch','bad-hash','ins-a','u-target','teacher','["branch-x"]',0,'u-admin','pending','2099-01-01',?,?)""",(now,now))
reject("""INSERT INTO membership_invitations(invitation_id,token_hash,institution_id,target_user_id,role,invited_by_user_id,status,expires_at,created_at,updated_at) VALUES('bad-role','bad-role','ins-a','u-target','hod','u-admin','pending','2099-01-01',?,?)""",(now,now))
reject("""INSERT INTO membership_invitations(invitation_id,token_hash,institution_id,target_user_id,role,invited_by_user_id,status,expires_at,created_at,updated_at) VALUES('bad-user','bad-user','ins-a','missing','teacher','u-admin','pending','2099-01-01',?,?)""",(now,now))
print("M2 identity migration tests passed: multi-membership, session context, invitation target/role constraints and cross-institution branch rejection.")
