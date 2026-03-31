import { buildContext } from '../lib/context.js';
import { json, error, notFound } from '../lib/response.js';
import { canCancel, canReschedule } from '../../lib/booking.js';

export async function onRequestGet(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);

  const token = ctx.url.searchParams.get('token');
  const code = ctx.url.searchParams.get('code');
  if (!token && !code) return error('Missing token or code query parameter');

  let booking;
  if (token) {
    booking = await ctx.db.prepare('SELECT * FROM bookings WHERE magic_token = ?').bind(token).first();
  } else {
    booking = await ctx.db.prepare('SELECT * FROM bookings WHERE booking_code = ?').bind(code).first();
  }
  if (!booking) return notFound('Booking not found');

  return json({
    booking: {
      id: booking.id, meeting_type: booking.meeting_type, date: booking.date,
      start_hour: booking.start_hour, duration_minutes: booking.duration_minutes,
      status: booking.status, booker_name: booking.booker_name, booking_code: booking.booking_code,
    },
    can_reschedule: canReschedule(booking),
    can_cancel: canCancel(booking),
  });
}
