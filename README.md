# send-me-an-invite

Personal interview scheduling microsite. Book time with Ashley Raiteri at [calendar.raiteri.net](https://calendar.raiteri.net).

Easter-themed, animation-rich scheduling tool that checks availability across multiple Google Calendars and creates events with invites.

## Features

- Real-time availability from 3 Google Calendars
- 30-minute and 60-minute meeting types
- Easter pastel design with micro-animations and tiny creatures
- Deployed on Cloudflare Pages + Workers
- Zero credentials in the repo

## Prerequisites

- Node.js 20+
- [Cloudflare account](https://dash.cloudflare.com)
- [Google Cloud project](https://console.cloud.google.com) with Calendar API enabled

## Setup

### 1. Clone and install

```bash
git clone git@github.com:ashrocket/send-me-an-invite.git
cd send-me-an-invite
npm install
```

### 2. Google Cloud project

1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Go to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Desktop application type)
5. Add your email addresses as test users under **OAuth consent screen** (if in testing mode)

### 3. Cloudflare resources

```bash
# Create D1 database
wrangler d1 create send-me-an-invite-db
# Copy the database_id into wrangler.toml

# Create KV namespace
wrangler kv namespace create CACHE
# Copy the namespace id into wrangler.toml

# Apply database schema
wrangler d1 execute send-me-an-invite-db --file=scripts/schema.sql
```

### 4. Authorize Google accounts

```bash
node scripts/setup-oauth.js
```

This interactive script will:
- Prompt for your Google OAuth client ID and secret
- Open a browser window for each of your 3 Google accounts
- Store refresh tokens as Cloudflare secrets (never locally)

### 5. DNS setup

Add a CNAME record for `calendar.raiteri.net` pointing to your Cloudflare Pages deployment URL.

### 6. Deploy

```bash
npm run deploy
```

## Development

```bash
npm run dev      # Local dev server (frontend only)
npm run test     # Run tests
npm run build    # Production build
```

Note: API endpoints require Cloudflare Workers runtime. Use `wrangler pages dev dist` for full-stack local development after building.

## Architecture

```
Frontend (Cloudflare Pages)     Backend (Cloudflare Workers)
├── Vite + vanilla JS/CSS       ├── GET /api/availability
├── Booking flow state machine  │   └── Google Calendar freebusy
├── Date picker                 ├── POST /api/book
├── Easter animations           │   └── Google Calendar event create
└── Pastel confetti             └── D1 bookings storage
```

## License

MIT
