import { exchangeAuthCode } from '../../../lib/tokens.js';
import { error } from '../../lib/response.js';

export async function onRequestGet(cfContext) {
  const { env, request } = cfContext;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // contains hostId
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return new Response(`<html><body><h1>Authorization Failed</h1><p>${errorParam}</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    });
  }

  if (!code) {
    return error('Missing authorization code', 400);
  }

  const hostId = state || 'default';
  const baseUrl = env.BASE_URL || `https://${hostId}.agentical.com`;

  try {
    const tokens = await exchangeAuthCode({
      code,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${baseUrl}/api/auth/callback`,
    });

    // Store refresh token in D1
    const existingHost = await env.DB.prepare('SELECT id FROM hosts WHERE id = ?').bind(hostId).first();

    if (existingHost) {
      await env.DB.prepare('UPDATE hosts SET google_refresh_token = ? WHERE id = ?')
        .bind(tokens.refreshToken, hostId).run();
    } else {
      // Create new host entry with defaults
      await env.DB.prepare(`
        INSERT INTO hosts (id, name, google_refresh_token, meeting_types, availability)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        hostId,
        'New User',
        tokens.refreshToken,
        JSON.stringify([
          { id: 'intro', name: '30-Minute Intro Call', duration: 30, description: 'Quick intro and initial conversation' },
          { id: 'deep-dive', name: '60-Minute Deep Dive', duration: 60, description: 'In-depth technical or strategic discussion' },
        ]),
        JSON.stringify({ days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, bufferMinutes: 15 })
      ).run();
    }

    // Cache access token in KV
    if (tokens.accessToken) {
      const ttl = Math.max((tokens.expiresIn || 3600) - 300, 60);
      await env.CACHE.put(`token:${hostId}`, tokens.accessToken, { expirationTtl: ttl });
    }

    // Redirect to setup wizard or success page
    return new Response(`<html><body>
      <h1>Connected!</h1>
      <p>Google Calendar is now connected. You can close this window.</p>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-success', hostId: '${hostId}' }, '*');
          setTimeout(() => window.close(), 2000);
        }
      </script>
    </body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return new Response(`<html><body><h1>Authorization Error</h1><p>${err.message}</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
}
