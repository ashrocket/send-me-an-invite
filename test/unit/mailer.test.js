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
