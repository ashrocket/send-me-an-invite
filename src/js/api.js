/**
 * API client — fetch wrappers for availability and booking endpoints.
 */

export async function fetchAvailability(date, meetingType) {
  const params = new URLSearchParams({ date, type: meetingType });
  const res = await fetch(`/api/availability?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Availability fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function bookMeeting({ name, email, notes, datetime, meetingType }) {
  const res = await fetch('/api/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, notes, datetime, meetingType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Booking failed: ${res.status}`);
  }
  return res.json();
}
