# Agentical — Complete Product Spec

**Date:** 2026-03-30
**Status:** Approved
**Domain:** agentical.com
**Repo:** agentical
**Tagline:** "Your calendar, your agent, your rules."
**License:** MIT (open source)

---

## 1. Product Overview

Agentical is an open-source, AI-native scheduling platform. Humans book through a pretty web UI. AI agents book through MCP. Hosts customize everything — including the visual theme — through their own agent.

### What it is

A self-hosted Calendly alternative where:
- Your AI agent **styles** the calendar (themes are prompts)
- Your AI agent **manages** it (availability, meeting types, settings)
- Other people's AI agents **book** on it (via MCP)
- Humans can also book via a traditional web UI
- The web UI is just one interface — the MCP is the real product

### Audiences

- **Hosts** — people who want their own scheduling page (freelancers, founders, recruiters, consultants, coaches)
- **Bookers** — humans visiting the web UI, or AI agents calling the MCP

### What makes it different from Calendly

- Open source (MIT), self-hostable, no vendor lock-in
- MCP server for agent-to-agent scheduling
- Themes are prompts — tell your agent "make it brutalist" and it generates the theme
- Hosting plugin system (Cloudflare ships first; Vercel, Heroku, etc. via community PRs)
- Customer-friendly billing: $3/year hosted, pause if inactive, no surprise charges
- Single Google OAuth connection handles both calendar reads AND email sending (no separate email service)

---

## 2. Architecture

### Design principle: Shared core, dual interface

```
┌─────────────────────────────────────────────┐
│                 Core Library                 │
│          lib/calendar.js  (pure logic)      │
│  check_availability · book · cancel · etc.  │
│          lib/theme.js  (CSS generator)      │
│          lib/mailer.js  (pluggable email)   │
└──────────────┬──────────────┬───────────────┘
               │              │
      ┌────────▼───┐   ┌─────▼──────┐
      │  REST API  │   │ MCP Server │
      │  /api/*    │   │   tools    │
      └────────┬───┘   └─────┬──────┘
               │              │
      ┌────────▼───┐   ┌─────▼──────┐
      │  Web UI    │   │ AI Agents  │
      │  (humans)  │   │ (Claude,   │
      │            │   │  GPT, etc) │
      └────────────┘   └────────────┘
```

### Modules

| Module | Purpose | Dependencies |
|--------|---------|-------------|
| `lib/calendar.js` | Pure scheduling logic: availability calculation, booking CRUD, conflict detection | None (pure functions) |
| `lib/theme.js` | Converts theme.json to CSS custom properties, validates theme structure | None (pure functions) |
| `lib/mailer.js` | Mailer abstraction — routes to configured provider | Provider config |
| `lib/mailers/cloudflare.js` | Cloudflare Email Service (native Worker binding, no API key) | CF Email Service beta |
| `lib/mailers/resend.js` | Resend mailer — fallback until CF Email Service GA | `RESEND_API_KEY` secret |
| `lib/mailers/sendgrid.js` | SendGrid mailer (self-hosted option) | `SENDGRID_API_KEY` secret |
| `lib/mailers/smtp.js` | Generic SMTP mailer (self-hosted option) | SMTP credentials |
| `lib/tokens.js` | Manages Google OAuth token refresh, caches access tokens in KV | KV store binding |
| `lib/booking-codes.js` | Generates and validates magic links + booking codes (AC-XXXX) | Crypto (Web Crypto API) |

### Key constraints

- **Core library has zero HTTP/framework dependencies.** Both REST and MCP import the same functions.
- **No Node.js-only APIs.** Must run on Cloudflare Workers (V8 isolates). Use `fetch()` for HTTP, Web Crypto for tokens.
- **Google OAuth is Calendar-only.** Two scopes: `calendar.readonly` + `calendar.events`. No Gmail scope needed.
- **We send all emails.** Hosted tier sends from `noreply@agentical.com`. Users never grant email permissions. Self-hosters configure their own mailer.
- **All state in D1 + KV.** D1 for bookings/users, KV for token cache. No filesystem, no in-memory state.

