-- D1 schema for send-me-an-invite
-- Apply with: wrangler d1 execute send-me-an-invite-db --file=scripts/schema.sql

CREATE TABLE IF NOT EXISTS bookings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  datetime     TEXT    NOT NULL,
  duration     INTEGER NOT NULL,
  meeting_type TEXT    NOT NULL,
  notes        TEXT    DEFAULT '',
  created_at   TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'confirmed'
);

CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings (datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_email    ON bookings (email);
