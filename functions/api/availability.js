import { buildContext, getMeetingTypesMap } from '../lib/context.js';
import { json, error } from '../lib/response.js';
import { getAvailableSlots, groupSlots } from '../../lib/calendar.js';
import { getFreeBusy } from '../lib/google-calendar.js';

export async function onRequestGet(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);

  const date = ctx.url.searchParams.get('date');
  const typeId = ctx.url.searchParams.get('type');
  if (!date || !typeId) return error('Missing required query params: date, type');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return error('Invalid date format. Use YYYY-MM-DD');

  const meetingTypes = getMeetingTypesMap(ctx.host);
  const meetingType = meetingTypes[typeId];
  if (!meetingType) return error(`Unknown meeting type: ${typeId}`);

  let busyPeriods = [];
  try {
    busyPeriods = await getFreeBusy({ kv: ctx.kv, host: { ...ctx.host, id: ctx.hostId }, date, env: ctx.env });
  } catch (err) {
    console.error('FreeBusy error:', err.message);
  }

  const existingBookings = await ctx.db.prepare(
    'SELECT start_hour, duration_minutes FROM bookings WHERE host_id = ? AND date = ? AND status = ?'
  ).bind(ctx.hostId, date, 'confirmed').all();

  const dateObj = new Date(date + 'T12:00:00');
  const slots = getAvailableSlots(busyPeriods, existingBookings.results || [], ctx.host.availability, dateObj, meetingType.duration);
  const grouped = groupSlots(slots);

  return json({ slots, ...grouped, date, meeting_type: { id: typeId, ...meetingType } });
}
