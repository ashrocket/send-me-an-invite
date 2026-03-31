import { getAvailableSlots as mockGetSlots, getMockUser } from '../../test/mock-calendars.js';

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * Fetch meeting types from API or return mock data.
 */
export async function fetchMeetingTypes() {
  if (IS_DEV) {
    return {
      types: [
        { id: 'intro', name: '30-Minute Intro Call', duration: 30, description: 'Quick intro and initial conversation' },
        { id: 'deep-dive', name: '60-Minute Deep Dive', duration: 60, description: 'In-depth technical or strategic discussion' },
      ],
    };
  }

  const res = await fetch('/api/meeting-types');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch host profile info.
 */
export async function fetchHostProfile() {
  if (IS_DEV) {
    const user = getMockUser('ashley');
    return user;
  }

  const res = await fetch('/api/meeting-types');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  // Host info comes from the page meta or a dedicated endpoint
  // For now, return from meeting types response context
  return null; // Will be populated from page HTML in prod
}

/**
 * Fetch available slots for a date and meeting type.
 */
export async function fetchAvailability(date, meetingTypeId, meetingDuration) {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  if (IS_DEV) {
    const slots = mockGetSlots('ashley', date, meetingDuration, 15);
    const morning = slots.filter(s => s < 12);
    const afternoon = slots.filter(s => s >= 12);
    return {
      slots,
      morning,
      afternoon,
      layout: slots.length <= 3 ? 'flat' : 'grouped',
      date: dateStr,
    };
  }

  const res = await fetch(`/api/availability?date=${dateStr}&type=${meetingTypeId}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Check if a specific date has any available slots (for calendar day styling).
 */
export async function hasAvailableSlots(date, meetingTypeId, meetingDuration) {
  try {
    const data = await fetchAvailability(date, meetingTypeId, meetingDuration);
    return data.slots && data.slots.length > 0;
  } catch {
    return false;
  }
}

/**
 * Submit a booking.
 */
export async function submitBooking({ meetingType, date, startHour, name, email, notes }) {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  if (IS_DEV) {
    // Simulate booking in dev mode
    await new Promise(r => setTimeout(r, 800));
    return {
      booking_id: 'dev-' + Math.random().toString(36).slice(2),
      booking_code: 'AC-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      magic_link: '#dev-mode',
      summary: `Booking confirmed (dev mode)`,
    };
  }

  const res = await fetch('/api/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_type: meetingType,
      date: dateStr,
      start_hour: startHour,
      name,
      email,
      notes: notes || '',
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Booking failed: ${res.status}`);
  }

  return res.json();
}
