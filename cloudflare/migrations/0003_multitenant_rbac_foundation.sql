-- ExamGuru multi-tenant RBAC foundation (additive migration).
-- Apply after cloudflare/schema.sql. Does not alter legacy users.role, profiles,
-- classes, attempts, auth_sessions or existing Worker API semantics.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS institutions (
 institution_id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
 timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_roles (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('platform_admin','platform_support')),
 granted_by TEXT REFERENCES users(id), granted_at TEXT NOT NULL, revoked_at TEXT,
 PRIMARY KEY(user_id,role)
);
CREATE INDEX IF NOT EXISTS idx_platform_roles_active ON platform_roles(user_id,revoked_at);

CREATE TABLE IF NOT EXISTS branches (
 branch_id TEXT PRIMARY KEY, institution_id TEXT NOT NULL REFERENCES institutions(institution_id) ON DELETE RESTRICT,
 name TEXT NOT NULL, code TEXT NOT NULL COLLATE NOCASE,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','closed')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(institution_id,branch_id), UNIQUE(institution_id,code)
);
CREATE INDEX IF NOT EXISTS idx_branches_institution_status ON branches(institution_id,status);

CREATE TABLE IF NOT EXISTS institution_memberships (
 membership_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 institution_id TEXT NOT NULL REFERENCES institutions(institution_id) ON DELETE RESTRICT,
 role TEXT NOT NULL CHECK(role IN ('school_admin','teacher','parent','student','institution_viewer')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('invited','active','suspended','ended')),
 all_branches INTEGER NOT NULL DEFAULT 0 CHECK(all_branches IN (0,1)),
 created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(user_id,institution_id,role), UNIQUE(membership_id,institution_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON institution_memberships(user_id,status);
CREATE INDEX IF NOT EXISTS idx_memberships_institution_role ON institution_memberships(institution_id,role,status);

CREATE TABLE IF NOT EXISTS membership_branch_scopes (
 membership_id TEXT NOT NULL, institution_id TEXT NOT NULL, branch_id TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(membership_id,branch_id),
 FOREIGN KEY(membership_id,institution_id) REFERENCES institution_memberships(membership_id,institution_id) ON DELETE CASCADE,
 FOREIGN KEY(institution_id,branch_id) REFERENCES branches(institution_id,branch_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_membership_branch_branch ON membership_branch_scopes(branch_id,membership_id);

-- Existing classes remains the global grade catalogue.
CREATE TABLE IF NOT EXISTS institution_classes (
 institution_class_id TEXT PRIMARY KEY, institution_id TEXT NOT NULL, branch_id TEXT NOT NULL,
 grade_id TEXT NOT NULL REFERENCES classes(class_id) ON DELETE RESTRICT,
 section_code TEXT NOT NULL, academic_year TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(institution_id,institution_class_id),
 UNIQUE(institution_id,branch_id,grade_id,section_code,academic_year),
 FOREIGN KEY(institution_id,branch_id) REFERENCES branches(institution_id,branch_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_institution_classes_branch_year ON institution_classes(institution_id,branch_id,academic_year,status);

CREATE TABLE IF NOT EXISTS teacher_assignments (
 assignment_id TEXT PRIMARY KEY, institution_id TEXT NOT NULL, teacher_membership_id TEXT NOT NULL,
 institution_class_id TEXT NOT NULL, subject_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(teacher_membership_id,institution_id) REFERENCES institution_memberships(membership_id,institution_id) ON DELETE RESTRICT,
 FOREIGN KEY(institution_id,institution_class_id) REFERENCES institution_classes(institution_id,institution_class_id) ON DELETE RESTRICT,
 UNIQUE(teacher_membership_id,institution_class_id,subject_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(institution_id,institution_class_id,status);

CREATE TABLE IF NOT EXISTS student_enrollments (
 enrollment_id TEXT PRIMARY KEY, institution_id TEXT NOT NULL, student_membership_id TEXT NOT NULL,
 institution_class_id TEXT NOT NULL, academic_year TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','transferred','completed','withdrawn')),
 enrolled_at TEXT NOT NULL, ended_at TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(student_membership_id,institution_id) REFERENCES institution_memberships(membership_id,institution_id) ON DELETE RESTRICT,
 FOREIGN KEY(institution_id,institution_class_id) REFERENCES institution_classes(institution_id,institution_class_id) ON DELETE RESTRICT,
 UNIQUE(student_membership_id,academic_year)
);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class ON student_enrollments(institution_id,institution_class_id,status);

CREATE TABLE IF NOT EXISTS parent_student_links (
 link_id TEXT PRIMARY KEY, institution_id TEXT NOT NULL, parent_membership_id TEXT NOT NULL,
 student_membership_id TEXT NOT NULL, relationship TEXT NOT NULL DEFAULT 'parent/guardian',
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK(parent_membership_id<>student_membership_id),
 FOREIGN KEY(parent_membership_id,institution_id) REFERENCES institution_memberships(membership_id,institution_id) ON DELETE RESTRICT,
 FOREIGN KEY(student_membership_id,institution_id) REFERENCES institution_memberships(membership_id,institution_id) ON DELETE RESTRICT,
 UNIQUE(parent_membership_id,student_membership_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_student_student ON parent_student_links(institution_id,student_membership_id,status);

CREATE TABLE IF NOT EXISTS question_banks (
 bank_id TEXT PRIMARY KEY, owner_type TEXT NOT NULL CHECK(owner_type IN ('platform','institution')),
 institution_id TEXT REFERENCES institutions(institution_id) ON DELETE RESTRICT,
 title TEXT NOT NULL, class_id TEXT NOT NULL, subject_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','approved','published','archived')),
 source_bank_id TEXT REFERENCES question_banks(bank_id) ON DELETE SET NULL, source_version TEXT,
 version TEXT NOT NULL DEFAULT '1', created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK((owner_type='platform' AND institution_id IS NULL) OR (owner_type='institution' AND institution_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_question_banks_owner ON question_banks(owner_type,institution_id,class_id,subject_id,status);

CREATE TABLE IF NOT EXISTS audit_events (
 event_id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 institution_id TEXT REFERENCES institutions(institution_id) ON DELETE SET NULL,
 branch_id TEXT REFERENCES branches(branch_id) ON DELETE SET NULL,
 action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT, request_id TEXT,
 metadata_json TEXT NOT NULL DEFAULT '{}', occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_events_institution_time ON audit_events(institution_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_time ON audit_events(actor_user_id,occurred_at DESC);

-- Enforce membership role and active state at the database boundary as well as
-- in the Worker authorization service. API checks still validate branch/class scope.
CREATE TRIGGER IF NOT EXISTS trg_teacher_assignment_role
BEFORE INSERT ON teacher_assignments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_memberships m
  WHERE m.membership_id=NEW.teacher_membership_id
    AND m.institution_id=NEW.institution_id
    AND m.role='teacher' AND m.status='active'
 ) THEN RAISE(ABORT,'teacher assignment requires an active teacher membership') END;
END;
CREATE TRIGGER IF NOT EXISTS trg_student_enrollment_role
BEFORE INSERT ON student_enrollments
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_memberships m
  WHERE m.membership_id=NEW.student_membership_id
    AND m.institution_id=NEW.institution_id
    AND m.role='student' AND m.status='active'
 ) THEN RAISE(ABORT,'enrollment requires an active student membership') END;
END;
CREATE TRIGGER IF NOT EXISTS trg_parent_student_link_roles
BEFORE INSERT ON parent_student_links
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM institution_memberships p
  JOIN institution_memberships s ON s.institution_id=p.institution_id
  WHERE p.membership_id=NEW.parent_membership_id
    AND s.membership_id=NEW.student_membership_id
    AND p.institution_id=NEW.institution_id
    AND p.role='parent' AND p.status='active'
    AND s.role='student' AND s.status='active'
 ) THEN RAISE(ABORT,'parent link requires active parent and student memberships in the same institution') END;
END;
