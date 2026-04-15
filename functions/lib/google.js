/**
 * Google Calendar API helpers for Cloudflare Workers.
 * All functions throw on non-OK responses.
 */

/**
 * Exchange a refresh token for a fresh access token.
 * @returns {Promise<{access_token:string, expires_in:number, token_type:string}>}
 */
export async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.status);
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Query free/busy across multiple calendars (one per access token).
 * Returns a merged, de-duplicated array of {start, end} busy periods.
 *
 * @param {string[]} accessTokens  One per calendar account
 * @param {string[]} calendarIds   Parallel array; use 'primary' for the default calendar
 * @param {string}   timeMin       ISO 8601
 * @param {string}   timeMax       ISO 8601
 * @returns {Promise<{start:string, end:string}[]>}
 */
export async function getFreeBusy(accessTokens, calendarIds, timeMin, timeMax) {
  const results = await Promise.allSettled(
    accessTokens.map(async (token, i) => {
      const calId = calendarIds[i] ?? 'primary';
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: calId }],
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      return data.calendars?.[calId]?.busy ?? [];
    })
  );

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

/**
 * Create a Google Calendar event on the primary calendar and invite an attendee.
 *
 * @param {string} accessToken
 * @param {{ summary:string, description:string, start:string, end:string,
 *           attendeeEmail:string, timezone:string }} options
 * @returns {Promise<object>} Created event resource
 */
export async function createEvent(
  accessToken,
  { summary, description, start, end, attendeeEmail, timezone }
) {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start:     { dateTime: start, timeZone: timezone },
        end:       { dateTime: end,   timeZone: timezone },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => res.status);
    throw new Error(`Create event failed (${res.status}): ${body}`);
  }

  return res.json();
}
