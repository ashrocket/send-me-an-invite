// ---------------------------------------------------------------------------
// Mock calendar data — simulates Google Calendar busy periods for test users.
// Each user has a realistic schedule with meetings, focus blocks, and lunches.
// When real Google Calendar integration is wired up, this module gets replaced
// by actual freebusy API calls.
// ---------------------------------------------------------------------------

const MOCK_USERS = {
  ashley: {
    name: 'Ashley Raiteri',
    headline: 'Engineering Leader',
    timezone: 'America/Chicago',
    // Recurring weekly patterns (day 0=Sun, 1=Mon, etc.)
    recurring: [
      { day: 1, start: 9,    end: 10,   title: 'Team Standup' },
      { day: 1, start: 13,   end: 14,   title: 'Architecture Review' },
      { day: 2, start: 10,   end: 11.5, title: '1:1s Block' },
      { day: 2, start: 14,   end: 15,   title: 'Sprint Planning' },
      { day: 3, start: 9,    end: 9.5,  title: 'Team Standup' },
      { day: 3, start: 11,   end: 12,   title: 'Product Sync' },
      { day: 3, start: 15,   end: 16.5, title: 'Deep Work Block' },
      { day: 4, start: 10,   end: 11,   title: '1:1s Block' },
      { day: 4, start: 13,   end: 14,   title: 'Hiring Debrief' },
      { day: 5, start: 9,    end: 10,   title: 'All Hands' },
      { day: 5, start: 14,   end: 16,   title: 'Focus Time' },
    ],
    // Lunch block every weekday
    lunch: { start: 12, end: 13 },
  },

  jordan: {
    name: 'Jordan Chen',
    headline: 'Product Designer',
    timezone: 'America/Los_Angeles',
    recurring: [
      { day: 1, start: 9,    end: 10,   title: 'Design Standup' },
      { day: 1, start: 14,   end: 16,   title: 'Design Reviews' },
      { day: 2, start: 10,   end: 12,   title: 'Workshop Block' },
      { day: 3, start: 9,    end: 9.5,  title: 'Design Standup' },
      { day: 3, start: 13,   end: 14.5, title: 'Cross-team Sync' },
      { day: 4, start: 11,   end: 12,   title: 'User Research' },
      { day: 4, start: 15,   end: 16.5, title: 'Prototype Review' },
      { day: 5, start: 9,    end: 10,   title: 'All Hands' },
      { day: 5, start: 10,   end: 12,   title: 'Design Sprint' },
    ],
    lunch: { start: 12, end: 13 },
  },

  priya: {
    name: 'Priya Sharma',
    headline: 'Freelance Consultant',
    timezone: 'America/New_York',
    recurring: [
      { day: 1, start: 9,    end: 10.5, title: 'Client A Standup' },
      { day: 1, start: 15,   end: 16,   title: 'Client B Check-in' },
      { day: 2, start: 11,   end: 12,   title: 'Client C Workshop' },
      { day: 3, start: 9,    end: 10,   title: 'Client A Standup' },
      { day: 3, start: 14,   end: 15.5, title: 'Strategy Session' },
      { day: 4, start: 10,   end: 11,   title: 'Networking Call' },
      { day: 4, start: 13,   end: 14.5, title: 'Client B Deep Dive' },
      { day: 5, start: 9,    end: 11,   title: 'Admin & Invoicing' },
    ],
    lunch: { start: 12, end: 13 },
  },

  marcus: {
    name: 'Marcus Thompson',
    headline: 'Startup Founder',
    timezone: 'America/Chicago',
    recurring: [
      { day: 1, start: 9,    end: 11,   title: 'Board Prep' },
      { day: 1, start: 14,   end: 15,   title: 'Investor Call' },
      { day: 2, start: 9,    end: 9.5,  title: 'Team Standup' },
      { day: 2, start: 13,   end: 15,   title: 'Customer Discovery' },
      { day: 3, start: 10,   end: 12,   title: 'Product Review' },
      { day: 3, start: 14,   end: 16,   title: 'Hiring Block' },
      { day: 4, start: 9,    end: 9.5,  title: 'Team Standup' },
      { day: 4, start: 11,   end: 12,   title: 'Advisor Meeting' },
      { day: 5, start: 9,    end: 10,   title: 'All Hands' },
      { day: 5, start: 13,   end: 16,   title: 'Deep Work' },
    ],
    lunch: { start: 12, end: 13 },
  },
};

/**
 * Get busy periods for a user on a specific date.
 * Returns array of { start: hour (float), end: hour (float), title: string }
 */
export function getBusyPeriods(userId, date) {
  const user = MOCK_USERS[userId];
  if (!user) return [];

  const dayOfWeek = date.getDay();
  const busy = [];

  // Add recurring meetings for this day of week
  for (const event of user.recurring) {
    if (event.day === dayOfWeek) {
      busy.push({ start: event.start, end: event.end, title: event.title });
    }
  }

  // Add lunch
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    busy.push({ start: user.lunch.start, end: user.lunch.end, title: 'Lunch' });
  }

  // Add some random one-off meetings for variety (seeded by date)
  const seed = date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
  const rng = mulberry32(seed + userId.charCodeAt(0));
  if (rng() > 0.5 && dayOfWeek >= 1 && dayOfWeek <= 5) {
    const hour = 9 + Math.floor(rng() * 7);
    const duration = rng() > 0.5 ? 1 : 0.5;
    // Only add if it doesn't overlap existing
    const overlaps = busy.some(b => hour < b.end && hour + duration > b.start);
    if (!overlaps) {
      busy.push({ start: hour, end: hour + duration, title: 'Ad-hoc meeting' });
    }
  }

  return busy.sort((a, b) => a.start - b.start);
}

/**
 * Get available time slots for a user on a date, given meeting duration.
 * Respects buffer time between meetings.
 * Prefers top-of-hour slots.
 */
export function getAvailableSlots(userId, date, durationMinutes, bufferMinutes = 15) {
  const user = MOCK_USERS[userId];
  if (!user) return [];

  const dayOfWeek = date.getDay();
  // No weekend availability
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  const busy = getBusyPeriods(userId, date);
  const startHour = 9;
  const endHour = 17;
  const durationHours = durationMinutes / 60;
  const bufferHours = bufferMinutes / 60;

  // Generate candidate slots — top-of-hour first, then :30
  const candidates = [];
  for (let h = startHour; h < endHour; h++) {
    candidates.push(h);        // :00
    if (durationMinutes <= 30) {
      candidates.push(h + 0.5); // :30
    }
  }

  // Filter out slots that overlap busy periods (including buffer)
  return candidates.filter(slotStart => {
    const slotEnd = slotStart + durationHours;
    if (slotEnd > endHour) return false;

    for (const b of busy) {
      const busyStart = b.start - bufferHours;
      const busyEnd = b.end + bufferHours;
      if (slotStart < busyEnd && slotEnd > busyStart) return false;
    }
    return true;
  });
}

/**
 * Get all available mock users.
 */
export function getMockUsers() {
  return Object.entries(MOCK_USERS).map(([id, u]) => ({
    id,
    name: u.name,
    headline: u.headline,
    timezone: u.timezone,
  }));
}

/**
 * Get a specific mock user.
 */
export function getMockUser(userId) {
  const u = MOCK_USERS[userId];
  if (!u) return null;
  return { id: userId, name: u.name, headline: u.headline, timezone: u.timezone };
}

// Simple seeded PRNG (mulberry32)
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