---

## 3. Project Structure

```
agentical/
├── src/                           # Frontend source
│   ├── index.html                 # Main booking flow (5-step wizard)
│   ├── manage.html                # Booking management (reschedule/cancel via magic link)
│   ├── setup.html                 # Onboarding wizard (hosted at /setup)
│   ├── js/
│   │   ├── app.js                 # Booking flow state machine
│   │   ├── manage.js              # Manage booking page logic
│   │   ├── setup.js               # Onboarding wizard logic
│   │   ├── theme-loader.js        # Reads theme.json, injects CSS custom properties
│   │   └── confetti.js            # Confirmation confetti animation
│   └── styles/
│       ├── main.css               # Base layout + components (uses CSS custom properties)
│       ├── animations.css         # Micro-animations (compositor-friendly)
│       └── creatures.css          # Ambient animated elements
├── lib/                           # Shared core library (pure logic, no HTTP)
│   ├── calendar.js                # Availability + booking logic
│   ├── theme.js                   # Theme → CSS custom properties
│   ├── mailer.js                  # Mailer abstraction (routes to configured provider)
│   ├── mailers/                   # Mailer provider plugins
│   │   ├── cloudflare.js          # Cloudflare Email Service (native binding, no API key)
│   │   ├── resend.js              # Resend API (fallback until CF Email GA)
│   │   ├── sendgrid.js            # SendGrid API (self-hosted option)
│   │   └── smtp.js                # Generic SMTP (self-hosted option)
│   ├── tokens.js                  # OAuth token refresh + caching
│   └── booking-codes.js           # Magic link + booking code generation
├── functions/                     # Cloudflare Workers (REST API)
│   ├── api/
│   │   ├── availability.js        # GET /api/availability?date=YYYY-MM-DD&type=intro
│   │   ├── book.js                # POST /api/book
│   │   ├── cancel.js              # POST /api/cancel
│   │   ├── reschedule.js          # POST /api/reschedule
│   │   ├── manage.js              # GET /api/manage?token=xxx (lookup booking)
│   │   ├── recover.js             # POST /api/recover (resend magic link)
│   │   ├── meeting-types.js       # GET /api/meeting-types
│   │   └── theme.js               # GET /api/theme (returns current theme.json)
│   └── lib/
│       └── auth.js                # Google OAuth callback handler
├── mcp/                           # MCP server (wraps core library)
│   ├── server.js                  # MCP server entry point
│   └── tools/                     # One file per MCP tool
│       ├── check-availability.js
│       ├── book-meeting.js
│       ├── cancel-meeting.js
│       ├── reschedule-meeting.js
│       ├── get-meeting-types.js
│       ├── send-invite.js
│       ├── update-theme.js
│       └── set-availability.js
├── themes/                        # Bundled themes (10 total)
│   ├── spring-easter/
│   │   ├── prompt.md              # The prompt that generated this theme
│   │   └── theme.json             # Generated output (colors, fonts, shapes)
│   ├── brutalist/
│   ├── midnight/
│   ├── terminal/
│   ├── ocean/
│   ├── sunset/
│   ├── monochrome/
│   ├── neon/
│   ├── earth/
│   └── candy/
├── providers/                     # Hosting plugins
│   └── cloudflare/
│       ├── adapter.js             # Wires core lib to Workers runtime
│       ├── schema.sql             # D1 migration for bookings table
│       ├── deploy-button.md       # One-click deploy instructions
│       └── wrangler.toml          # Template wrangler config
├── scripts/
│   ├── setup-oauth.js             # Interactive Google OAuth setup
│   ├── populate-calendars.js      # Populate test calendars with events
│   └── generate-theme.js          # Generate theme.json from a prompt
├── test/
│   ├── unit/                      # Core library unit tests
│   ├── integration/               # REST API tests with mock data
│   ├── mcp/                       # MCP tool tests
│   └── mock-calendars.js          # Mock Google Calendar data (4 test users)
├── config.json                    # Default app configuration
├── package.json
├── vite.config.js
├── wrangler.toml
└── CLAUDE.md
```

