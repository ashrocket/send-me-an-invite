import { buildContext, getMeetingTypesMap } from '../lib/context.js';
import { json, error, notFound } from '../lib/response.js';
import { canReschedule, formatBookingSummary } from '../../lib/booking.js';
import { getAvailableSlots } from '../../lib/calendar.js';
import { getFreeBusy, updateCalendarEvent } from '../lib/google-calendar.js';

export async function onRequestPost(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);

  let body;
  try { body = await ctx.request.json(); } catch { return error('Invalid JSON body'); }

  const { token, booking_code, new_date, new_start_hour } = body;
  if ((!token && !booking_code) || !new_date || new_start_hour === undefined) {
    return error('Missing required fields: token or booking_code, new_date, new_start_hour');
  }

  let booking;
  if (token) {
    booking = await ctx.db.prepare('SELECT * FROM bookings WHERE magic_token = ?').bind(token).first();
  } else {
    booking = await ctx.db.prepare('SELECT * FROM bookings WHERE booking_code = ?').bind(booking_code).first();
  }
  if (!booking) return notFound('Booking not found');
  if (!canReschedule(booking)) return error('Booking cannot be rescheduled', 409);

  const meetingTypes = getMeetingTypesMap(ctx.host);
  const mt = meetingTypes[booking.meeting_type];
  if (!mt) return error('Meeting type no longer exists', 500);

  let busyPeriods = [];
  try {
    busyPeriods = await getFreeBusy({ kv: ctx.kv, host: { ...ctx.host, id: ctx.hostId }, date: new_date, env: ctx.env });
  } catch (err) { console.error('FreeBusy error:', err.message); }

  const existingBookings = await ctx.db.prepare(
    'SELECT start_hour, duration_minutes FROM bookings WHERE host_id = ? AND date = ? AND status = ? AND id != ?'
  ).bind(ctx.hostId, new_date, 'confirmed', booking.id).all();

  const dateObj = new Date(new_date + 'T12:00:00');
  const availableSlots = getAvailableSlots(busyPeriods, existingBookings.results || [], ctx.host.availability, dateObj, mt.duration);
  if (!availableSlots.includes(new_start_hour)) return error('Selected time slot is not available', 409);

  if (booking.google_event_id) {
    try {
      await updateCalendarEvent({
        kv: ctx.kv, host: { ...ctx.host, id: ctx.hostId }, eventId: booking.google_event_id,
        booking: { ...booking, date: new_date, start_hour: new_start_hour }, meetingType: mt, env: ctx.env,
      });
    } catch (err) { console.error('Calendar update error:', err.message); }
  }

  await ctx.db.prepare("UPDATE bookings SET date = ?, start_hour = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(new_date, new_start_hour, booking.id).run();

  const updatedBooking = { ...booking, date: new_date, start_hour: new_start_hour };
  const summary = formatBookingSummary(updatedBooking, meetingTypes);

  return json({ rescheduled: true, summary });
}
