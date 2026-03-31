import { buildContext } from '../lib/context.js';
import { json, error, notFound } from '../lib/response.js';
import { canCancel } from '../../lib/booking.js';
import { deleteCalendarEvent } from '../lib/google-calendar.js';

export async function onRequestPost(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);

  let body;
  try { body = await ctx.request.json(); } catch { return error('Invalid JSON body'); }

  const { token, booking_code } = body;
  if (!token && !booking_code) return error('Missing token or booking_code');

  let booking;
  if (token) {
    booking = await ctx.db.prepare('SELECT * FROM bookings WHERE magic_token = ?').bind(token).first();
  } else {
    booking = await ctx.db.prepare('SELECT * FROM bookings WHERE booking_code = ?').bind(booking_code).first();
  }
  if (!booking) return notFound('Booking not found');
  if (!canCancel(booking)) return error('Booking cannot be cancelled', 409);

  if (booking.google_event_id) {
    try {
      await deleteCalendarEvent({
        kv: ctx.kv, host: { ...ctx.host, id: ctx.hostId }, eventId: booking.google_event_id, env: ctx.env,
      });
    } catch (err) { console.error('Calendar delete error:', err.message); }
  }

  await ctx.db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?")
    .bind(booking.id).run();

  return json({ cancelled: true });
}
