import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript((root / "cloudflare/schema.sql").read_text())
migration = (root / "cloudflare/migrations/0003_multitenant_rbac_foundation.sql").read_text()
db.executescript(migration)
db.executescript(migration)  # idempotency is required for deployment/retry safety

now = "2026-11-17T00:00:00.000Z"
for uid, username, role in [
    ("u-admin-001", "platform-admin", "admin"),
    ("u-school-001", "school-admin", "student"),
    ("u-teacher-001", "teacher-one", "student"),
    ("u-student-001", "student-one", "student"),
    ("u-parent-001", "parent-one", "student"),
    ("u-other-001", "other-admin", "student"),
]:
    db.execute(
        "INSERT INTO users(id,username,role,enabled,must_change_password,created_at,updated_at) VALUES(?,?,?,1,0,?,?)",
        (uid, username, role, now, now),
    )

db.execute("INSERT INTO institutions VALUES(?,?,?,?,?,?,?)",
           ("ins-00000001", "North School Group", "north-school", "active", "Asia/Kolkata", now, now))
db.execute("INSERT INTO institutions VALUES(?,?,?,?,?,?,?)",
           ("ins-00000002", "South School Group", "south-school", "active", "Asia/Kolkata", now, now))
db.execute("INSERT INTO platform_roles(user_id,role,granted_by,granted_at) VALUES(?,?,?,?)",
           ("u-admin-001", "platform_admin", "u-admin-001", now))

for bid, iid, name, code in [
    ("br-00000001", "ins-00000001", "Central Campus", "CENTRAL"),
    ("br-00000002", "ins-00000002", "South Campus", "SOUTH"),
]:
    db.execute("INSERT INTO branches(branch_id,institution_id,name,code,created_at,updated_at) VALUES(?,?,?,?,?,?)",
               (bid, iid, name, code, now, now))

members = [
    ("mem-school-001", "u-school-001", "ins-00000001", "school_admin", 1),
    ("mem-teacher-001", "u-teacher-001", "ins-00000001", "teacher", 0),
    ("mem-student-001", "u-student-001", "ins-00000001", "student", 0),
    ("mem-parent-001", "u-parent-001", "ins-00000001", "parent", 0),
    ("mem-other-001", "u-other-001", "ins-00000002", "school_admin", 1),
]
for mid, uid, iid, role, all_branches in members:
    db.execute("""INSERT INTO institution_memberships
      (membership_id,user_id,institution_id,role,status,all_branches,created_at,updated_at)
      VALUES(?,?,?,?,'active',?,?,?)""", (mid, uid, iid, role, all_branches, now, now))

db.execute("INSERT INTO membership_branch_scopes VALUES(?,?,?,?)",
           ("mem-teacher-001", "ins-00000001", "br-00000001", now))
db.execute("INSERT INTO membership_branch_scopes VALUES(?,?,?,?)",
           ("mem-student-001", "ins-00000001", "br-00000001", now))
db.execute("INSERT INTO membership_branch_scopes VALUES(?,?,?,?)",
           ("mem-parent-001", "ins-00000001", "br-00000001", now))

db.execute("""INSERT INTO institution_classes
 (institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?,?)""",
 ("ic-00000001", "ins-00000001", "br-00000001", "6", "A", "2026-27", now, now))

db.execute("""INSERT INTO teacher_assignments
 (assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?)""",
 ("ta-00000001", "ins-00000001", "mem-teacher-001", "ic-00000001", "science", now, now))
db.execute("""INSERT INTO student_enrollments
 (enrollment_id,institution_id,student_membership_id,institution_class_id,academic_year,enrolled_at,created_at)
 VALUES(?,?,?,?,?,?,?)""",
 ("en-00000001", "ins-00000001", "mem-student-001", "ic-00000001", "2026-27", now, now))
db.execute("""INSERT INTO parent_student_links
 (link_id,institution_id,parent_membership_id,student_membership_id,created_at,updated_at)
 VALUES(?,?,?,?,?,?)""",
 ("pl-00000001", "ins-00000001", "mem-parent-001", "mem-student-001", now, now))

db.execute("""INSERT INTO question_banks
 (bank_id,owner_type,institution_id,title,class_id,subject_id,status,version,created_at,updated_at)
 VALUES('qb-platform-01','platform',NULL,'Shared Science','6','science','published','1',?,?)""", (now, now))
db.execute("""INSERT INTO question_banks
 (bank_id,owner_type,institution_id,title,class_id,subject_id,status,source_bank_id,source_version,version,created_at,updated_at)
 VALUES('qb-school-01','institution','ins-00000001','School Science','6','science','draft','qb-platform-01','1','1',?,?)""", (now, now))

def must_fail(sql, params):
    try:
        db.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError("Expected tenant/role constraint to reject invalid record")

must_fail("""INSERT INTO teacher_assignments
 (assignment_id,institution_id,teacher_membership_id,institution_class_id,subject_id,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?)""",
 ("ta-invalid", "ins-00000001", "mem-school-001", "ic-00000001", "science", now, now))
must_fail("""INSERT INTO student_enrollments
 (enrollment_id,institution_id,student_membership_id,institution_class_id,academic_year,enrolled_at,created_at)
 VALUES(?,?,?,?,?,?,?)""",
 ("en-invalid", "ins-00000001", "mem-parent-001", "ic-00000001", "2026-27", now, now))
must_fail("""INSERT INTO parent_student_links
 (link_id,institution_id,parent_membership_id,student_membership_id,created_at,updated_at)
 VALUES(?,?,?,?,?,?)""",
 ("pl-invalid", "ins-00000001", "mem-student-001", "mem-parent-001", now, now))
must_fail("""INSERT INTO institution_classes
 (institution_class_id,institution_id,branch_id,grade_id,section_code,academic_year,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?,?)""",
 ("ic-cross", "ins-00000001", "br-00000002", "6", "B", "2026-27", now, now))

assert db.execute("SELECT COUNT(*) FROM institutions").fetchone()[0] == 2
assert db.execute("SELECT COUNT(*) FROM teacher_assignments").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM student_enrollments").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM parent_student_links").fetchone()[0] == 1
assert db.execute("SELECT COUNT(*) FROM question_banks").fetchone()[0] == 2
assert db.execute("SELECT role FROM users WHERE id='u-school-001'").fetchone()[0] == "student"
print("RBAC D1 migration tests passed: additive/idempotent migration, multi-tenant FKs, role triggers, parent links and shared/institution bank ownership.")
