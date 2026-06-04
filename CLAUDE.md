# send-me-an-invite

Personal interview scheduling microsite at calendar.raiteri.net. Themeable Calendly alternative.

## Stack
- Frontend: Vite + vanilla JS/CSS (no framework). Pages: `src/{index,manage,setup}.html`
- Backend: Cloudflare Pages Functions (`functions/api/*`, helpers in `functions/lib/`)
- Storage: Cloudflare D1 (bookings) + KV (token cache); schema in `scripts/schema.sql`
- Calendar: Google Calendar API (3 accounts), OAuth helpers in `lib/` + `functions/lib/google*.js`
- MCP: `mcp/server.js` exposes booking as an agent tool (`agentical-mcp` bin)

## Architecture notes
- Cloudflare project/D1/KV are all named **`agentical`** (not `send-me-an-invite`) — see `wrangler.toml`
- Two lib dirs: `lib/` is Node-side (tests, MCP, mailers, tokens); `functions/lib/` is Worker-side
- Theming is pluggable: each theme is `themes/<name>/{theme.json,prompt.md}`, loaded via
  `src/js/theme-loader.js`. ~10 themes exist (spring-easter, ocean, neon, …) — not Easter-only
- Owner/meeting-type config (not secrets) lives in `config.json`

## Conventions
- All animations: CSS keyframes + transform/opacity only (compositor-friendly); no animation libs
- CSS split: `src/styles/{main,animations,creatures}.css`; palette via CSS custom properties
- Credentials NEVER in repo — use `wrangler secret put`
- Co-author line: `Co-Authored-By: @ashrocket collective`

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — production build (to `dist/`)
- `npm test` — Vitest (`vitest run`); `npm run test:watch` to watch
- `npm run deploy` — build + `wrangler pages deploy dist`
- `npm run setup-oauth` — run Google OAuth flow (`scripts/setup-oauth.js`)
- `npm run mcp` — start the MCP booking server (`mcp/server.js`)
