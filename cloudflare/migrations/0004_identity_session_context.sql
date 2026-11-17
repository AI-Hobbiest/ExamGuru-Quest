-- M2 identity/session context and controlled membership invitations.
-- Apply after cloudflare/schema.sql and migration 0003. This is additive;
-- legacy login/session columns and routes retain their existing semantics.

PRAGMA foreign_keys = ON;

ALTER TABLE auth_sessions ADD COLUMN active_institution_id TEXT REFERENCES institutions(institution_id) ON DELETE SET NULL;
ALTER TABLE auth_sessions ADD COLUMN active_membership_id TEXT REFERENCES institution_memberships(membership_id) ON DELETE SET NULL;
ALTER TABLE auth_sessions ADD COLUMN active_branch_id TEXT REFERENCES branches(branch_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_active_institution
  ON auth_sessions(user_id, active_institution_id, expires_at);

CREATE TABLE IF NOT EXISTS membership_invitations (
  invitation_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  institution_id TEXT NOT NULL REFERENCES institutions(institution_id) ON DELETE RESTRICT,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK(role IN ('school_admin','teacher','parent','student','institution_viewer')),
  branch_ids_json TEXT NOT NULL DEFAULT '[]',
  invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked','expired')),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_membership_id TEXT REFERENCES institution_memberships(membership_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_membership_invites_target_status
  ON membership_invitations(target_user_id,status,expires_at);
CREATE INDEX IF NOT EXISTS idx_membership_invites_institution
  ON membership_invitations(institution_id,status,created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_membership_invitation_branches_valid
BEFORE INSERT ON membership_invitations
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.branch_ids_json) b
    WHERE NOT EXISTS (
      SELECT 1 FROM branches br
      WHERE br.branch_id=CAST(b.value AS TEXT)
        AND br.institution_id=NEW.institution_id
        AND br.status='active'
    )
  ) THEN RAISE(ABORT,'invitation branch scope must belong to the institution and be active') END;
END;
