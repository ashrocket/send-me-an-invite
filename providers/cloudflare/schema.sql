-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  meeting_type TEXT NOT NULL,
  date TEXT NOT NULL,
  start_hour REAL NOT NULL,
  duration_minutes INTEGER NOT NULL,
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  notes TEXT DEFAULT '',
  booking_code TEXT NOT NULL UNIQUE,
  magic_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  google_event_id TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_host_date ON bookings(host_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_magic_token ON bookings(magic_token);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_booker_email ON bookings(booker_email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(host_id, status);

-- Host configuration table
CREATE TABLE IF NOT EXISTS hosts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  headline TEXT DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  google_refresh_token TEXT NOT NULL,
  calendar_ids TEXT NOT NULL DEFAULT '[]',
  meeting_types TEXT NOT NULL DEFAULT '[]',
  availability TEXT NOT NULL DEFAULT '{}',
  theme TEXT NOT NULL DEFAULT 'spring-easter',
  mailer_provider TEXT NOT NULL DEFAULT 'resend',
  mailer_config TEXT NOT NULL DEFAULT '{}',
  billing_plan TEXT DEFAULT NULL,
  billing_status TEXT DEFAULT 'active',
  auto_renew_ack INTEGER DEFAULT 0,
  stripe_customer_id TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_booking_at TEXT DEFAULT NULL
);

-- Usage tracking (hosted tier)
CREATE TABLE IF NOT EXISTS usage_monthly (
  host_id TEXT NOT NULL,
  month TEXT NOT NULL,
  bookings_count INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  mcp_calls INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  theme_updates INTEGER DEFAULT 0,
  PRIMARY KEY (host_id, month)
);
