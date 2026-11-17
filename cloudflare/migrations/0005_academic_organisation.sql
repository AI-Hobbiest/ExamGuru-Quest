-- M3 academic organisation: departments, memberships, scoped HOD appointments.
-- Apply after cloudflare/schema.sql and migrations 0003 + 0004.
-- A department is institution-owned; membership and HOD appointment are
-- separate from the person's institution login membership.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  department_id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(institution_id) ON DELETE RESTRICT,
  parent_department_id TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(institution_id,department_id),
  UNIQUE(institution_id,code),
  FOREIGN KEY(institution_id,parent_department_id)
    REFERENCES departments(institution_id,department_id) ON DELETE RESTRICT,
  CHECK(parent_department_id IS NULL OR parent_department_id<>department_id)
);
CREATE INDEX IF NOT EXISTS idx_departments_institution_status
  ON departments(institution_id,status,name);

CREATE TABLE IF NOT EXISTS department_subjects (
  institution_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(department_id,subject_id),
  FOREIGN KEY(institution_id,department_id)
    REFERENCES departments(institution_id,department_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_department_subjects_subject
  ON department_subjects(institution_id,subject_id,department_id);

CREATE TABLE IF NOT EXISTS department_class_scopes (
  department_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  institution_class_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(department_id,institution_class_id),
  FOREIGN KEY(institution_id,department_id)
    REFERENCES departments(institution_id,department_id) ON DELETE CASCADE,
  FOREIGN KEY(institution_id,institution_class_id)
    REFERENCES institution_classes(institution_id,institution_class_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_department_class_scopes_class
  ON department_class_scopes(institution_id,institution_class_id,department_id);

CREATE TABLE IF NOT EXISTS department_memberships (
  department_membership_id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  institution_membership_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','ended')),
  department_role TEXT NOT NULL DEFAULT 'member' CHECK(department_role IN ('member','coordinator')),
  created_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(department_membership_id,institution_id),
  UNIQUE(department_id,institution_membership_id),
  FOREIGN KEY(institution_id,department_id)
    REFERENCES departments(institution_id,department_id) ON DELETE RESTRICT,
  FOREIGN KEY(institution_membership_id,institution_id)
    REFERENCES institution_memberships(membership_id,institution_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_department_memberships_person
  ON department_memberships(institution_membership_id,status);
CREATE INDEX IF NOT EXISTS idx_department_memberships_department
  ON department_memberships(institution_id,department_id,status,department_role);

-- One person can belong to several departments and can have a different
-- department_role in each. HOD authority is never inferred from this table.
CREATE TABLE IF NOT EXISTS department_head_appointments (
  appointment_id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_membership_id TEXT NOT NULL,
  scope_all_department_classes INTEGER NOT NULL DEFAULT 1
    CHECK(scope_all_department_classes IN (0,1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('scheduled','active','ended','revoked')),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  appointed_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(appointment_id,institution_id),
  FOREIGN KEY(institution_id,department_id)
    REFERENCES departments(institution_id,department_id) ON DELETE RESTRICT,
  FOREIGN KEY(department_membership_id,institution_id)
    REFERENCES department_memberships(department_membership_id,institution_id) ON DELETE RESTRICT,
  CHECK(effective_to IS NULL OR effective_to>effective_from),
  CHECK(status<>'active' OR effective_to IS NULL OR effective_to>effective_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_hod_per_department
  ON department_head_appointments(department_id)
  WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_hod_appointments_person
  ON department_head_appointments(department_membership_id,status,effective_from);

CREATE TABLE IF NOT EXISTS department_head_class_scopes (
  appointment_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  institution_class_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(appointment_id,institution_class_id),
  FOREIGN KEY(appointment_id,institution_id)
    REFERENCES department_head_appointments(appointment_id,institution_id) ON DELETE CASCADE,
  FOREIGN KEY(institution_id,institution_class_id)
    REFERENCES institution_classes(institution_id,institution_class_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_hod_class_scope_class
  ON department_head_class_scopes(institution_id,institution_class_id,appointment_id);

-- Backwards-compatible extension: legacy assignments may remain unassociated.
-- New department-aware assignments must match department membership, subject
-- and department class scope (enforced by the trigger below).
ALTER TABLE teacher_assignments ADD COLUMN department_id TEXT;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_department
  ON teacher_assignments(institution_id,department_id,status);

CREATE TRIGGER IF NOT EXISTS trg_department_membership_role
BEFORE INSERT ON department_memberships
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM institution_memberships im
    JOIN departments d ON d.department_id=NEW.department_id
      AND d.institution_id=NEW.institution_id AND d.status='active'
    WHERE im.membership_id=NEW.institution_membership_id
      AND im.institution_id=NEW.institution_id
      AND im.status='active' AND im.role='teacher'
  ) THEN RAISE(ABORT,'department membership requires an active teacher or school admin membership') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_department_class_scope_valid
BEFORE INSERT ON department_class_scopes
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM departments d
    JOIN institution_classes ic ON ic.institution_class_id=NEW.institution_class_id
      AND ic.institution_id=NEW.institution_id AND ic.status='active'
    WHERE d.department_id=NEW.department_id
      AND d.institution_id=NEW.institution_id AND d.status='active'
  ) THEN RAISE(ABORT,'department class scope must reference an active class in the same institution') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_hod_appointment_membership
BEFORE INSERT ON department_head_appointments
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM department_memberships dm
    JOIN departments d ON d.department_id=dm.department_id
      AND d.institution_id=dm.institution_id AND d.status='active'
    JOIN institution_memberships im ON im.membership_id=dm.institution_membership_id
      AND im.institution_id=dm.institution_id
    WHERE dm.department_membership_id=NEW.department_membership_id
      AND dm.department_id=NEW.department_id
      AND dm.institution_id=NEW.institution_id
      AND dm.status='active' AND im.status='active'
  ) THEN RAISE(ABORT,'HOD appointment requires active membership in the appointed department') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_hod_class_scope_valid
BEFORE INSERT ON department_head_class_scopes
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM department_head_appointments a
    JOIN department_class_scopes dcs ON dcs.department_id=a.department_id
      AND dcs.institution_id=a.institution_id
      AND dcs.institution_class_id=NEW.institution_class_id
    WHERE a.appointment_id=NEW.appointment_id
      AND a.institution_id=NEW.institution_id
      AND a.scope_all_department_classes=0
  ) THEN RAISE(ABORT,'HOD class scope must be an explicitly assigned class of the department') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_teacher_assignment_department_insert
BEFORE INSERT ON teacher_assignments
WHEN NEW.department_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM departments d
    JOIN department_subjects ds ON ds.department_id=d.department_id
      AND ds.institution_id=d.institution_id AND ds.subject_id=NEW.subject_id
    JOIN department_class_scopes dcs ON dcs.department_id=d.department_id
      AND dcs.institution_id=d.institution_id
      AND dcs.institution_class_id=NEW.institution_class_id
    JOIN department_memberships dm ON dm.department_id=d.department_id
      AND dm.institution_id=d.institution_id
      AND dm.institution_membership_id=NEW.teacher_membership_id
      AND dm.status='active'
    WHERE d.department_id=NEW.department_id
      AND d.institution_id=NEW.institution_id AND d.status='active'
  ) THEN RAISE(ABORT,'department assignment requires active department membership, subject and class scope') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_teacher_assignment_department_update
BEFORE UPDATE OF department_id,institution_id,teacher_membership_id,institution_class_id,subject_id,status ON teacher_assignments
WHEN NEW.department_id IS NOT NULL AND NEW.status='active'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM departments d
    JOIN department_subjects ds ON ds.department_id=d.department_id
      AND ds.institution_id=d.institution_id AND ds.subject_id=NEW.subject_id
    JOIN department_class_scopes dcs ON dcs.department_id=d.department_id
      AND dcs.institution_id=d.institution_id
      AND dcs.institution_class_id=NEW.institution_class_id
    JOIN department_memberships dm ON dm.department_id=d.department_id
      AND dm.institution_id=d.institution_id
      AND dm.institution_membership_id=NEW.teacher_membership_id
      AND dm.status='active'
    WHERE d.department_id=NEW.department_id
      AND d.institution_id=NEW.institution_id AND d.status='active'
  ) THEN RAISE(ABORT,'department assignment requires active department membership, subject and class scope') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_department_membership_role_update
BEFORE UPDATE OF institution_id,department_id,institution_membership_id,status ON department_memberships
WHEN NEW.status='active'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM institution_memberships im
    JOIN departments d ON d.department_id=NEW.department_id
      AND d.institution_id=NEW.institution_id AND d.status='active'
    WHERE im.membership_id=NEW.institution_membership_id
      AND im.institution_id=NEW.institution_id
      AND im.status='active' AND im.role='teacher'
  ) THEN RAISE(ABORT,'active department membership requires an active teacher institution membership') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_department_class_scope_valid_update
BEFORE UPDATE OF department_id,institution_id,institution_class_id ON department_class_scopes
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM departments d
    JOIN institution_classes ic ON ic.institution_class_id=NEW.institution_class_id
      AND ic.institution_id=NEW.institution_id AND ic.status='active'
    WHERE d.department_id=NEW.department_id
      AND d.institution_id=NEW.institution_id AND d.status='active'
  ) THEN RAISE(ABORT,'department class scope must reference an active class in the same institution') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_hod_appointment_membership_update
BEFORE UPDATE OF institution_id,department_id,department_membership_id,status ON department_head_appointments
WHEN NEW.status IN ('scheduled','active')
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM department_memberships dm
    JOIN departments d ON d.department_id=dm.department_id
      AND d.institution_id=dm.institution_id AND d.status='active'
    JOIN institution_memberships im ON im.membership_id=dm.institution_membership_id
      AND im.institution_id=dm.institution_id
    WHERE dm.department_membership_id=NEW.department_membership_id
      AND dm.department_id=NEW.department_id
      AND dm.institution_id=NEW.institution_id
      AND dm.status='active' AND im.status='active' AND im.role='teacher'
  ) THEN RAISE(ABORT,'HOD appointment requires an active teacher membership in the appointed department') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_hod_class_scope_valid_update
BEFORE UPDATE OF appointment_id,institution_id,institution_class_id ON department_head_class_scopes
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM department_head_appointments a
    JOIN department_class_scopes dcs ON dcs.department_id=a.department_id
      AND dcs.institution_id=a.institution_id
      AND dcs.institution_class_id=NEW.institution_class_id
    WHERE a.appointment_id=NEW.appointment_id
      AND a.institution_id=NEW.institution_id
      AND a.scope_all_department_classes=0
  ) THEN RAISE(ABORT,'HOD class scope must be an explicitly assigned class of the department') END;
END;
