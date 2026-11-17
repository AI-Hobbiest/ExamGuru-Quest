import pathlib,sqlite3
root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(":memory:");db.execute("PRAGMA foreign_keys=ON")
db.executescript((root/"cloudflare/schema.sql").read_text())
db.executescript((root/"cloudflare/migrations/0003_multitenant_rbac_foundation.sql").read_text())
db.executescript((root/"cloudflare/migrations/0004_identity_session_context.sql").read_text())
migration=(root/"cloudflare/migrations/0005_academic_organisation.sql").read_text()
db.executescript(migration)
now="2026-11-18T00:00:00.000Z"
def user(uid,name):
 db.execute("INSERT INTO users(id,username,role,enabled,must_change_password,created_at,updated_at) VALUES(?,?,'student',1,0,?,?)",(uid,name,now,now))
for x in [("u-admin","admin"),("u-teacher","teacher"),("u-teacher-2","teacher2")]:user(*x)
db.execute("INSERT INTO institutions VALUES('ins-a','Academy','academy','active','Asia/Kolkata',?,?)",(now,now))
db.execute("INSERT INTO institutions VALUES('ins-b','Other','other','active','Asia/Kolkata',?,?)",(now,now))
for bid,iid in [("br-a","ins-a"),("br-b","ins-b")]:
 db.execute("INSERT INTO branches(branch_id,institution_id,name,code,created_at,updated_at) VALUES(?,?,?,?,?,?)",(bid,iid,bid,bid,now,now))
for mid,uid,iid,role in [("m-admin","u-admin","ins-a","school_admin"),("m-t1","u-teacher","ins-a","teacher"),("m-t2","u-teacher-2","ins-a","teacher")]:
 db.execute("INSERT INTO institution_memberships(membership_id,user_id,institution_id,role,status,all_branches,created_at,updated_at) VALUES(?,?,?,?,'active',1,?,?)",(mid,uid,iid,role,now,now))
db.execute("INSERT INTO institution_classes(institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at) VALUES('ic-6a','ins-a','br-a','6','A','2026-27',?,?)",(now,now))
db.execute("INSERT INTO institution_classes(institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at) VALUES('ic-7a','ins-a','br-a','7','A','2026-27',?,?)",(now,now))
db.execute("INSERT INTO institution_classes(institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at) VALUES('ic-other','ins-b','br-b','6','A','2026-27',?,?)",(now,now))
for did,name,code in [("dept-sci","Science","SCI"),("dept-math","Mathematics","MATH")]:
 db.execute("INSERT INTO departments(department_id,institution_id,name,code,created_at,updated_at) VALUES(?,'ins-a',?,?,?,?)",(did,name,code,now,now))
db.execute("INSERT INTO departments(department_id,institution_id,name,code,created_at,updated_at) VALUES('dept-other','ins-b','Science','SCI',?,?)",(now,now))
db.execute("INSERT INTO department_subjects VALUES('ins-a','dept-sci','science',?)",(now,))
db.execute("INSERT INTO department_subjects VALUES('ins-a','dept-math','mathematics',?)",(now,))
for did,ic in [("dept-sci","ic-6a"),("dept-sci","ic-7a"),("dept-math","ic-7a")]:
 db.execute("INSERT INTO department_class_scopes VALUES(?,?,?,?)",(did,"ins-a",ic,now))
# Same teacher belongs to two departments; another teacher belongs to Science only.
for dmid,did,mid in [("dm-t1-sci","dept-sci","m-t1"),("dm-t1-math","dept-math","m-t1"),("dm-t2-sci","dept-sci","m-t2")]:
 db.execute("INSERT INTO department_memberships(department_membership_id,institution_id,department_id,institution_membership_id,created_by_user_id,created_at,updated_at) VALUES(?,'ins-a',?,?, 'u-admin',?,?)",(dmid,did,mid,now,now))
# Teacher is appointed HOD of Science but not Maths; appointment is not a global role.
db.execute("INSERT INTO department_head_appointments(appointment_id,institution_id,department_id,department_membership_id,scope_all_department_classes,status,effective_from,appointed_by_user_id,created_at,updated_at) VALUES('hod-sci','ins-a','dept-sci','dm-t1-sci',0,'active','2026-04-01','u-admin',?,?)",(now,now))
db.execute("INSERT INTO department_head_class_scopes VALUES('hod-sci','ins-a','ic-6a',?)",(now,))
# Department-aware teacher assignments permit the same teacher across departments.
db.execute("INSERT INTO teacher_assignments(assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,department_id,created_at,updated_at) VALUES('ta-sci','ins-a','m-t1','ic-6a','science','dept-sci',?,?)",(now,now))
db.execute("INSERT INTO teacher_assignments(assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,department_id,created_at,updated_at) VALUES('ta-math','ins-a','m-t1','ic-7a','mathematics','dept-math',?,?)",(now,now))
def reject(sql,params):
 try:db.execute(sql,params)
 except sqlite3.IntegrityError:return
 raise AssertionError("expected database to reject invalid academic-organisation record")
reject("INSERT INTO departments(department_id,institution_id,name,code,created_at,updated_at) VALUES('dup','ins-a','Dup','SCI',?,?)",(now,now))
reject("INSERT INTO department_memberships(department_membership_id,institution_id,department_id,institution_membership_id,created_at,updated_at) VALUES('bad-dm','ins-a','dept-sci','m-admin',?,?)",(now,now))
reject("INSERT INTO department_class_scopes VALUES('dept-sci','ins-a','ic-other',?)",(now,))
reject("INSERT INTO department_head_class_scopes VALUES('hod-sci','ins-a','ic-7a',?)",(now,))
reject("INSERT INTO teacher_assignments(assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,department_id,created_at,updated_at) VALUES('bad-ta','ins-a','m-t1','ic-6a','mathematics','dept-sci',?,?)",(now,now))
reject("INSERT INTO department_head_appointments(appointment_id,institution_id,department_id,department_membership_id,status,effective_from,appointed_by_user_id,created_at,updated_at) VALUES('hod-sci-2','ins-a','dept-sci','dm-t2-sci','active','2026-04-01','u-admin',?,?)",(now,now))
assert db.execute("SELECT COUNT(*) FROM department_memberships WHERE institution_membership_id='m-t1' AND status='active'").fetchone()[0]==2
assert db.execute("SELECT COUNT(*) FROM teacher_assignments WHERE teacher_membership_id='m-t1' AND department_id IS NOT NULL").fetchone()[0]==2
assert db.execute("SELECT COUNT(*) FROM department_head_appointments WHERE department_membership_id='dm-t1-sci' AND status='active'").fetchone()[0]==1
# Legacy department_id=NULL assignments remain valid and readable.
db.execute("INSERT INTO teacher_assignments(assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,created_at,updated_at) VALUES('legacy-ta','ins-a','m-t1','ic-6a','english',?,?)",(now,now))
db.executescript(migration.replace("ALTER TABLE teacher_assignments ADD COLUMN department_id TEXT;",""))
print("M3 academic organisation migration tests passed: cross-department teacher memberships, scoped HOD appointments, class/subject enforcement, tenant isolation, unique active HOD and legacy assignment compatibility.")
