# Plan 1: Core Library Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-logic core library that powers both the REST API and MCP server — scheduling, bookings, themes, email, and token management.

**Architecture:** All modules in `lib/` are pure functions with zero HTTP/framework dependencies. They run on Cloudflare Workers (V8 isolates) — no Node.js-only APIs. State is passed in, not stored internally. Every function is independently testable.

**Tech Stack:** JavaScript (ES modules), Vitest, Web Crypto API

**Spec reference:** `docs/superpowers/specs/2026-03-30-agentic-cal-design.md`

---

### File Map

| File | Responsibility |
|------|---------------|
| `lib/calendar.js` | Availability calculation, slot generation, busy period filtering |
| `lib/booking.js` | Booking CRUD: create, cancel, reschedule, lookup |
| `lib/booking-codes.js` | Generate AC-XXXX codes + URL-safe magic tokens |
| `lib/theme.js` | Validate theme.json, convert to CSS custom properties string |
| `lib/mailer.js` | Mailer abstraction — routes to configured provider |
| `lib/mailers/resend.js` | Resend API mailer |
| `lib/mailers/sendgrid.js` | SendGrid API mailer |
| `lib/mailers/smtp.js` | Generic SMTP mailer |
| `lib/tokens.js` | Google OAuth token refresh + KV caching |
| `lib/email-templates.js` | HTML email templates for booking lifecycle events |
| `test/unit/calendar.test.js` | Tests for availability + slot logic |
| `test/unit/booking.test.js` | Tests for booking CRUD |
| `test/unit/booking-codes.test.js` | Tests for code/token generation |
| `test/unit/theme.test.js` | Tests for theme validation + CSS generation |
| `test/unit/mailer.test.js` | Tests for mailer routing + providers |
| `test/unit/tokens.test.js` | Tests for token refresh logic |
| `test/mock-calendars.js` | Mock Google Calendar data (move from src/js/) |

---

### Task 1: Project restructure + test setup

**Files:**
- Move: `src/js/mock-calendars.js` → `test/mock-calendars.js`
- Create: `lib/` directory
- Create: `test/unit/` directory
- Modify: `package.json` (add test script config)
- Modify: `src/js/app.js` (update import path)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p lib/mailers test/unit
```

- [ ] **Step 2: Move mock calendars to test directory**

```bash
cp src/js/mock-calendars.js test/mock-calendars.js
```

- [ ] **Step 3: Update app.js import**

In `src/js/app.js`, change:
```javascript
import { getAvailableSlots, getMockUser } from './mock-calendars.js';
```
to:
```javascript
import { getAvailableSlots, getMockUser } from '../../test/mock-calendars.js';
```

- [ ] **Step 4: Verify dev server still works**

Run: `npm run dev`
Expected: Vite dev server starts, booking flow still works at localhost:5173

- [ ] **Step 5: Verify tests run**

Run: `npm run test`
Expected: Vitest runs (0 tests found, but no errors)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: restructure for core library — create lib/ and test/unit/ directories"
```

---

### Task 2: Booking codes + magic tokens

**Files:**
- Create: `lib/booking-codes.js`
- Create: `test/unit/booking-codes.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/booking-codes.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { generateBookingCode, generateMagicToken, isValidBookingCode } from '../../lib/booking-codes.js';

describe('generateBookingCode', () => {
  it('returns a string matching AC-XXXX pattern', () => {
    const code = generateBookingCode();
    expect(code).toMatch(/^AC-[A-Z0-9]{4}$/);
  });

  it('generates unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateBookingCode()));
    expect(codes.size).toBe(100);
  });
});

describe('generateMagicToken', () => {
  it('returns a URL-safe string of at least 32 characters', () => {
    const token = generateMagicToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateMagicToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('isValidBookingCode', () => {
  it('returns true for valid codes', () => {
    expect(isValidBookingCode('AC-7K2F')).toBe(true);
    expect(isValidBookingCode('AC-ABCD')).toBe(true);
  });

  it('returns false for invalid codes', () => {
    expect(isValidBookingCode('XX-7K2F')).toBe(false);
    expect(isValidBookingCode('AC7K2F')).toBe(false);
    expect(isValidBookingCode('')).toBe(false);
    expect(isValidBookingCode('AC-7k2f')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/booking-codes.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement booking-codes.js**

Create `lib/booking-codes.js`:

```javascript
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
const CODE_PREFIX = 'AC';
const CODE_LENGTH = 4;
const TOKEN_BYTES = 24; // 32 chars in base64url

