import * as Crypto from 'expo-crypto';

const HANDOFF_VERIFIER_BYTE_COUNT = 32;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64Url(bytes: Uint8Array): string {
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const firstByte = bytes[index] ?? 0;
    const secondByte = bytes[index + 1];
    const thirdByte = bytes[index + 2];
    const block = (firstByte << 16) | ((secondByte ?? 0) << 8) | (thirdByte ?? 0);

    encoded += BASE64_ALPHABET[(block >> 18) & 63];
    encoded += BASE64_ALPHABET[(block >> 12) & 63];
    if (secondByte !== undefined) {
      encoded += BASE64_ALPHABET[(block >> 6) & 63];
    }
    if (thirdByte !== undefined) {
      encoded += BASE64_ALPHABET[block & 63];
    }
  }

  return encoded.replaceAll('+', '-').replaceAll('/', '_');
}

export type GoogleHandoffProof = {
  readonly handoffVerifier: string;
  readonly handoffChallenge: string;
};

export async function createGoogleHandoffProof(): Promise<GoogleHandoffProof> {
  const randomBytes = await Crypto.getRandomBytesAsync(HANDOFF_VERIFIER_BYTE_COUNT);
  const handoffVerifier = encodeBase64Url(randomBytes);
  const digestBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    handoffVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );

  return {
    handoffVerifier,
    handoffChallenge: digestBase64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''),
  };
}
