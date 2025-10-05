import crypto from 'crypto';

export function randomToken(size = 32) {
  return crypto.randomBytes(size).toString('base64url');
}
export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
