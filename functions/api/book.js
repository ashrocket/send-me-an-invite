import { buildContext, getMeetingTypesMap } from '../lib/context.js';
import { json, error } from '../lib/response.js';
import { createBookingData, formatBookingSummary } from '../../lib/booking.js';
import { getAvailableSlots } from '../../lib/calendar.js';
import { getFreeBusy, createCalendarEvent } from '../lib/google-calendar.js';

export async function onRequestPost(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);

  let body;
  try { body = await ctx.request.json(); } catch { return error('Invalid JSON body'); }

  const { meeting_type, date, start_hour, name, email, notes } = body;
  if (!meeting_type || !date || start_hour === undefined || !name || !email) {
    return error('Missing required fields: meeting_type, date, start_hour, name, email');
  }

  const meetingTypes = getMeetingTypesMap(ctx.host);
  const mt = meetingTypes[meeting_type];
  if (!mt) return error(`Unknown meeting type: ${meeting_type}`);

  // Double-booking prevention
  let busyPeriods = [];
  try {
    busyPeriods = await getFreeBusy({ kv: ctx.kv, host: { ...ctx.host, id: ctx.hostId }, date, env: ctx.env });
  } catch (err) { console.error('FreeBusy error:', err.message); }

  const existingBookings = await ctx.db.prepare(
    'SELECT start_hour, duration_minutes FROM bookings WHERE host_id = ? AND date = ? AND status = ?'
  ).bind(ctx.hostId, date, 'confirmed').all();

  const dateObj = new Date(date + 'T12:00:00');
  const availableSlots = getAvailableSlots(busyPeriods, existingBookings.results || [], ctx.host.availability, dateObj, mt.duration);
  if (!availableSlots.includes(start_hour)) return error('Selected time slot is no longer available', 409);

  const booking = createBookingData({
    hostId: ctx.hostId, meetingType: meeting_type, date, startHour: start_hour,
    durationMinutes: mt.duration, bookerName: name, bookerEmail: email, notes,
  });

  let googleEventId = null;
  try {
    googleEventId = await createCalendarEvent({
      kv: ctx.kv, host: { ...ctx.host, id: ctx.hostId }, booking, meetingType: mt, env: ctx.env,
    });
  } catch (err) { console.error('Calendar event creation error:', err.message); }

  await ctx.db.prepare(`
    INSERT INTO bookings (id, host_id, meeting_type, date, start_hour, duration_minutes,
      booker_name, booker_email, notes, booking_code, magic_token, status, google_event_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    booking.id, booking.host_id, booking.meeting_type, booking.date,
    booking.start_hour, booking.duration_minutes, booking.booker_name,
    booking.booker_email, booking.notes, booking.booking_code,
    booking.magic_token, booking.status, googleEventId
  ).run();

  await ctx.db.prepare("UPDATE hosts SET last_booking_at = datetime('now') WHERE id = ?")
    .bind(ctx.hostId).run();

  const baseUrl = ctx.env.BASE_URL || `https://${ctx.hostId}.agentical.com`;
  const summary = formatBookingSummary(booking, meetingTypes);

  return json({
    booking_id: booking.id, booking_code: booking.booking_code,
    magic_link: `${baseUrl}/manage?token=${booking.magic_token}`, summary,
  }, 201);
}
