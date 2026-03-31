import { describe, it, expect } from 'vitest';
import { getAvailableSlots, formatTimeLabel, groupSlots } from '../../lib/calendar.js';

describe('getAvailableSlots', () => {
  const availability = { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, bufferMinutes: 15 };

  it('returns no slots on weekends', () => {
    const saturday = new Date(2026, 3, 4); // April 4 2026 = Saturday
    const slots = getAvailableSlots([], [], availability, saturday, 30);
    expect(slots).toEqual([]);
  });

  it('returns slots for an empty calendar on a weekday', () => {
    const monday = new Date(2026, 3, 6); // April 6 2026 = Monday
    const slots = getAvailableSlots([], [], availability, monday, 30);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toBe(9);
  });

  it('excludes busy periods from Google Calendar', () => {
    const monday = new Date(2026, 3, 6);
    const busyPeriods = [{ start: 9, end: 10 }]; // 9-10 AM busy
    const slots = getAvailableSlots(busyPeriods, [], availability, monday, 30);
    expect(slots).not.toContain(9);
    expect(slots).not.toContain(9.5);
  });

  it('respects buffer time around busy periods', () => {
    const monday = new Date(2026, 3, 6);
    const busyPeriods = [{ start: 10, end: 11 }]; // 10-11 AM busy, 15 min buffer
    const slots = getAvailableSlots(busyPeriods, [], availability, monday, 30);
    // 9:30 should be excluded (ends at 10:00, but buffer starts at 9:45)
    expect(slots).not.toContain(9.5);
    expect(slots).toContain(9); // 9:00-9:30 is fine (ends at 9:30, buffer at 9:45)
  });

  it('excludes existing bookings from D1', () => {
    const monday = new Date(2026, 3, 6);
    const existingBookings = [{ start_hour: 14, duration_minutes: 30 }];
    const slots = getAvailableSlots([], existingBookings, availability, monday, 30);
    expect(slots).not.toContain(14);
  });

  it('generates only top-of-hour for 60-minute meetings', () => {
    const monday = new Date(2026, 3, 6);
    const slots = getAvailableSlots([], [], availability, monday, 60);
    for (const s of slots) {
      expect(s % 1).toBe(0); // all whole numbers
    }
  });

  it('generates top-of-hour and :30 for 30-minute meetings', () => {
    const monday = new Date(2026, 3, 6);
    const slots = getAvailableSlots([], [], availability, monday, 30);
    const hasHalfHour = slots.some(s => s % 1 === 0.5);
    expect(hasHalfHour).toBe(true);
  });
});

describe('formatTimeLabel', () => {
  it('formats whole hours correctly', () => {
    expect(formatTimeLabel(9)).toBe('9:00 AM');
    expect(formatTimeLabel(14)).toBe('2:00 PM');
    expect(formatTimeLabel(12)).toBe('12:00 PM');
  });

  it('formats half hours correctly', () => {
    expect(formatTimeLabel(9.5)).toBe('9:30 AM');
    expect(formatTimeLabel(13.5)).toBe('1:30 PM');
  });
});

describe('groupSlots', () => {
  it('returns flat layout for 3 or fewer slots', () => {
    const result = groupSlots([9, 10, 14]);
    expect(result.layout).toBe('flat');
    expect(result.slots).toEqual([9, 10, 14]);
  });

  it('returns grouped layout for 4+ slots', () => {
    const result = groupSlots([9, 10, 10.5, 14, 15]);
    expect(result.layout).toBe('grouped');
    expect(result.morning).toEqual([9, 10, 10.5]);
    expect(result.afternoon).toEqual([14, 15]);
  });

  it('handles all-morning or all-afternoon slots', () => {
    const result = groupSlots([9, 10, 10.5, 11]);
    expect(result.layout).toBe('grouped');
    expect(result.morning).toEqual([9, 10, 10.5, 11]);
    expect(result.afternoon).toEqual([]);
  });
});
