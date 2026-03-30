# send-me-an-invite

Personal interview scheduling microsite at calendar.raiteri.net. Easter-themed Calendly alternative.

## Stack
- Frontend: Vite + vanilla JS/CSS (no framework)
- Backend: Cloudflare Workers (functions/ directory)
- Storage: Cloudflare D1 (bookings) + KV (token cache)
- Calendar: Google Calendar API (3 accounts)

## Conventions
- All animations: CSS keyframes + transform/opacity only (compositor-friendly)
- No animation libraries — keep it lightweight
- Easter palette via CSS custom properties in main.css
- API routes in functions/api/, helpers in functions/lib/
- Credentials NEVER in repo — use `wrangler secret put`
- Co-author line: `Co-Authored-By: @ashrocket collective`

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run test` — run vitest
- `npm run deploy` — build + deploy to Cloudflare Pages
