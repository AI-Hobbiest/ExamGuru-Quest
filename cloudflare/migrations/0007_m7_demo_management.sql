-- M7 demo environments are isolated from production institutions and learner records.
CREATE TABLE IF NOT EXISTS demo_environments (
  demo_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('persona','on_demand')),
  template_id TEXT,
  template_version INTEGER,
  display_name TEXT NOT NULL,
  roles_json TEXT NOT NULL,
  data_profile TEXT NOT NULL CHECK(data_profile IN ('standard_sample','school_sample','department_sample','teaching_sample','parent_sample','student_sample')),
  status TEXT NOT NULL CHECK(status IN ('active','expired','revoked')),
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1,
  reset_generation INTEGER NOT NULL DEFAULT 0,
  last_reset_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_demo_environments_status_expiry ON demo_environments(status, expires_at);
CREATE TABLE IF NOT EXISTS demo_sample_records (
  demo_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  record_type TEXT NOT NULL,
  record_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(demo_id,generation,record_type,record_key),
  FOREIGN KEY(demo_id) REFERENCES demo_environments(demo_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS demo_audit_events (
  event_id TEXT PRIMARY KEY,
  demo_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created','extended','reset','revoked')),
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(demo_id) REFERENCES demo_environments(demo_id)
);
CREATE INDEX IF NOT EXISTS idx_demo_audit_events_demo_created ON demo_audit_events(demo_id,created_at DESC);
CREATE TRIGGER IF NOT EXISTS trg_demo_audit_no_update
BEFORE UPDATE ON demo_audit_events BEGIN SELECT RAISE(ABORT,'demo audit events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_demo_audit_no_delete
BEFORE DELETE ON demo_audit_events BEGIN SELECT RAISE(ABORT,'demo audit events are append-only'); END;