---

## 4. Database Schema (D1)

```sql
-- Bookings table
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,                    -- UUID
  host_id TEXT NOT NULL,                  -- subdomain or user identifier
  meeting_type TEXT NOT NULL,             -- 'intro' | 'deep-dive'
  date TEXT NOT NULL,                     -- 'YYYY-MM-DD'
  start_hour REAL NOT NULL,              -- e.g. 14.5 = 2:30 PM
  duration_minutes INTEGER NOT NULL,      -- 30 or 60
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  notes TEXT DEFAULT '',
  booking_code TEXT NOT NULL UNIQUE,      -- e.g. 'AC-7K2F'
  magic_token TEXT NOT NULL UNIQUE,       -- URL-safe random token
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled | rescheduled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bookings_host_date ON bookings(host_id, date);
CREATE INDEX idx_bookings_magic_token ON bookings(magic_token);
CREATE INDEX idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX idx_bookings_booker_email ON bookings(booker_email);

-- Host configuration table (for hosted tier)
CREATE TABLE hosts (
  id TEXT PRIMARY KEY,                    -- subdomain name
  name TEXT NOT NULL,
  headline TEXT DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  google_refresh_token TEXT NOT NULL,     -- encrypted
  calendar_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of calendar IDs to check
  meeting_types TEXT NOT NULL DEFAULT '[]', -- JSON array of meeting type configs
  availability TEXT NOT NULL DEFAULT '{}', -- JSON: { days, startHour, endHour, bufferMinutes }
  theme TEXT NOT NULL DEFAULT 'spring-easter', -- theme directory name or custom theme.json
  mailer_provider TEXT NOT NULL DEFAULT 'resend', -- resend | cloudflare | sendgrid | smtp
  mailer_config TEXT NOT NULL DEFAULT '{}',       -- JSON: provider-specific config
  billing_plan TEXT DEFAULT NULL,         -- 'annual' | 'quarterly' | NULL (self-hosted)
  billing_status TEXT DEFAULT 'active',   -- active | paused | dormant
  auto_renew_ack INTEGER DEFAULT 0,       -- 1 = skip reminder emails
  stripe_customer_id TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_booking_at TEXT DEFAULT NULL
);

-- Usage tracking (for hosted tier fair use limits)
CREATE TABLE usage_monthly (
  host_id TEXT NOT NULL,
  month TEXT NOT NULL,                    -- 'YYYY-MM'
  bookings_count INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  mcp_calls INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  theme_updates INTEGER DEFAULT 0,
  PRIMARY KEY (host_id, month)
);
```

---

## 5. Google OAuth + Email System

### Google OAuth (Calendar only — no email permissions)

Users connect Google for calendar access only. Two scopes:

```
https://www.googleapis.com/auth/calendar.readonly    (read freebusy)
https://www.googleapis.com/auth/calendar.events       (create/update/delete events)
```

No `gmail.send` scope. Cleaner consent screen, less scary for users. We handle email ourselves.

### Token flow

1. User clicks "Connect Google Calendar" in onboarding wizard
2. Redirect to Google OAuth with calendar scopes only
3. Google returns auth code → exchange for refresh token + access token
4. Store refresh token encrypted in D1 (hosts table)
5. Cache access tokens in KV (TTL: 55 minutes, tokens expire at 60)
6. On each API call: check KV cache → if expired, use refresh token to get new access token

### Email: we send it, not the user

All emails are sent from `noreply@agentical.com` by our infrastructure. Users never need to grant email permissions or configure email providers. The volume is tiny — even 1,000 active users booking 5x/month = ~15,000 emails/month.

**Hosted tier:** We manage email sending. Users never see an API key or configure anything.

