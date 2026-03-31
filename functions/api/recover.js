import { buildContext, getMeetingTypesMap } from '../lib/context.js';
import { json, error } from '../lib/response.js';
import { createMailer } from '../../lib/mailer.js';
import { recoveryEmail } from '../../lib/email-templates.js';

export async function onRequestPost(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);

  let body;
  try { body = await ctx.request.json(); } catch { return error('Invalid JSON body'); }

  const { email } = body;
  if (!email) return error('Missing email field');

  const bookings = await ctx.db.prepare(
    'SELECT * FROM bookings WHERE host_id = ? AND booker_email = ? AND status = ?'
  ).bind(ctx.hostId, email, 'confirmed').all();

  // Always return success — don't leak whether email has bookings
  if (!bookings.results || bookings.results.length === 0) {
    return json({ sent: true, message: 'If bookings exist for that email, a management link has been sent.' });
  }

  try {
    const meetingTypes = getMeetingTypesMap(ctx.host);
    const baseUrl = ctx.env.BASE_URL || `https://${ctx.hostId}.agentical.com`;
    const { subject, html } = recoveryEmail(bookings.results, ctx.host, meetingTypes, baseUrl);

    const mailer = createMailer({
      provider: ctx.host.mailer_provider || 'resend',
      apiKey: ctx.env.RESEND_API_KEY,
      ...JSON.parse(ctx.host.mailer_config || '{}'),
    });

    await mailer.send({ to: email, subject, html, from: 'noreply@agentical.com' });
  } catch (err) {
    console.error('Recovery email error:', err.message);
  }

  return json({ sent: true, message: 'If bookings exist for that email, a management link has been sent.' });
}
