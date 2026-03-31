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