**Self-hosted tier:** Users configure their own mailer (Resend, SendGrid, SMTP, etc.) since they're running on their own infrastructure.

### Mailer abstraction

```javascript
// lib/mailer.js
import { CloudflareMailer } from './mailers/cloudflare.js';
import { ResendMailer } from './mailers/resend.js';
import { SendGridMailer } from './mailers/sendgrid.js';
import { SmtpMailer } from './mailers/smtp.js';

const MAILERS = {
  cloudflare: CloudflareMailer,
  resend: ResendMailer,
  sendgrid: SendGridMailer,
  smtp: SmtpMailer,
};

export function createMailer(config) {
  const Provider = MAILERS[config.provider];
  if (!Provider) throw new Error(`Unknown mailer: ${config.provider}`);
  return new Provider(config);
}

// Every mailer implements:
// async send({ to, subject, html, from? }) → { success: boolean, messageId?: string }
```

### Mailer interface

Each mailer in `lib/mailers/` implements:

```javascript
export class SomeMailer {
  constructor(config) {}
  async send({ to, subject, html, from }) {}  // returns { success, messageId }
}
```

### Bundled mailers

| Mailer | Who uses it | Config needed | Cost |
|--------|------------|--------------|------|
| **Cloudflare Email Service** | Hosted tier (when beta goes GA) | None — native Worker binding | Included |
| **Resend** | Hosted tier (fallback until CF Email GA) | Our API key (managed by us) | Free tier: 3K/month |
| **SendGrid** | Self-hosted users | Their `SENDGRID_API_KEY` | Free tier: 100/day |
| **SMTP** | Self-hosted users | Their SMTP credentials | Varies |

### Hosted tier email strategy

1. **Now:** Resend with our API key. Free tier covers early users easily.
2. **When CF Email Service goes GA:** Switch to native Cloudflare binding. Zero API keys, zero cost.
3. **At scale:** Either CF Email or upgrade Resend plan. Even at 100K emails/month the cost is negligible.

Self-hosted users configure their own mailer — it's their infrastructure, their choice.

---

## 6. MCP Tools

The MCP server exposes these tools:

### check_availability

```
Input:  { date_range: { start: "2026-04-01", end: "2026-04-07" }, meeting_type: "intro" }
Output: { dates: [ { date: "2026-04-01", slots: [9, 10, 14, 15.5] }, ... ] }
```

### book_meeting

```
Input:  { date: "2026-04-01", start_hour: 14, meeting_type: "intro",
          booker_name: "Jane Doe", booker_email: "jane@example.com", notes: "..." }
Output: { booking_id: "uuid", booking_code: "AC-7K2F", magic_link: "https://...",
          confirmation: "30-Minute Intro Call on Tuesday, April 1 at 2:00 PM" }
```

### cancel_meeting

```
Input:  { booking_id: "uuid" } or { magic_token: "abc123" } or { booking_code: "AC-7K2F" }
Output: { cancelled: true, message: "Booking cancelled. Both parties notified." }
```

### reschedule_meeting

```
Input:  { booking_id: "uuid", new_date: "2026-04-03", new_start_hour: 10 }
Output: { rescheduled: true, new_confirmation: "..." }
```

### get_meeting_types

```
Input:  {}
Output: { types: [ { id: "intro", name: "30-Minute Intro Call", duration: 30 }, ... ] }
```

### send_invite

```
Input:  {}
Output: { mcp_endpoint: "https://agentical.com/ashley/mcp", message: "Share this endpoint
          with anyone's AI agent to let them book time with you." }
```

### update_theme

```
Input:  { theme: { name: "My Custom", colors: { primary: "#FF6B6B", ... }, ... } }
Output: { applied: true, preview_url: "https://agentical.com/ashley" }
```

### set_availability

```
Input:  { days: [1,2,3,4,5], start_hour: 9, end_hour: 17, buffer_minutes: 15 }
Output: { updated: true }
```

