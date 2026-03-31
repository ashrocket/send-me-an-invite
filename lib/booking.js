import { generateBookingCode, generateMagicToken } from './booking-codes.js';
import { formatTimeLabel } from './calendar.js';

export function createBookingData({ hostId, meetingType, date, startHour, durationMinutes, bookerName, bookerEmail, notes }) {
  return {
    id: crypto.randomUUID(),
    host_id: hostId,
    meeting_type: meetingType,
    date,
    start_hour: startHour,
    duration_minutes: durationMinutes,
    booker_name: bookerName,
    booker_email: bookerEmail,
    notes: notes || '',
    booking_code: generateBookingCode(),
    magic_token: generateMagicToken(),
    status: 'confirmed',
  };
}

export function canCancel(booking) {
  return booking.status === 'confirmed';
}

export function canReschedule(booking) {
  return booking.status === 'confirmed';
}

export function formatBookingSummary(booking, meetingTypes) {
  const type = meetingTypes[booking.meeting_type];
  const typeName = type ? type.name : booking.meeting_type;
  const timeLabel = formatTimeLabel(booking.start_hour);

  const dateObj = new Date(booking.date + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return `${typeName} on ${dateLabel} at ${timeLabel}`;
}
