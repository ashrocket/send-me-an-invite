import { ResendMailer } from './mailers/resend.js';

const MAILERS = {
  resend: ResendMailer,
};

export function createMailer(config) {
  const Provider = MAILERS[config.provider];
  if (!Provider) throw new Error(`Unknown mailer: ${config.provider}`);
  return new Provider(config);
}