---

## 7. Theme System

### How themes work

A theme is a `theme.json` file that maps to CSS custom properties. The frontend reads theme.json at load time and injects the values as CSS custom properties on `:root`.

### theme.json schema

```json
{
  "name": "Spring Easter",
  "colors": {
    "primary": "#C3B1E1",
    "primary-light": "#E8DFF5",
    "accent": "#A8E6CF",
    "accent-light": "#D4F5E9",
    "background": "#FFF8E7",
    "surface": "#FFFFFF",
    "text": "#4A4A4A",
    "text-muted": "#8A8A8A",
    "border": "#E8E3D9",
    "shadow": "rgba(195, 177, 225, 0.15)",
    "success": "#A8E6CF",
    "error": "#FFB7B2"
  },
  "fonts": {
    "body": "Inter",
    "heading": "Inter",
    "mono": "JetBrains Mono"
  },
  "shape": {
    "card-radius": "20px",
    "btn-radius": "12px"
  },
  "effects": {
    "cursor": "dragonfly",
    "ambient-dots": true,
    "creatures": true,
    "confetti-colors": ["#C3B1E1", "#A8E6CF", "#FFEAA7", "#FFB7B2", "#A0D2DB"]
  }
}
```

### 10 bundled themes

Each theme ships as `prompt.md` (how it was described) + `theme.json` (the generated output):

1. **spring-easter** — Soft pastels, Easter eggs, dragonfly cursor, floating dots
2. **brutalist** — Raw, bold, monospace, harsh borders, no rounded corners
3. **midnight** — Dark mode, deep navy/purple, subtle glow effects
4. **terminal** — Green-on-black, monospace everything, blinking cursor
5. **ocean** — Blues and teals, wave-like animations, calm
6. **sunset** — Warm oranges and pinks, gradient backgrounds
7. **monochrome** — Black and white only, clean typography
8. **neon** — Dark background, bright neon accents, cyberpunk
9. **earth** — Greens and browns, organic shapes, nature
10. **candy** — Bright primary colors, playful, rounded everything

### Custom themes via AI agent

User tells their agent a prompt like "make my calendar look like a 90s geocities page." The agent generates a theme.json following the schema above and calls the `update_theme` MCP tool to apply it. The prompt.md is optional but encouraged for remixing.

---

## 8. Time Slot Presentation

### Smart slot rendering rules

1. Fetch available slots from `lib/calendar.js` (which checks Google Calendar freebusy + existing bookings + availability config)
2. If **0 slots**: show "No available times on this day"
3. If **1-3 slots**: show as a flat vertical list (no grouping)
4. If **4+ slots**: group into **Morning** (before 12 PM) and **Afternoon** (12 PM+) sections
5. Top-of-hour slots (:00) get `font-weight: 600` as the preferred option
6. Half-hour slots (:30) shown at normal weight

### Slot generation logic

```javascript
// Candidate slots: top-of-hour first, then :30
// For 30-min meetings: [9:00, 9:30, 10:00, 10:30, ...]
// For 60-min meetings: [9:00, 10:00, 11:00, ...]
// Filter out: busy periods (from Google Calendar freebusy)
//             existing bookings (from D1)
//             outside availability hours
//             buffer violations (15 min before/after busy periods)
```

---

## 9. Booking Lifecycle

### Create booking

1. Booker selects meeting type → date → time slot → fills in name + email + notes
2. Backend checks slot is still available (double-booking prevention)
3. Creates booking in D1 with status `confirmed`
4. Creates Google Calendar event on host's calendar (with booker as attendee)
5. Generates booking code (e.g. `AC-7K2F`) and magic token
6. Sends confirmation email to both host and booker via mailer (from `noreply@agentical.com`)
7. Booker's email includes magic link + booking code
8. Web UI shows confirmation screen with confetti animation

### Reschedule

