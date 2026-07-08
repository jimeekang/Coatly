import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function getEncryptionSecret() {
  const secret = process.env.GOOGLE_CALENDAR_TOKEN_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'Missing GOOGLE_CALENDAR_TOKEN_SECRET. Add a long random secret before using Google Calendar integration.'
    );
  }

  return createHash('sha256').update(secret).digest();
}

export function encryptGoogleRefreshToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptGoogleRefreshToken(payload: string) {
  const [ivPart, tagPart, encryptedPart] = payload.split('.');

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Stored Google Calendar token could not be decrypted.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionSecret(),
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
