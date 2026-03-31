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