1. Booker opens magic link or enters booking code at `/manage`
2. Sees current booking details + "Reschedule" button
3. Picks a new date + time slot (same availability flow)
4. Backend updates booking in D1, updates Google Calendar event
5. Sends rescheduled notification emails to both parties

### Cancel

1. Booker opens magic link or enters booking code at `/manage`
2. Sees current booking details + "Cancel" button
3. Confirms cancellation
4. Backend updates booking status to `cancelled`, deletes Google Calendar event
5. Sends cancellation emails to both parties

### Magic link recovery

1. Booker visits `/manage` without a token
2. Enters their email address
3. Backend finds all active bookings for that email
4. Sends email with magic links for each booking

---

## 10. REST API Endpoints

### GET /api/availability

```
Query: ?date=2026-04-01&type=intro
Response: {
  "slots": [9, 10.5, 14, 15],
  "morning": [9, 10.5],
  "afternoon": [14, 15],
  "date": "2026-04-01",
  "meeting_type": { "id": "intro", "name": "30-Minute Intro Call", "duration": 30 }
}
```

### POST /api/book

```
Body: { "meeting_type": "intro", "date": "2026-04-01", "start_hour": 14,
        "name": "Jane Doe", "email": "jane@example.com", "notes": "..." }
Response: {
  "booking_id": "uuid",
  "booking_code": "AC-7K2F",
  "magic_link": "https://agentical.com/manage?token=abc123",
  "summary": "30-Minute Intro Call on Tuesday, April 1 at 2:00 PM"
}
```

### POST /api/cancel

```
Body: { "token": "abc123" } or { "booking_code": "AC-7K2F" }
Response: { "cancelled": true }
```

### POST /api/reschedule

```
Body: { "token": "abc123", "new_date": "2026-04-03", "new_start_hour": 10 }
Response: { "rescheduled": true, "summary": "..." }
```

### GET /api/manage?token=abc123

```
Response: {
  "booking": { "id": "...", "meeting_type": "intro", "date": "2026-04-01",
               "start_hour": 14, "status": "confirmed", "booker_name": "Jane Doe" },
  "can_reschedule": true,
  "can_cancel": true
}
```

### POST /api/recover

```
Body: { "email": "jane@example.com" }
Response: { "sent": true, "message": "If bookings exist for that email, a management link has been sent." }
```

### GET /api/meeting-types

```
Response: { "types": [ { "id": "intro", "name": "30-Minute Intro Call", "duration": 30 }, ... ] }
```

### GET /api/theme

```
Response: { "name": "Spring Easter", "colors": { ... }, "fonts": { ... }, ... }
```

---

## 11. Hosting & Deployment

### Two tiers

| Tier | Price | Setup |
|------|-------|-------|
| **Self-hosted** | Free | Deploy to own Cloudflare account (or other provider via plugin) |
| **Hosted** | $3/year or $1.50/quarter | `yourname.agentical.com` — zero setup |

### Hosted tier architecture

- Wildcard DNS: `*.agentical.com` → single Cloudflare Worker
- Worker reads subdomain from `Host` header → looks up host config in D1
- One deployment serves all hosted users
- Wildcard SSL auto-provisioned by Cloudflare (free)

### Self-hosted deployment (Cloudflare)

1. Fork the repo
2. `wrangler d1 create agentical` → get database ID
3. `wrangler d1 execute agentical --file=providers/cloudflare/schema.sql`
4. `wrangler kv:namespace create CACHE` → get namespace ID
5. Update `wrangler.toml` with IDs
6. Run `node scripts/setup-oauth.js` → complete Google OAuth → stores refresh token
7. `wrangler secret put GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN`
8. `npm run deploy`

### Hosting plugin interface

Each provider in `providers/` must export:

```javascript
export default {
  // Storage adapter
  async getBooking(id) {},
  async createBooking(data) {},
  async updateBooking(id, data) {},
  async listBookings(hostId, filters) {},

  // Host config
  async getHost(hostId) {},
  async updateHost(hostId, data) {},

  // Token cache
  async getCachedToken(key) {},
  async setCachedToken(key, value, ttlSeconds) {},

  // Usage tracking
  async incrementUsage(hostId, metric) {},
  async getUsage(hostId, month) {},
};
```

