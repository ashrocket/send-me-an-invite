import { describe, it, expect } from 'vitest';
import { createBookingData, canCancel, canReschedule, formatBookingSummary } from '../../lib/booking.js';

describe('createBookingData', () => {
  it('returns a complete booking object with all required fields', () => {
    const input = {
      hostId: 'ashley',
      meetingType: 'intro',
      date: '2026-04-01',
      startHour: 14,
      durationMinutes: 30,
      bookerName: 'Jane Doe',
      bookerEmail: 'jane@example.com',
      notes: 'Looking forward to it',
    };
    const booking = createBookingData(input);

    expect(booking.id).toBeTruthy();
    expect(booking.host_id).toBe('ashley');
    expect(booking.meeting_type).toBe('intro');
    expect(booking.date).toBe('2026-04-01');
    expect(booking.start_hour).toBe(14);
    expect(booking.duration_minutes).toBe(30);
    expect(booking.booker_name).toBe('Jane Doe');
    expect(booking.booker_email).toBe('jane@example.com');
    expect(booking.notes).toBe('Looking forward to it');
    expect(booking.booking_code).toMatch(/^AC-[A-Z0-9]{4}$/);
    expect(booking.magic_token.length).toBeGreaterThanOrEqual(32);
    expect(booking.status).toBe('confirmed');
  });

  it('defaults notes to empty string', () => {
    const input = {
      hostId: 'ashley', meetingType: 'intro', date: '2026-04-01',
      startHour: 14, durationMinutes: 30,
      bookerName: 'Jane', bookerEmail: 'jane@example.com',
    };
    const booking = createBookingData(input);
    expect(booking.notes).toBe('');
  });
});

describe('canCancel', () => {
  it('returns true for confirmed bookings', () => {
    expect(canCancel({ status: 'confirmed' })).toBe(true);
  });
  it('returns false for already cancelled bookings', () => {
    expect(canCancel({ status: 'cancelled' })).toBe(false);
  });
});

describe('canReschedule', () => {
  it('returns true for confirmed bookings', () => {
    expect(canReschedule({ status: 'confirmed' })).toBe(true);
  });
  it('returns false for cancelled bookings', () => {
    expect(canReschedule({ status: 'cancelled' })).toBe(false);
  });
});

describe('formatBookingSummary', () => {
  it('formats a booking into a human-readable summary', () => {
    const booking = {
      meeting_type: 'intro',
      date: '2026-04-01',
      start_hour: 14,
      duration_minutes: 30,
    };
    const meetingTypes = {
      intro: { name: '30-Minute Intro Call', duration: 30 },
    };
    const summary = formatBookingSummary(booking, meetingTypes);
    expect(summary).toContain('30-Minute Intro Call');
    expect(summary).toContain('2:00 PM');
    expect(summary).toContain('April');
  });
});
