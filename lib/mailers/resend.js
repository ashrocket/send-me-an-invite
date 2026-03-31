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
