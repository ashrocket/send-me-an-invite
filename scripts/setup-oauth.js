import http from 'node:http';
import { execSync } from 'node:child_process';
import readline from 'node:readline';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  console.log('\n🗓️  Agentical — Google Calendar Setup\n');
  console.log('This script connects your Google Calendar to Agentical.\n');

  const clientId = await ask('Google OAuth Client ID: ');
  const clientSecret = await ask('Google OAuth Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Client ID and Secret are required.');
    process.exit(1);
  }

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  console.log('\nOpening browser for Google authorization...\n');

  // Try to open browser
  try {
    const platform = process.platform;
    if (platform === 'darwin') execSync(`open "${authUrl}"`);
    else if (platform === 'linux') execSync(`xdg-open "${authUrl}"`);
    else if (platform === 'win32') execSync(`start "${authUrl}"`);
  } catch {
    console.log(`Open this URL in your browser:\n${authUrl}\n`);
  }

  // Start temp server to catch callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error: ${error}</h1>`);
        reject(new Error(error));
        server.close();
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success! You can close this tab.</h1>');
        resolve(code);
        server.close();
      }
    });

    server.listen(PORT, () => {
      console.log(`Waiting for Google callback on port ${PORT}...`);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('Timeout waiting for callback (60s)'));
    }, 60000);
  });

  console.log('\nReceived authorization code. Exchanging for tokens...\n');

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error('Token exchange failed:', err);
    process.exit(1);
  }

  const tokens = await tokenRes.json();

  console.log('✅ Authorization successful!\n');
  console.log('Run these commands to store your secrets:\n');
  console.log(`  wrangler secret put GOOGLE_CLIENT_ID`);
  console.log(`  # paste: ${clientId.trim()}\n`);
  console.log(`  wrangler secret put GOOGLE_CLIENT_SECRET`);
  console.log(`  # paste: ${clientSecret.trim()}\n`);
  console.log(`  wrangler secret put GOOGLE_REFRESH_TOKEN`);
  console.log(`  # paste: ${tokens.refresh_token}\n`);

  if (tokens.refresh_token) {
    console.log('Refresh token (copy this — it is only shown once):');
    console.log(`\n  ${tokens.refresh_token}\n`);
  } else {
    console.log('⚠️  No refresh token received. This usually means the app was already authorized.');
    console.log('   Revoke access at https://myaccount.google.com/permissions and try again.\n');
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
