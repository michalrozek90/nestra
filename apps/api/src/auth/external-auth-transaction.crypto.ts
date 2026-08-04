import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export type GoogleRequestSecrets = {
  readonly pkceVerifier: string;
  readonly nonce: string;
};

export type GoogleValidatedClaims = {
  readonly subject: string;
  readonly email: string;
};

export function hashExternalAuthValue(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function createExternalAuthRandomValue(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

export function createPkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

export function areExternalAuthValuesEqual(left: string, right: string): boolean {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);
  return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
}

export function encryptExternalAuthPayload(
  payload: GoogleRequestSecrets | GoogleValidatedClaims,
  key: Buffer,
  transactionId: string,
  provider: string,
  intent: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`${transactionId}|${provider}|${intent}`, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${Buffer.concat([ciphertext, tag]).toString('base64url')}`;
}

export function decryptExternalAuthPayload<T extends GoogleRequestSecrets | GoogleValidatedClaims>(
  encryptedPayload: string,
  key: Buffer,
  transactionId: string,
  provider: string,
  intent: string,
): T | null {
  const [encodedIv, encodedCiphertextAndTag, ...extraParts] = encryptedPayload.split('.');
  if (encodedIv === undefined || encodedCiphertextAndTag === undefined || extraParts.length > 0) {
    return null;
  }

  try {
    const iv = Buffer.from(encodedIv, 'base64url');
    const ciphertextAndTag = Buffer.from(encodedCiphertextAndTag, 'base64url');
    if (iv.length !== 12 || ciphertextAndTag.length < 17) {
      return null;
    }
    const ciphertext = ciphertextAndTag.subarray(0, -16);
    const tag = ciphertextAndTag.subarray(-16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(`${transactionId}|${provider}|${intent}`, 'utf8'));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8',
    );
    const parsedPayload: unknown = JSON.parse(plaintext);
    return typeof parsedPayload === 'object' && parsedPayload !== null
      ? (parsedPayload as T)
      : null;
  } catch {
    return null;
  }
}
