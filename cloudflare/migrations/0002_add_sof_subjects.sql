PRAGMA foreign_keys = OFF;
CREATE TABLE attempts_new (
  attempt_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),
  subject_id TEXT NOT NULL CHECK (subject_id IN ('science','mathematics','english','social-science','hindi','science-sof','mathematics-sof','english-sof')),
  mode TEXT NOT NULL,status TEXT NOT NULL CHECK (status IN ('submitted','timed-out')),started_at TEXT,submitted_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),score INTEGER NOT NULL CHECK (score >= 0),
  max_score INTEGER NOT NULL CHECK (max_score > 0),percentage REAL NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  payload_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,UNIQUE (user_id, attempt_id)
);
INSERT INTO attempts_new (attempt_id,user_id,subject_id,mode,status,started_at,submitted_at,duration_seconds,score,max_score,percentage,payload_json,created_at)
SELECT attempt_id,user_id,subject_id,mode,status,started_at,submitted_at,duration_seconds,score,max_score,percentage,payload_json,created_at FROM attempts;
DROP TABLE attempts;
ALTER TABLE attempts_new RENAME TO attempts;
CREATE INDEX IF NOT EXISTS idx_attempts_user_submitted ON attempts(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_subject_submitted ON attempts(subject_id, submitted_at DESC);
PRAGMA foreign_keys = ON;
