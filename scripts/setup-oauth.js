#!/usr/bin/env node
/**
 * Interactive OAuth 2.0 setup for the three Google Calendar accounts.
 * Exchanges authorization codes for refresh tokens and stores them
 * as Cloudflare Worker secrets via `wrangler secret put`.
 *
 * Usage:  node scripts/setup-oauth.js
 */

import { createServer }    from 'http';
import { exec }            from 'child_process';
import { createInterface } from 'readline';

const ACCOUNTS = [
  { label: 'Gmail (primary)',          secret: 'GOOGLE_TOKEN_PRIMARY' },
  { label: 'ashley@raiteri.net',       secret: 'GOOGLE_TOKEN_RAITERI' },
  { label: 'ashley.raiteri@kureapp.com', secret: 'GOOGLE_TOKEN_KURE'  },
];

const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES       = 'https://www.googleapis.com/auth/calendar';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nGoogle Calendar OAuth Setup');
  console.log('============================\n');

  const clientId     = (await ask('OAuth Client ID:     ')).trim();
  const clientSecret = (await ask('OAuth Client Secret: ')).trim();

  for (const account of ACCOUNTS) {
    console.log(`\n─── ${account.label} ───`);

    const authUrl = buildAuthUrl(clientId);
    console.log(`\nOpening browser… if nothing opens, paste this URL:\n${authUrl}\n`);
    openBrowser(authUrl);

    const code = await listenForCode();
    console.log('Code received. Exchanging for tokens…');

    const tokens = await exchangeCode(code, clientId, clientSecret);

    if (!tokens.refresh_token) {
      console.error(
        '✗ No refresh_token returned.\n' +
        '  Ensure access_type=offline and prompt=consent are in the auth URL.'
      );
      process.exit(1);
    }

    await storeSecret(account.secret, tokens.refresh_token);
    console.log(`✓ ${account.secret} stored.`);
  }

  console.log('\nStoring client credentials…');
  await storeSecret('GOOGLE_CLIENT_ID',     clientId);
  await storeSecret('GOOGLE_CLIENT_SECRET', clientSecret);

  console.log('\n✓ All secrets stored. OAuth setup complete.\n');
  rl.close();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAuthUrl(clientId) {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32'  ? 'start'
            : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function listenForCode() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const parsed = new URL(req.url, `http://localhost:3333`);
      const code   = parsed.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful — you can close this tab.</h1>');
        server.close();
        resolve(code);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization failed — no code received.</h1>');
        server.close();
        reject(new Error('No authorization code in callback'));
      }
    });

    server.listen(3333, () =>
      console.log('Listening for OAuth callback on http://localhost:3333/callback …')
    );

    server.on('error', reject);
  });
}

async function exchangeCode(code, clientId, clientSecret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

function storeSecret(name, value) {
  return new Promise((resolve, reject) => {
    const child = exec(`wrangler secret put ${name}`, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message));
      else resolve(stdout);
    });
    child.stdin.write(value);
    child.stdin.end();
  });
}

// ── Run ───────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error(`\nSetup failed: ${err.message}`);
  rl.close();
  process.exit(1);
});
