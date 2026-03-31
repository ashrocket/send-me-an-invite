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
