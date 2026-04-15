/**
 * Slot computation — pure function, no I/O.
 *
 * @param {string} date           YYYY-MM-DD in the given timezone
 * @param {{start:string,end:string}[]} busyPeriods  ISO 8601 strings
 * @param {{startHour:number, endHour:number, bufferMinutes:number,
 *          durationMinutes:number, timezone:string}} config
 * @returns {{start:string,end:string}[]}  available slot ISO strings
 */
export function computeAvailableSlots(date, busyPeriods, config) {
  const { startHour, endHour, bufferMinutes, durationMinutes, timezone } = config;

  // Reject weekends (parsed from the date string directly to stay timezone-agnostic)
  const [year, month, day] = date.split('-').map(Number);
  const dow = new Date(year, month - 1, day).getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return [];

  // UTC offset (minutes) for this timezone on this date
  const offsetMinutes = getTimezoneOffset(timezone, date);

  // Generate candidate slots
  const slots = [];
  let cursor = startHour * 60; // minutes from midnight in local timezone

  while (cursor + durationMinutes <= endHour * 60) {
    const startMs = Date.UTC(year, month - 1, day) + (cursor - offsetMinutes) * 60_000;
    const endMs   = startMs + durationMinutes * 60_000;
    slots.push({
      start: new Date(startMs).toISOString(),
      end:   new Date(endMs).toISOString(),
    });
    cursor += durationMinutes + bufferMinutes;
  }

  // Merge overlapping busy periods
  const merged = mergeBusy(busyPeriods);

  // Remove slots that touch any busy period
  return slots.filter(slot => !overlaps(slot, merged));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mergeBusy(periods) {
  if (!periods.length) return [];

  const sorted = periods
    .map(p => ({ s: new Date(p.start).getTime(), e: new Date(p.end).getTime() }))
    .sort((a, b) => a.s - b.s);

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].s <= last.e) {
      last.e = Math.max(last.e, sorted[i].e);
    } else {
      out.push(sorted[i]);
    }
  }
  return out;
}

function overlaps(slot, merged) {
  const s = new Date(slot.start).getTime();
  const e = new Date(slot.end).getTime();
  return merged.some(b => s < b.e && e > b.s);
}

/**
 * Returns the UTC offset in minutes for `timezone` on `dateStr`.
 * Positive = east of UTC (ahead), e.g. UTC+5:30 → +330.
 * Negative = west of UTC (behind), e.g. America/Chicago (CDT) → -300.
 */
function getTimezoneOffset(timezone, dateStr) {
  // Use noon UTC on the date to avoid DST boundary edge cases.
  const noonUTC = new Date(`${dateStr}T12:00:00Z`);
  const parts   = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(noonUTC);

  const tzPart = parts.find(p => p.type === 'timeZoneName');
  if (!tzPart) return 0;

  const val = tzPart.value; // e.g. "GMT-5", "GMT+5:30", "GMT"
  const m   = val.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!m) return 0; // "GMT" / "UTC"

  const sign    = m[1] === '+' ? 1 : -1;
  const hours   = parseInt(m[2], 10);
  const minutes = parseInt(m[3] ?? '0', 10);
  return sign * (hours * 60 + minutes);
}
