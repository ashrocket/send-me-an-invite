import config from '../../config.json' with { type: 'json' };
import { refreshAccessToken, getFreeBusy } from '../lib/google.js';
import { computeAvailableSlots } from '../lib/slots.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const date = url.searchParams.get('date');
  const type = url.searchParams.get('type');

  // Validate inputs
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Invalid or missing date (expected YYYY-MM-DD)' }, { status: 400 });
  }
  if (!type) {
    return Response.json({ error: 'Missing type parameter' }, { status: 400 });
  }

  const meetingType = config.meetingTypes.find(mt => mt.id === type);
  if (!meetingType) {
    return Response.json({ error: `Unknown meeting type: ${type}` }, { status: 400 });
  }

  try {
    // Refresh all three calendar account tokens in parallel
    const [primary, raiteri, kure] = await Promise.all([
      refreshAccessToken(env.GOOGLE_TOKEN_PRIMARY, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
      refreshAccessToken(env.GOOGLE_TOKEN_RAITERI,  env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
      refreshAccessToken(env.GOOGLE_TOKEN_KURE,     env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
    ]);

    // Query free/busy for the full day across all calendars
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const busyPeriods = await getFreeBusy(
      [primary.access_token, raiteri.access_token, kure.access_token],
      ['primary', 'primary', 'primary'],
      timeMin,
      timeMax
    );

    const slots = computeAvailableSlots(date, busyPeriods, {
      startHour:       config.availability.startHour,
      endHour:         config.availability.endHour,
      bufferMinutes:   config.availability.bufferMinutes,
      durationMinutes: meetingType.duration,
      timezone:        config.owner.timezone,
    });

    return Response.json({ slots, date, meetingType: type });
  } catch (err) {
    console.error('availability error:', err);
    return Response.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