Anyone can PR a new provider (Vercel, Heroku, Railway, etc.) by implementing this interface.

---

## 12. Billing & Abuse Protection

### Pricing

| Plan | Price | Stripe Fee | Net Revenue |
|------|-------|-----------|-------------|
| Quarterly | $1.50/quarter ($6/year) | $0.35/charge ($1.40/year) | $4.60/year |
| Annual | $3/year | $0.39/charge | $2.61/year |

Annual is incentivized: half the cost for the user, one Stripe charge instead of four.

### Fair use limits (hosted tier, per user per month)

| Resource | Limit |
|----------|-------|
| Bookings created | 50 |
| Page views | 10,000 |
| MCP API calls | 1,000 |
| Emails sent | 100 |
| Theme updates | 20 |

When hit: calendar shows "This calendar is temporarily at capacity." No overage charges ever. Host gets an email suggesting self-hosting for unlimited.

### Anti-abuse

- Rate limiting: 60 req/min per subdomain
- Bot protection: Cloudflare Turnstile on booking form (free)
- Email verification required for hosted account creation
- Subdomain squatting: no bookings in 90 days → dormant (reactivatable)

### Billing rules

**No auto-rebill without usage or acknowledgment.**

- Zero activity this period → do NOT charge → email "We paused billing" → live 30 more days → dormant
- Activity + "I know" flag → charge → receipt
- Activity + no flag → 3 reminder emails (14, 7, 1 day before) → charge unless STOP received
- "I know" flag: opt-in during onboarding or settings, skips reminders, toggleable anytime

---

## 13. Onboarding Wizard

Hosted at `agentical.com/setup`. Interactive web pages, not CLI commands.

### Step 1: Welcome

"Your calendar, your agent, your rules." Hero showing what you'll get. Two paths: "Get Started" (new user) or "I have a booking code" (manage existing).

### Step 2: Connect Google Calendar

- "Connect Google Calendar" button → Google OAuth popup
- Scopes requested: `calendar.readonly`, `calendar.events`
- On success: show which calendars were found → user picks which ones to check for availability
- "Don't have a Google account?" path with guidance

### Step 3: Your Profile

Form fields:
- Name (pre-filled from Google profile if available)
- Headline (e.g. "Engineering Leader", "Freelance Designer")
- Meeting types: add/remove types with name, duration (15/30/45/60 min), description
- Available hours: day picker (Mon-Fri default) + start/end hour + buffer minutes

### Step 4: Choose a Theme

Grid of 10 bundled theme previews (thumbnail showing how the calendar looks). Click to preview, click again to select. "I'll customize later with my agent" option.

### Step 5: Host or Self-Host

Two cards:
- **Hosted** ($3/year or $1.50/quarter): pick your subdomain (`___.agentical.com`), enter payment via Stripe Checkout
- **Self-host** (free): choose provider (Cloudflare shown, others "coming soon"), paste API key, click Deploy

### Step 6: Done

- "Your site is live at `yourname.agentical.com`"
- Show MCP endpoint URL
- "Share this with anyone's AI agent to let them book time with you"
- Copy buttons for URL and MCP endpoint
- Confetti animation

---

## 14. Testing Strategy

### Mock calendar system

Four mock users with realistic schedules for local dev and CI. Each has recurring weekly meetings, lunch blocks, and seeded random one-off meetings. Deterministic PRNG (mulberry32, seeded by date + user ID) ensures reproducible schedules.

| User | Role | Schedule Pattern |
|------|------|-----------------|
| Ashley | Engineering Leader | Standups, 1:1s, architecture reviews, focus blocks |
| Jordan | Product Designer | Design reviews, workshops, user research |
| Priya | Freelance Consultant | Multiple client standups, strategy sessions |
| Marcus | Startup Founder | Board prep, investor calls, hiring blocks |

