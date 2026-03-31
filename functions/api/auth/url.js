import { GOOGLE_SCOPES } from '../../../lib/tokens.js';

export async function onRequestGet(cfContext) {
  const { env, request } = cfContext;
  const url = new URL(request.url);
  const hostId = url.searchParams.get('host') || 'default';
  const baseUrl = env.BASE_URL || url.origin;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${baseUrl}/api/auth/callback`,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: hostId,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return new Response(JSON.stringify({ url: authUrl }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
