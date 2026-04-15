import { describe, it, expect } from 'vitest';
import { computeAvailableSlots } from './slots.js';

// Use UTC to keep expected ISO strings simple.
const cfg = {
  startHour:       9,
  endHour:         17,
  bufferMinutes:   15,
  durationMinutes: 30,
  timezone:        'UTC',
};

// Tuesday 2025-04-15 (weekday)
const TUESDAY = '2025-04-15';
// Saturday 2025-04-12, Sunday 2025-04-13
const SATURDAY = '2025-04-12';
const SUNDAY   = '2025-04-13';

describe('computeAvailableSlots', () => {
  it('returns all slots when no busy periods', () => {
    const slots = computeAvailableSlots(TUESDAY, [], cfg);
    // Step = 30 + 15 = 45 min → starts at 9:00, 9:45, 10:30 … 16:30  (11 slots)
    expect(slots).toHaveLength(11);
    expect(slots[0].start).toBe('2025-04-15T09:00:00.000Z');
    expect(slots[0].end).toBe('2025-04-15T09:30:00.000Z');
    expect(slots[10].start).toBe('2025-04-15T16:30:00.000Z');
  });

  it('removes slots that overlap a busy period', () => {
    const busy = [{ start: '2025-04-15T09:00:00Z', end: '2025-04-15T09:30:00Z' }];
    const slots = computeAvailableSlots(TUESDAY, busy, cfg);
    expect(slots).toHaveLength(10);
    expect(slots[0].start).toBe('2025-04-15T09:45:00.000Z');
  });

  it('merges overlapping busy periods before filtering', () => {
    const busy = [
      { start: '2025-04-15T09:00:00Z', end: '2025-04-15T09:30:00Z' },
      { start: '2025-04-15T09:15:00Z', end: '2025-04-15T10:00:00Z' }, // overlaps → merged 9:00-10:00
    ];
    const slots = computeAvailableSlots(TUESDAY, busy, cfg);
    // Merged 9:00-10:00 blocks 9:00 and 9:45 slots; first free is 10:30
    expect(slots[0].start).toBe('2025-04-15T10:30:00.000Z');
  });

  it('works with 60-minute duration', () => {
    const cfg60 = { ...cfg, durationMinutes: 60 };
    // Step = 60 + 15 = 75 min → 9:00, 10:15, 11:30, 12:45, 14:00, 15:15 (6 slots; 16:30+60=17:30 > 17:00)
    const slots = computeAvailableSlots(TUESDAY, [], cfg60);
    expect(slots).toHaveLength(6);
    expect(slots[0].start).toBe('2025-04-15T09:00:00.000Z');
    expect(slots[0].end).toBe('2025-04-15T10:00:00.000Z');
  });

  it('returns empty array for Saturday', () => {
    expect(computeAvailableSlots(SATURDAY, [], cfg)).toEqual([]);
  });

  it('returns empty array for Sunday', () => {
    expect(computeAvailableSlots(SUNDAY, [], cfg)).toEqual([]);
  });
});