export function generateBookingCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
  return `${CODE_PREFIX}-${suffix}`;
}

export function generateMagicToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function isValidBookingCode(code) {
  if (typeof code !== 'string') return false;
  return /^AC-[A-Z0-9]{4}$/.test(code);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/unit/booking-codes.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/booking-codes.js test/unit/booking-codes.test.js
git commit -m "feat: booking code + magic token generation with Web Crypto API"
```

---

### Task 3: Theme validation + CSS generation

**Files:**
- Create: `lib/theme.js`
- Create: `test/unit/theme.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/theme.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { validateTheme, themeToCssProperties, THEME_SCHEMA_KEYS } from '../../lib/theme.js';

const VALID_THEME = {
  name: 'Test Theme',
  colors: {
    primary: '#C3B1E1',
    'primary-light': '#E8DFF5',
    accent: '#A8E6CF',
    'accent-light': '#D4F5E9',
    background: '#FFF8E7',
    surface: '#FFFFFF',
    text: '#4A4A4A',
    'text-muted': '#8A8A8A',
    border: '#E8E3D9',
    shadow: 'rgba(195, 177, 225, 0.15)',
    success: '#A8E6CF',
    error: '#FFB7B2',
  },
  fonts: { body: 'Inter', heading: 'Inter', mono: 'JetBrains Mono' },
  shape: { 'card-radius': '20px', 'btn-radius': '12px' },
  effects: {
    cursor: 'dragonfly',
    'ambient-dots': true,
    creatures: true,
    'confetti-colors': ['#C3B1E1', '#A8E6CF'],
  },
};

describe('validateTheme', () => {
  it('returns { valid: true } for a complete theme', () => {
    expect(validateTheme(VALID_THEME)).toEqual({ valid: true, errors: [] });
  });

  it('returns errors for missing required color keys', () => {
    const broken = { ...VALID_THEME, colors: { primary: '#000' } };
    const result = validateTheme(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for missing name', () => {
    const { name, ...noName } = VALID_THEME;
    const result = validateTheme(noName);
    expect(result.valid).toBe(false);
  });
});

describe('themeToCssProperties', () => {
  it('converts colors to --spring-* CSS custom properties', () => {
    const css = themeToCssProperties(VALID_THEME);
    expect(css).toContain('--spring-primary: #C3B1E1');
    expect(css).toContain('--spring-text: #4A4A4A');
    expect(css).toContain('--spring-accent: #A8E6CF');
  });

  it('converts shape to CSS custom properties', () => {
    const css = themeToCssProperties(VALID_THEME);
    expect(css).toContain('--card-radius: 20px');
    expect(css).toContain('--btn-radius: 12px');
  });

  it('converts fonts to CSS custom properties', () => {
    const css = themeToCssProperties(VALID_THEME);
    expect(css).toContain('--font-body: Inter');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/theme.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement theme.js**

Create `lib/theme.js`:

```javascript
const REQUIRED_COLORS = [
  'primary', 'primary-light', 'accent', 'accent-light',
  'background', 'surface', 'text', 'text-muted',
  'border', 'shadow', 'success', 'error',
];

const REQUIRED_FONTS = ['body', 'heading', 'mono'];
const REQUIRED_SHAPE = ['card-radius', 'btn-radius'];

export const THEME_SCHEMA_KEYS = { REQUIRED_COLORS, REQUIRED_FONTS, REQUIRED_SHAPE };

export function validateTheme(theme) {
  const errors = [];

  if (!theme || typeof theme !== 'object') {
    return { valid: false, errors: ['Theme must be an object'] };
  }

  if (!theme.name || typeof theme.name !== 'string') {
    errors.push('Missing required field: name');
  }

  if (!theme.colors || typeof theme.colors !== 'object') {
    errors.push('Missing required field: colors');
  } else {
    for (const key of REQUIRED_COLORS) {
      if (!theme.colors[key]) errors.push(`Missing required color: ${key}`);
    }
  }

  if (!theme.fonts || typeof theme.fonts !== 'object') {
    errors.push('Missing required field: fonts');
  } else {
    for (const key of REQUIRED_FONTS) {
      if (!theme.fonts[key]) errors.push(`Missing required font: ${key}`);
    }
  }

  if (!theme.shape || typeof theme.shape !== 'object') {
    errors.push('Missing required field: shape');
  } else {
    for (const key of REQUIRED_SHAPE) {
      if (!theme.shape[key]) errors.push(`Missing required shape: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function themeToCssProperties(theme) {
  const lines = [];

  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      lines.push(`--spring-${key}: ${value}`);
    }
  }

  if (theme.fonts) {
    for (const [key, value] of Object.entries(theme.fonts)) {
      lines.push(`--font-${key}: ${value}`);
    }
  }

  if (theme.shape) {
    for (const [key, value] of Object.entries(theme.shape)) {
      lines.push(`--${key}: ${value}`);
    }
  }

  return lines.join(';\n') + ';';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/unit/theme.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/theme.js test/unit/theme.test.js
git commit -m "feat: theme validation and CSS custom property generation"
```

---

### Task 4: Calendar availability logic

**Files:**
- Create: `lib/calendar.js`
- Create: `test/unit/calendar.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/calendar.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/calendar.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement calendar.js**

Create `lib/calendar.js`:

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/unit/calendar.test.js`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/calendar.js test/unit/calendar.test.js
git commit -m "feat: availability calculation with busy period filtering and slot grouping"
```

---

### Task 5: Booking CRUD logic

**Files:**
- Create: `lib/booking.js`
- Create: `test/unit/booking.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/booking.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/booking.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement booking.js**

Create `lib/booking.js`:

```javascript
import { generateBookingCode, generateMagicToken } from './booking-codes.js';
import { formatTimeLabel } from './calendar.js';

/**
 * Create a booking data object ready for D1 insertion.
 * Does NOT touch the database — just builds the object.
 */
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

/**
 * Can this booking be cancelled?
 */
export function canCancel(booking) {
  return booking.status === 'confirmed';
}

/**
 * Can this booking be rescheduled?
 */
export function canReschedule(booking) {
  return booking.status === 'confirmed';
}

/**
 * Format a booking as a human-readable summary string.
 */
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/unit/booking.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/booking.js test/unit/booking.test.js
git commit -m "feat: booking data creation, status checks, and summary formatting"
```

---

### Task 6: Mailer abstraction + Resend provider

**Files:**
- Create: `lib/mailer.js`
- Create: `lib/mailers/resend.js`
- Create: `test/unit/mailer.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/mailer.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { createMailer } from '../../lib/mailer.js';

describe('createMailer', () => {
  it('creates a resend mailer', () => {
    const mailer = createMailer({ provider: 'resend', apiKey: 'test-key' });
    expect(mailer).toBeDefined();
    expect(typeof mailer.send).toBe('function');
  });

  it('throws for unknown provider', () => {
    expect(() => createMailer({ provider: 'pigeons' })).toThrow('Unknown mailer: pigeons');
  });
});

describe('ResendMailer', () => {
  it('calls Resend API with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'msg_123' }),
    });
    global.fetch = mockFetch;

    const mailer = createMailer({ provider: 'resend', apiKey: 're_test_key' });
    const result = await mailer.send({
      to: 'jane@example.com',
      subject: 'Booking Confirmed',
      html: '<p>You are booked!</p>',
      from: 'noreply@agentical.com',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg_123');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.to).toEqual(['jane@example.com']);
    expect(body.subject).toBe('Booking Confirmed');
    expect(body.html).toBe('<p>You are booked!</p>');
    expect(body.from).toBe('noreply@agentical.com');

    expect(opts.headers['Authorization']).toBe('Bearer re_test_key');
  });

  it('throws on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    const mailer = createMailer({ provider: 'resend', apiKey: 'bad-key' });
    await expect(mailer.send({
      to: 'jane@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    })).rejects.toThrow('Resend API error: 401');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/mailer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement mailer.js**

Create `lib/mailer.js`:

```javascript
import { ResendMailer } from './mailers/resend.js';

const MAILERS = {
  resend: ResendMailer,
};

export function createMailer(config) {
  const Provider = MAILERS[config.provider];
  if (!Provider) throw new Error(`Unknown mailer: ${config.provider}`);
  return new Provider(config);
}
```

- [ ] **Step 4: Implement resend.js**

Create `lib/mailers/resend.js`:

```javascript
export class ResendMailer {
  constructor({ apiKey }) {
    this.apiKey = apiKey;
  }

  async send({ to, subject, html, from = 'noreply@agentical.com' }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend API error: ${res.status}`);
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- test/unit/mailer.test.js`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/mailer.js lib/mailers/resend.js test/unit/mailer.test.js
git commit -m "feat: pluggable mailer abstraction with Resend provider"
```

---

### Task 7: SendGrid + SMTP mailer providers

**Files:**
- Create: `lib/mailers/sendgrid.js`
- Create: `lib/mailers/smtp.js`
- Modify: `lib/mailer.js` (register new providers)
- Modify: `test/unit/mailer.test.js` (add tests)

- [ ] **Step 1: Add tests for SendGrid mailer**

Append to `test/unit/mailer.test.js`:

```javascript
describe('SendGridMailer', () => {
  it('calls SendGrid API with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'sg_msg_123' },
    });
    global.fetch = mockFetch;

    const mailer = createMailer({ provider: 'sendgrid', apiKey: 'SG.test' });
    const result = await mailer.send({
      to: 'jane@example.com',
      subject: 'Booking Confirmed',
      html: '<p>Booked!</p>',
      from: 'noreply@agentical.com',
    });

    expect(result.success).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(opts.headers['Authorization']).toBe('Bearer SG.test');
  });
});

describe('SmtpMailer', () => {
  it('can be instantiated with config', () => {
    const mailer = createMailer({
      provider: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      user: 'test',
      pass: 'secret',
    });
    expect(mailer).toBeDefined();
    expect(typeof mailer.send).toBe('function');
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npm run test -- test/unit/mailer.test.js`
Expected: New SendGrid/SMTP tests FAIL

- [ ] **Step 3: Implement sendgrid.js**

Create `lib/mailers/sendgrid.js`:

```javascript
export class SendGridMailer {
  constructor({ apiKey }) {
    this.apiKey = apiKey;
  }

  async send({ to, subject, html, from = 'noreply@agentical.com' }) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: Array.isArray(to) ? to[0] : to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!res.ok) {
      throw new Error(`SendGrid API error: ${res.status}`);
    }

    const messageId = res.headers.get('X-Message-Id') || null;
    return { success: true, messageId };
  }
}
```

- [ ] **Step 4: Implement smtp.js (stub — Workers can't do raw SMTP)**

Create `lib/mailers/smtp.js`:

```javascript
/**
 * SMTP mailer for self-hosted users running on platforms with SMTP support.
 * Cloudflare Workers cannot make raw TCP connections, so this mailer
 * proxies through an HTTP-to-SMTP bridge (e.g. smtp2go, mailhog for dev).
 *
 * For Workers environments, use the Resend or SendGrid mailer instead.
 */
export class SmtpMailer {
  constructor({ host, port, user, pass, bridgeUrl }) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
    this.bridgeUrl = bridgeUrl;
  }

  async send({ to, subject, html, from = 'noreply@agentical.com' }) {
    if (!this.bridgeUrl) {
      throw new Error('SMTP mailer requires bridgeUrl in Workers environment (no raw TCP)');
    }

    const res = await fetch(this.bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: this.host,
        port: this.port,
        auth: { user: this.user, pass: this.pass },
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      throw new Error(`SMTP bridge error: ${res.status}`);
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId || null };
  }
}
```

- [ ] **Step 5: Register providers in mailer.js**

Update `lib/mailer.js`:

```javascript
import { ResendMailer } from './mailers/resend.js';
import { SendGridMailer } from './mailers/sendgrid.js';
import { SmtpMailer } from './mailers/smtp.js';

const MAILERS = {
  resend: ResendMailer,
  sendgrid: SendGridMailer,
  smtp: SmtpMailer,
};

export function createMailer(config) {
  const Provider = MAILERS[config.provider];
  if (!Provider) throw new Error(`Unknown mailer: ${config.provider}`);
  return new Provider(config);
}
```

- [ ] **Step 6: Run all tests**

Run: `npm run test -- test/unit/mailer.test.js`
Expected: All 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add lib/mailers/sendgrid.js lib/mailers/smtp.js lib/mailer.js test/unit/mailer.test.js
git commit -m "feat: SendGrid and SMTP mailer providers"
```

---

### Task 8: Email templates

**Files:**
- Create: `lib/email-templates.js`
- Create: `test/unit/email-templates.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/email-templates.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { confirmationEmail, cancellationEmail, rescheduleEmail, recoveryEmail } from '../../lib/email-templates.js';

const BOOKING = {
  booking_code: 'AC-7K2F',
  magic_token: 'abc123def456',
  booker_name: 'Jane Doe',
  booker_email: 'jane@example.com',
  date: '2026-04-01',
  start_hour: 14,
  duration_minutes: 30,
  meeting_type: 'intro',
  notes: 'Looking forward to chatting',
};

const HOST = { name: 'Ashley Raiteri', headline: 'Engineering Leader' };
const BASE_URL = 'https://agentical.com';
const MEETING_TYPES = { intro: { name: '30-Minute Intro Call', duration: 30 } };

describe('confirmationEmail', () => {
  it('generates host email with booking details', () => {
    const { subject, html } = confirmationEmail('host', BOOKING, HOST, MEETING_TYPES, BASE_URL);
    expect(subject).toContain('New booking');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('2:00 PM');
    expect(html).toContain('AC-7K2F');
  });

  it('generates booker email with magic link', () => {
    const { subject, html } = confirmationEmail('booker', BOOKING, HOST, MEETING_TYPES, BASE_URL);
    expect(subject).toContain('confirmed');
    expect(html).toContain('abc123def456');
    expect(html).toContain('Ashley Raiteri');
    expect(html).toContain('AC-7K2F');
  });
});

describe('cancellationEmail', () => {
  it('generates cancellation email', () => {
    const { subject, html } = cancellationEmail('booker', BOOKING, HOST, MEETING_TYPES, BASE_URL);
    expect(subject.toLowerCase()).toContain('cancel');
    expect(html).toContain('Jane Doe');
  });
});

describe('rescheduleEmail', () => {
  it('generates reschedule email with new time', () => {
    const newBooking = { ...BOOKING, date: '2026-04-03', start_hour: 10 };
    const { subject, html } = rescheduleEmail('booker', BOOKING, newBooking, HOST, MEETING_TYPES, BASE_URL);
    expect(subject.toLowerCase()).toContain('reschedule');
    expect(html).toContain('10:00 AM');
  });
});

describe('recoveryEmail', () => {
  it('generates recovery email with magic links', () => {
    const bookings = [BOOKING, { ...BOOKING, booking_code: 'AC-9X3Z', magic_token: 'xyz789' }];
    const { subject, html } = recoveryEmail(bookings, HOST, MEETING_TYPES, BASE_URL);
    expect(subject.toLowerCase()).toContain('booking');
    expect(html).toContain('abc123def456');
    expect(html).toContain('xyz789');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/email-templates.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement email-templates.js**

Create `lib/email-templates.js`:

```javascript
import { formatTimeLabel } from './calendar.js';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function wrap(body) {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #4A4A4A;">${body}</div>`;
}

export function confirmationEmail(recipient, booking, host, meetingTypes, baseUrl) {
  const type = meetingTypes[booking.meeting_type];
  const typeName = type ? type.name : booking.meeting_type;
  const dateStr = formatDate(booking.date);
  const timeStr = formatTimeLabel(booking.start_hour);
  const manageUrl = `${baseUrl}/manage?token=${booking.magic_token}`;

  if (recipient === 'host') {
    return {
      subject: `New booking: ${booking.booker_name} — ${typeName}`,
      html: wrap(`
        <h2 style="color: #333;">New Booking</h2>
        <p><strong>${booking.booker_name}</strong> (${booking.booker_email}) booked a <strong>${typeName}</strong>.</p>
        <p><strong>When:</strong> ${dateStr} at ${timeStr}</p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
        <p style="color: #8A8A8A; font-size: 14px;">Booking code: ${booking.booking_code}</p>
      `),
    };
  }

  return {
    subject: `Your meeting with ${host.name} is confirmed`,
    html: wrap(`
      <h2 style="color: #333;">You're Booked!</h2>
      <p>Your <strong>${typeName}</strong> with <strong>${host.name}</strong> is confirmed.</p>
      <p><strong>When:</strong> ${dateStr} at ${timeStr}</p>
      <p><strong>Booking code:</strong> ${booking.booking_code}</p>
      <p><a href="${manageUrl}" style="color: #6C5CE7;">Manage your booking</a> (reschedule or cancel)</p>
    `),
  };
}

export function cancellationEmail(recipient, booking, host, meetingTypes, baseUrl) {
  const type = meetingTypes[booking.meeting_type];
  const typeName = type ? type.name : booking.meeting_type;
  const dateStr = formatDate(booking.date);
  const timeStr = formatTimeLabel(booking.start_hour);
  const who = recipient === 'host' ? booking.booker_name : host.name;

  return {
    subject: `Cancelled: ${typeName} on ${dateStr}`,
    html: wrap(`
      <h2 style="color: #333;">Booking Cancelled</h2>
      <p>The <strong>${typeName}</strong> with <strong>${who}</strong> on ${dateStr} at ${timeStr} has been cancelled.</p>
      <p style="color: #8A8A8A; font-size: 14px;">Booking code: ${booking.booking_code}</p>
    `),
  };
}

export function rescheduleEmail(recipient, oldBooking, newBooking, host, meetingTypes, baseUrl) {
  const type = meetingTypes[newBooking.meeting_type];
  const typeName = type ? type.name : newBooking.meeting_type;
  const newDate = formatDate(newBooking.date);
  const newTime = formatTimeLabel(newBooking.start_hour);
  const manageUrl = `${baseUrl}/manage?token=${newBooking.magic_token}`;
  const who = recipient === 'host' ? oldBooking.booker_name : host.name;

  return {
    subject: `Rescheduled: ${typeName} — now ${newDate}`,
    html: wrap(`
      <h2 style="color: #333;">Booking Rescheduled</h2>
      <p>Your <strong>${typeName}</strong> with <strong>${who}</strong> has been moved.</p>
      <p><strong>New time:</strong> ${newDate} at ${newTime}</p>
      ${recipient === 'booker' ? `<p><a href="${manageUrl}" style="color: #6C5CE7;">Manage your booking</a></p>` : ''}
    `),
  };
}

export function recoveryEmail(bookings, host, meetingTypes, baseUrl) {
  const links = bookings.map(b => {
    const type = meetingTypes[b.meeting_type];
    const typeName = type ? type.name : b.meeting_type;
    const dateStr = formatDate(b.date);
    const timeStr = formatTimeLabel(b.start_hour);
    const manageUrl = `${baseUrl}/manage?token=${b.magic_token}`;
    return `<li><a href="${manageUrl}" style="color: #6C5CE7;">${typeName}</a> — ${dateStr} at ${timeStr} (${b.booking_code})</li>`;
  }).join('');

  return {
    subject: `Your bookings with ${host.name}`,
    html: wrap(`
      <h2 style="color: #333;">Your Bookings</h2>
      <p>Here are your upcoming bookings with <strong>${host.name}</strong>:</p>
      <ul>${links}</ul>
    `),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/unit/email-templates.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/email-templates.js test/unit/email-templates.test.js
git commit -m "feat: HTML email templates for booking lifecycle notifications"
```

---

### Task 9: OAuth token management

**Files:**
- Create: `lib/tokens.js`
- Create: `test/unit/tokens.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/unit/tokens.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccessToken, exchangeAuthCode, GOOGLE_SCOPES } from '../../lib/tokens.js';

describe('GOOGLE_SCOPES', () => {
  it('includes calendar scopes only (no gmail)', () => {
    expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(GOOGLE_SCOPES).not.toContain('gmail');
  });
});

describe('getAccessToken', () => {
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn(),
    };
  });

  it('returns cached token if present and not expired', async () => {
    mockKv.get.mockResolvedValue('cached-token-123');

    const token = await getAccessToken({
      kv: mockKv,
      hostId: 'ashley',
      refreshToken: 'refresh-xyz',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(token).toBe('cached-token-123');
    expect(mockKv.get).toHaveBeenCalledWith('token:ashley');
  });

  it('refreshes and caches token if cache is empty', async () => {
    mockKv.get.mockResolvedValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'fresh-token-456',
        expires_in: 3600,
      }),
    });

    const token = await getAccessToken({
      kv: mockKv,
      hostId: 'ashley',
      refreshToken: 'refresh-xyz',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(token).toBe('fresh-token-456');
    expect(mockKv.put).toHaveBeenCalledWith('token:ashley', 'fresh-token-456', { expirationTtl: 3300 });
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('throws if Google token refresh fails', async () => {
    mockKv.get.mockResolvedValue(null);
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid refresh token'),
    });

    await expect(getAccessToken({
      kv: mockKv,
      hostId: 'ashley',
      refreshToken: 'bad-token',
      clientId: 'cid',
      clientSecret: 'csecret',
    })).rejects.toThrow('Google token refresh failed: 401');
  });
});

describe('exchangeAuthCode', () => {
  it('exchanges auth code for tokens', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        expires_in: 3600,
      }),
    });

    const result = await exchangeAuthCode({
      code: 'auth-code-123',
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://agentical.com/auth/callback',
    });

    expect(result.accessToken).toBe('access-abc');
    expect(result.refreshToken).toBe('refresh-xyz');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/unit/tokens.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement tokens.js**

Create `lib/tokens.js`:

```javascript
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * Get a valid access token, using KV cache or refreshing.
 */
export async function getAccessToken({ kv, hostId, refreshToken, clientId, clientSecret }) {
  const cacheKey = `token:${hostId}`;
  const cached = await kv.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const ttl = Math.max(data.expires_in - 300, 60); // cache for 55 min (5 min buffer)
  await kv.put(cacheKey, data.access_token, { expirationTtl: ttl });

  return data.access_token;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google auth code exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/unit/tokens.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tokens.js test/unit/tokens.test.js
git commit -m "feat: Google OAuth token refresh with KV caching"
```

---

### Task 10: Run full test suite + final verification

- [ ] **Step 1: Run all unit tests**

Run: `npm run test`
Expected: All tests pass (approx. 37 tests across 7 test files)

- [ ] **Step 2: Verify no stale imports**

Run: `npm run dev`
Expected: Vite dev server starts, booking flow still works at localhost:5173

- [ ] **Step 3: Review lib/ exports**

Verify each file in `lib/` exports the functions it should:

```bash
grep -r "export " lib/
```

Expected: All public functions are named exports, no default exports.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: verify full test suite passes for core library"
```

---

### Summary

After completing this plan, you will have:

| Module | Tests | Status |
|--------|-------|--------|
| `lib/booking-codes.js` | 5 | Generates AC-XXXX codes + magic tokens |
| `lib/theme.js` | 6 | Validates theme.json, generates CSS properties |
| `lib/calendar.js` | 10 | Availability calculation with busy period filtering |
| `lib/booking.js` | 6 | Booking data creation, status checks, formatting |
| `lib/mailer.js` + providers | 6 | Pluggable email with Resend, SendGrid, SMTP |
| `lib/email-templates.js` | 5 | HTML email templates for all lifecycle events |
| `lib/tokens.js` | 5 | Google OAuth token refresh + KV caching |
| **Total** | **~43** | Core library complete, ready for REST API + MCP |

**Next plan:** Plan 2 — Cloudflare Infrastructure + REST API (wires core library to Workers endpoints).
