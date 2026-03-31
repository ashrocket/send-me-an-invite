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