### Google Workspace sandbox

For real end-to-end testing:
1. Register `agentical.com` on Cloudflare
2. Start Google Workspace 14-day trial on `agentical.com`
3. Create test users: `ashley@agentical.com`, `jordan@agentical.com`, etc.
4. Run `scripts/populate-calendars.js` to fill their calendars with events matching mock patterns
5. Test full OAuth → freebusy → booking → email flow

### Test layers

| Layer | Tool | What it covers |
|-------|------|---------------|
| Unit | Vitest | Core lib: availability calc, booking logic, theme validation, code generation |
| Integration | Vitest + Miniflare | REST API endpoints with mock calendar data |
| MCP | Vitest | MCP tool invocations against mock data |
| E2E | Playwright | Full browser flow against Google Workspace sandbox |

---

## 15. Frontend Behavior

### Booking flow (index.html)

5-step wizard with CSS step transitions (stepIn/stepOut keyframes):

1. **Meeting type** — Click a meeting type button → advance to step 2
2. **Date picker** — Calendar grid showing current month. Disabled: weekends, past dates, days with zero available slots. Click a date → advance to step 3
3. **Time slots** — Grouped by morning/afternoon (if 4+) or flat list (if ≤3). Top-of-hour preferred. Click a slot → auto-advance to step 4 after 400ms
4. **Details form** — Floating label inputs: name, email, notes (optional). Submit button shows spinner during API call
5. **Confirmation** — Check mark animation, booking summary, booking code, "Book Another" button, confetti canvas animation

Back buttons on steps 2-4 return to previous step with exit animation.

### Manage booking (manage.html)

Two entry points:
- Magic link: `/manage?token=abc123` → loads booking directly
- Manual: `/manage` → enter booking code or email to find bookings

Shows: booking details, status, and action buttons (Reschedule / Cancel). Reschedule opens the date/time picker inline.

### Theme loading (theme-loader.js)

On page load:
1. Fetch `GET /api/theme` → get theme.json
2. For each property in theme.json, set CSS custom property on `:root`
3. If theme specifies a Google Font, inject `<link>` tag
4. If theme specifies a cursor, update cursor CSS

### Animations

All animations use compositor-friendly properties only (`transform`, `opacity`). Respect `prefers-reduced-motion`. Specific animations:
- Card entrance (translateY + scale)
- Step transitions (stepIn/stepOut)
- Button hover lift + shimmer
- Slot selection pop + ring pulse
- Form field focus bounce + underline sweep
- Confirmation check mark pop + glow
- Confetti canvas particles
- Ambient floating dots (CSS drift)
- Avatar pulse ring

---

## 16. v1 Scope

### In v1

- Web UI: booking flow, manage page, onboarding wizard
- Core library: availability, booking CRUD, theme engine, pluggable mailer
- REST API: all endpoints listed in section 10
- MCP server: all 8 tools listed in section 6
- Theme system: 10 bundled themes, custom themes via MCP
- Booking lifecycle: confirm, reschedule, cancel, magic links, booking codes, email notifications
- Hosting: Cloudflare provider plugin, hosted tier with wildcard subdomains
- Billing: Stripe integration, $3/year or $1.50/quarter, usage-based pause
- Testing: mock calendar system, Google Workspace sandbox, unit/integration/MCP/E2E tests
- Google OAuth is Calendar-only (no email permissions needed from users)
- Email sent from `noreply@agentical.com` via our infrastructure (Resend → Cloudflare Email Service when GA)

### Deferred to v2

- Conversational AI booking (chat interface, requires Anthropic/OpenAI API key)
- Additional hosting providers via community PRs (Vercel, Heroku, Railway)
- Custom domain support for hosted tier (BYOD with CNAME)
- Multiple calendar providers (Outlook, iCloud)
- Recurring meeting types
- Team/org scheduling (multiple hosts)
