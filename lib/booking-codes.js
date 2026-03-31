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
