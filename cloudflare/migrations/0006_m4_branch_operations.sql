-- M4: delegated branch administration and operational integrity.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS branch_admin_appointments (
  appointment_id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','ended')),
  appointed_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(institution_id,branch_id,membership_id),
  FOREIGN KEY(institution_id,branch_id) REFERENCES branches(institution_id,branch_id) ON DELETE RESTRICT,
  FOREIGN KEY(membership_id,institution_id) REFERENCES institution_memberships(membership_id,institution_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_branch_admin_membership ON branch_admin_appointments(membership_id,status);
CREATE INDEX IF NOT EXISTS idx_branch_admin_branch ON branch_admin_appointments(institution_id,branch_id,status);

CREATE TRIGGER IF NOT EXISTS trg_branch_admin_appointment_role
BEFORE INSERT ON branch_admin_appointments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_memberships m
  JOIN institutions i ON i.institution_id=m.institution_id AND i.status='active'
  JOIN branches b ON b.institution_id=m.institution_id AND b.branch_id=NEW.branch_id AND b.status='active'
  WHERE m.membership_id=NEW.membership_id AND m.institution_id=NEW.institution_id
    AND m.status='active' AND m.role IN ('teacher','institution_viewer')
 ) THEN RAISE(ABORT,'branch administrator requires an active eligible institution membership') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_branch_admin_appointment_role_update
BEFORE UPDATE OF membership_id,institution_id,branch_id,status ON branch_admin_appointments
WHEN NEW.status='active'
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_memberships m
  JOIN branches b ON b.institution_id=m.institution_id AND b.branch_id=NEW.branch_id AND b.status='active'
  WHERE m.membership_id=NEW.membership_id AND m.institution_id=NEW.institution_id
    AND m.status='active' AND m.role IN ('teacher','institution_viewer')
 ) THEN RAISE(ABORT,'active branch administrator requires an active eligible membership') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_enrollment_active_class
BEFORE INSERT ON student_enrollments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_classes c JOIN branches b
   ON b.institution_id=c.institution_id AND b.branch_id=c.branch_id
  WHERE c.institution_id=NEW.institution_id
   AND c.institution_class_id=NEW.institution_class_id
   AND c.status='active' AND b.status='active'
 ) THEN RAISE(ABORT,'enrollment requires an active class in an active branch') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_parent_link_membership_update
BEFORE UPDATE OF institution_id,parent_membership_id,student_membership_id,status ON parent_student_links
WHEN NEW.status='active'
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_memberships p JOIN institution_memberships s
   ON s.institution_id=p.institution_id
  WHERE p.membership_id=NEW.parent_membership_id AND s.membership_id=NEW.student_membership_id
   AND p.institution_id=NEW.institution_id AND p.role='parent' AND p.status='active'
   AND s.role='student' AND s.status='active'
 ) THEN RAISE(ABORT,'active parent link requires active parent and student memberships') END;
END;
