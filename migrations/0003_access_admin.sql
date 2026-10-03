PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS access_entitlements (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','scalev')),
  provider_product_id TEXT,
  provider_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  activated_at TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  internal_note TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_entitlements_email
  ON access_entitlements(lower(email));
CREATE INDEX IF NOT EXISTS idx_access_entitlements_status
  ON access_entitlements(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_access_entitlements_user
  ON access_entitlements(user_id);

CREATE TABLE IF NOT EXISTS admin_access_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_email TEXT NOT NULL COLLATE NOCASE,
  entitlement_id TEXT,
  old_status TEXT,
  new_status TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created
  ON admin_access_logs(created_at DESC);
