import pathlib,sqlite3
root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(":memory:");db.execute("PRAGMA foreign_keys=ON")
db.executescript((root/"cloudflare/schema.sql").read_text())
for name in ["0003_multitenant_rbac_foundation.sql","0004_identity_session_context.sql","0005_academic_organisation.sql","0006_m4_branch_operations.sql"]:
 db.executescript((root/"cloudflare/migrations"/name).read_text())
now="2026-11-18T00:00:00.000Z"
for uid,name in [("u-admin","admin"),("u-teacher","teacher"),("u-viewer","viewer"),("u-student","student"),("u-parent","parent")]:
 db.execute("INSERT INTO users(id,username,role,enabled,must_change_password,created_at,updated_at) VALUES(?,?,'student',1,0,?,?)",(uid,name,now,now))
db.execute("INSERT INTO institutions VALUES('i1','Academy','academy','active','Asia/Kolkata',?,?)",(now,now))
db.execute("INSERT INTO institutions VALUES('i2','Other','other','active','Asia/Kolkata',?,?)",(now,now))
for bid,iid in [("b1","i1"),("b2","i1"),("b-other","i2")]:
 db.execute("INSERT INTO branches(branch_id,institution_id,name,code,created_at,updated_at) VALUES(?,?,?,?,?,?)",(bid,iid,bid,bid,now,now))
for mid,uid,role,iid in [("ma","u-admin","school_admin","i1"),("mt","u-teacher","teacher","i1"),("mv","u-viewer","institution_viewer","i1"),("ms","u-student","student","i1"),("mp","u-parent","parent","i1")]:
 db.execute("INSERT INTO institution_memberships(membership_id,user_id,institution_id,role,status,all_branches,created_at,updated_at) VALUES(?,?,?,?,'active',0,?,?)",(mid,uid,iid,role,now,now))
db.execute("INSERT INTO membership_branch_scopes VALUES('ma','i1','b1',?)",(now,))
db.execute("INSERT INTO membership_branch_scopes VALUES('ma','i1','b2',?)",(now,))
grade=db.execute("SELECT class_id FROM classes WHERE active=1 ORDER BY sort_order LIMIT 1").fetchone()
if not grade:
 db.execute("INSERT INTO classes(class_id,label,sort_order,active,created_at,updated_at) VALUES('m4-grade','M4 Test Grade',6,1,?,?)",(now,now))
 grade=('m4-grade',)
grade_id=grade[0]
db.execute("INSERT INTO institution_classes(institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at) VALUES('c1','i1','b1',?,'A','2026-27',?,?)",(grade_id,now,now))
db.execute("INSERT INTO institution_classes(institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at) VALUES('c2','i2','b-other',?,'A','2026-27',?,?)",(grade_id,now,now))
db.execute("INSERT INTO branch_admin_appointments(appointment_id,institution_id,branch_id,membership_id,appointed_by_user_id,created_at,updated_at) VALUES('ba1','i1','b1','mv','u-admin',?,?)",(now,now))
db.execute("INSERT INTO teacher_assignments(assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,created_at,updated_at) VALUES('ta1','i1','mt','c1','science',?,?)",(now,now))
db.execute("INSERT INTO student_enrollments(enrollment_id,institution_id,student_membership_id,institution_class_id,academic_year,enrolled_at,created_at) VALUES('e1','i1','ms','c1','2026-27',?,?)",(now,now))
db.execute("INSERT INTO parent_student_links(link_id,institution_id,parent_membership_id,student_membership_id,created_at,updated_at) VALUES('pl1','i1','mp','ms',?,?)",(now,now))
def reject(sql,params):
 try: db.execute(sql,params)
 except sqlite3.IntegrityError: return
 raise AssertionError("expected integrity rejection: "+sql)
reject("INSERT INTO branch_admin_appointments(appointment_id,institution_id,branch_id,membership_id,appointed_by_user_id,created_at,updated_at) VALUES('bad','i1','b2','ma','u-admin',?,?)",(now,now))
reject("INSERT INTO student_enrollments(enrollment_id,institution_id,student_membership_id,institution_class_id,academic_year,enrolled_at,created_at) VALUES('e2','i1','ms','c2','2026-28',?,?)",(now,now))
reject("INSERT INTO parent_student_links(link_id,institution_id,parent_membership_id,student_membership_id,created_at,updated_at) VALUES('badpl','i1','ms','mp',?,?)",(now,now))
assert db.execute("SELECT COUNT(*) FROM branch_admin_appointments WHERE status='active'").fetchone()[0]==1
assert db.execute("SELECT COUNT(*) FROM student_enrollments WHERE status='active'").fetchone()[0]==1
assert db.execute("SELECT COUNT(*) FROM parent_student_links WHERE status='active'").fetchone()[0]==1
print("M4 migration tests passed: branch-admin role constraints, branch and tenant integrity, active class enrolment, and parent/student role integrity.")
