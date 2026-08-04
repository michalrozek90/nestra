import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  areExternalAuthValuesEqual,
  createPkceChallenge,
  decryptExternalAuthPayload,
  encryptExternalAuthPayload,
} from './external-auth-transaction.crypto';

describe('external auth transaction crypto', () => {
  it('round-trips request secrets only with matching authenticated context', () => {
    const key = randomBytes(32);
    const payload = { pkceVerifier: 'verifier', nonce: 'nonce' };
    const encryptedPayload = encryptExternalAuthPayload(
      payload,
      key,
      'transaction',
      'google',
      'sign_in',
    );

    assert.deepEqual(
      decryptExternalAuthPayload(encryptedPayload, key, 'transaction', 'google', 'sign_in'),
      payload,
    );
    assert.equal(
      decryptExternalAuthPayload(encryptedPayload, key, 'transaction', 'google', 'link'),
      null,
    );
  });

  it('uses SHA-256 base64url challenges and constant-time equality semantics', () => {
    assert.equal(createPkceChallenge('verifier'), 'iMnq5o6zALKXGivsnlom_0F5_WYda32GHkxlV7mq7hQ');
    assert.equal(areExternalAuthValuesEqual('same', 'same'), true);
    assert.equal(areExternalAuthValuesEqual('same', 'different'), false);
  });
});
