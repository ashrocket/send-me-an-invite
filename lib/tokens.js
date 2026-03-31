export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export async function getAccessToken({ kv, hostId, refreshToken, clientId, clientSecret }) {
  const cacheKey = `token:${hostId}`;
  const cached = await kv.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const ttl = Math.max(data.expires_in - 300, 60);
  await kv.put(cacheKey, data.access_token, { expirationTtl: ttl });

  return data.access_token;
}

export async function exchangeAuthCode({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google auth code exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
