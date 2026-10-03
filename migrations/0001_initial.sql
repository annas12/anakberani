PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_year INTEGER,
  school_level TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id TEXT,
  value TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_checkins_user_created ON checkins(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id TEXT,
  incident_type TEXT NOT NULL,
  incident_date TEXT,
  place TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  witness TEXT NOT NULL DEFAULT '',
  reported_status TEXT NOT NULL DEFAULT 'Belum dilaporkan',
  evidence_status TEXT NOT NULL DEFAULT 'Tidak ada bukti',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_incidents_user_created ON incidents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS training_progress (
  user_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  mental INTEGER NOT NULL DEFAULT 45,
  voice INTEGER NOT NULL DEFAULT 35,
  boundary_score INTEGER NOT NULL DEFAULT 40,
  situation INTEGER NOT NULL DEFAULT 30,
  safety INTEGER NOT NULL DEFAULT 50,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, child_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS completed_lessons (
  user_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, child_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);
