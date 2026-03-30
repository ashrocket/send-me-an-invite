import config from '../../config.json' with { type: 'json' };
import { refreshAccessToken, createEvent } from '../lib/google.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email, datetime, meetingType, notes = '' } = body;

  // Validate required fields
  if (!name || typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'Missing or invalid name' }, { status: 400 });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Missing or invalid email' }, { status: 400 });
  }
  if (!datetime || typeof datetime !== 'string') {
    return Response.json({ error: 'Missing or invalid datetime' }, { status: 400 });
  }
  if (!meetingType || typeof meetingType !== 'string') {
    return Response.json({ error: 'Missing or invalid meetingType' }, { status: 400 });
  }

  const mtConfig = config.meetingTypes.find(mt => mt.id === meetingType);
  if (!mtConfig) {
    return Response.json({ error: `Unknown meeting type: ${meetingType}` }, { status: 400 });
  }

  try {
    // Refresh primary calendar token
    const { access_token } = await refreshAccessToken(
      env.GOOGLE_TOKEN_PRIMARY,
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    );

    const startDate = new Date(datetime);
    const endDate   = new Date(startDate.getTime() + mtConfig.duration * 60_000);

    await createEvent(access_token, {
      summary:       `${mtConfig.name} with ${name.trim()}`,
      description:   notes.trim() || 'Booked via calendar.raiteri.net',
      start:         startDate.toISOString(),
      end:           endDate.toISOString(),
      attendeeEmail: email.trim(),
      timezone:      config.owner.timezone,
    });

    // Persist to D1
    const createdAt = new Date().toISOString();
    await env.DB
      .prepare(
        'INSERT INTO bookings (name, email, datetime, duration, meeting_type, notes, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        name.trim(),
        email.trim(),
        datetime,
        mtConfig.duration,
        meetingType,
        notes,
        createdAt,
        'confirmed'
      )
      .run();

    return Response.json({
      success: true,
      booking: {
        name:        name.trim(),
        email:       email.trim(),
        datetime,
        meetingType,
        duration:    mtConfig.duration,
      },
    });
  } catch (err) {
    console.error('booking error:', err);
    return Response.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
