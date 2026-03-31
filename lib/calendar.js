/**
 * Get available time slots for a given date.
 *
 * @param {Array<{start: number, end: number}>} busyPeriods - From Google Calendar freebusy
 * @param {Array<{start_hour: number, duration_minutes: number}>} existingBookings - From D1
 * @param {{days: number[], startHour: number, endHour: number, bufferMinutes: number}} availability
 * @param {Date} date - The date to check
 * @param {number} durationMinutes - Meeting duration (30 or 60)
 * @returns {number[]} Array of available start hours (e.g. [9, 10.5, 14])
 */
export function getAvailableSlots(busyPeriods, existingBookings, availability, date, durationMinutes) {
  const dayOfWeek = date.getDay();
  if (!availability.days.includes(dayOfWeek)) return [];

  const { startHour, endHour, bufferMinutes } = availability;
  const durationHours = durationMinutes / 60;
  const bufferHours = bufferMinutes / 60;

  // Merge busy periods and existing bookings into one blocked list
  const blocked = [
    ...busyPeriods.map(b => ({ start: b.start, end: b.end })),
    ...existingBookings.map(b => ({
      start: b.start_hour,
      end: b.start_hour + b.duration_minutes / 60,
    })),
  ];

  // Generate candidate slots: top-of-hour first, then :30
  const candidates = [];
  for (let h = startHour; h < endHour; h++) {
    candidates.push(h);
    if (durationMinutes <= 30) {
      candidates.push(h + 0.5);
    }
  }

  return candidates.filter(slotStart => {
    const slotEnd = slotStart + durationHours;
    if (slotEnd > endHour) return false;

    for (const b of blocked) {
      const busyStart = b.start - bufferHours;
      const busyEnd = b.end + bufferHours;
      if (slotStart < busyEnd && slotEnd > busyStart) return false;
    }
    return true;
  });
}

/**
 * Format a float hour as a human-readable time label.
 * @param {number} hourFloat - e.g. 14.5
 * @returns {string} e.g. "2:30 PM"
 */
export function formatTimeLabel(hourFloat) {
  const h = Math.floor(hourFloat);
  const m = Math.round((hourFloat - h) * 60);
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 || 12;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Group slots into flat (≤3) or morning/afternoon (4+).
 * @param {number[]} slots
 * @returns {{ layout: 'flat'|'grouped', slots?: number[], morning?: number[], afternoon?: number[] }}
 */
export function groupSlots(slots) {
  if (slots.length <= 3) {
    return { layout: 'flat', slots };
  }

  const morning = slots.filter(s => s < 12);
  const afternoon = slots.filter(s => s >= 12);
  return { layout: 'grouped', morning, afternoon };
}
