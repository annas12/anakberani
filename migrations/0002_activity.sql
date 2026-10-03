CREATE TABLE IF NOT EXISTS daily_checkins (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 value TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO daily_checkins SELECT id,user_id,child_id,value,note,created_at FROM checkins WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_child ON daily_checkins(child_id,created_at);
ALTER TABLE incidents ADD COLUMN approximate_time TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN involved TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN repeated INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_incidents_child ON incidents(child_id,created_at);
ALTER TABLE training_progress ADD COLUMN emotion INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS program_progress (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 30), answer INTEGER,
 checks TEXT NOT NULL DEFAULT '[]', completed_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(child_id,day)
);
CREATE TABLE IF NOT EXISTS reflections (
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 30), note TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(child_id,day)
);
CREATE TABLE IF NOT EXISTS simulation_results (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 scenario_id TEXT NOT NULL, path TEXT NOT NULL, scores TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_simulation_child ON simulation_results(child_id,created_at);
CREATE TABLE IF NOT EXISTS parent_child_exercises (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 exercise_id TEXT NOT NULL, completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(child_id,exercise_id)
);
CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);
