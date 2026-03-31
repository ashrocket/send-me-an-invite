import { getAccessToken } from '../../lib/tokens.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export async function getFreeBusy({ kv, host, date, env }) {
  const accessToken = await getAccessToken({
    kv,
    hostId: host.id,
    refreshToken: host.google_refresh_token,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  const tz = host.timezone || 'America/Chicago';
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const timeMin = `${dateStr}T00:00:00`;
  const timeMax = `${dateStr}T23:59:59`;

  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      timeZone: tz,
      items: host.calendar_ids.map(id => ({ id })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Google Calendar freebusy error: ${res.status}`);
  }

  const data = await res.json();
  const busyPeriods = [];

  for (const calId of Object.keys(data.calendars || {})) {
    for (const period of data.calendars[calId].busy || []) {
      const start = new Date(period.start);
      const end = new Date(period.end);
      busyPeriods.push({
        start: start.getHours() + start.getMinutes() / 60,
        end: end.getHours() + end.getMinutes() / 60,
      });
    }
  }

  return busyPeriods;
}

export async function createCalendarEvent({ kv, host, booking, meetingType, env }) {
  const accessToken = await getAccessToken({
    kv,
    hostId: host.id,
    refreshToken: host.google_refresh_token,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  const startHour = Math.floor(booking.start_hour);
  const startMin = Math.round((booking.start_hour - startHour) * 60);
  const startDate = new Date(`${booking.date}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
  const endDate = new Date(startDate.getTime() + booking.duration_minutes * 60 * 1000);

  const calendarId = host.calendar_ids[0] || 'primary';

  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `${meetingType.name} with ${booking.booker_name}`,
      description: booking.notes || '',
      start: { dateTime: startDate.toISOString(), timeZone: host.timezone },
      end: { dateTime: endDate.toISOString(), timeZone: host.timezone },
      attendees: [{ email: booking.booker_email }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Google Calendar create event error: ${res.status}`);
  }

  const event = await res.json();
  return event.id;
}

export async function deleteCalendarEvent({ kv, host, eventId, env }) {
  const accessToken = await getAccessToken({
    kv,
    hostId: host.id,
    refreshToken: host.google_refresh_token,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  const calendarId = host.calendar_ids[0] || 'primary';

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  if (!res.ok && res.status !== 410) {
    throw new Error(`Google Calendar delete event error: ${res.status}`);
  }
}

export async function updateCalendarEvent({ kv, host, eventId, booking, meetingType, env }) {
  const accessToken = await getAccessToken({
    kv,
    hostId: host.id,
    refreshToken: host.google_refresh_token,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  const startHour = Math.floor(booking.start_hour);
  const startMin = Math.round((booking.start_hour - startHour) * 60);
  const startDate = new Date(`${booking.date}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
  const endDate = new Date(startDate.getTime() + booking.duration_minutes * 60 * 1000);

  const calendarId = host.calendar_ids[0] || 'primary';

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `${meetingType.name} with ${booking.booker_name}`,
        start: { dateTime: startDate.toISOString(), timeZone: host.timezone },
        end: { dateTime: endDate.toISOString(), timeZone: host.timezone },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Calendar update event error: ${res.status}`);
  }
}
