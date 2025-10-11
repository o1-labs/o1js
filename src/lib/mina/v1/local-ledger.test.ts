/**
 * Unit tests for the TypeScript Ledger implementation
 */

import { Ledger } from './local-ledger.js';
import type { MlPublicKey } from '../../../bindings.js';
import type { FieldConst } from '../../provable/core/fieldvar.js';

describe('Ledger Tests', () => {
  describe('Ledger.create()', () => {
    it('should create an empty ledger', () => {
      const ledger = Ledger.create();
      expect(ledger).toBeInstanceOf(Ledger);
    });

    it('should create independent ledgers', () => {
      const ledger1 = Ledger.create();
      const ledger2 = Ledger.create();

      const pk = createTestPublicKey(1n);
      ledger1.addAccount(pk, '1000');

      // ledger2 should be empty
      expect(ledger2.getAccount(pk, defaultTokenId())).toBeUndefined();
    });
  });

  describe('addAccount()', () => {
    it('should add an account with balance', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);

      ledger.addAccount(pk, '1000000000'); // 1 MINA

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account).toBeDefined();
      expect(account!.balance).toBe('1000000000');
    });

    it('should add multiple accounts', () => {
      const ledger = Ledger.create();
      const pk1 = createTestPublicKey(1n);
      const pk2 = createTestPublicKey(2n);
      const pk3 = createTestPublicKey(3n);

      ledger.addAccount(pk1, '1000');
      ledger.addAccount(pk2, '2000');
      ledger.addAccount(pk3, '3000');

      expect(ledger.getAccount(pk1, defaultTokenId())!.balance).toBe('1000');
      expect(ledger.getAccount(pk2, defaultTokenId())!.balance).toBe('2000');
      expect(ledger.getAccount(pk3, defaultTokenId())!.balance).toBe('3000');
    });

    it('should reject duplicate accounts', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);

      ledger.addAccount(pk, '1000');

      expect(() => {
        ledger.addAccount(pk, '2000');
      }).toThrow(/already exists/);
    });

    it('should handle zero balance', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);

      ledger.addAccount(pk, '0');

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account).toBeDefined();
      expect(account!.balance).toBe('0');
    });

    it('should handle large balances', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);
      const largeBalance = '1000000000000000000';

      ledger.addAccount(pk, largeBalance);

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account!.balance).toBe(largeBalance);
    });
  });

  describe('getAccount()', () => {
    it('should return undefined for non-existent account', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account).toBeUndefined();
    });

    it('should return the correct account', () => {
      const ledger = Ledger.create();
      const pk1 = createTestPublicKey(1n);
      const pk2 = createTestPublicKey(2n);

      ledger.addAccount(pk1, '1000');
      ledger.addAccount(pk2, '2000');

      const account1 = ledger.getAccount(pk1, defaultTokenId());
      const account2 = ledger.getAccount(pk2, defaultTokenId());

      expect(account1!.balance).toBe('1000');
      expect(account2!.balance).toBe('2000');
    });

    it('should distinguish accounts by public key', () => {
      const ledger = Ledger.create();
      const pk1 = createTestPublicKey(1n);
      const pk2 = createTestPublicKey(2n);

      ledger.addAccount(pk1, '1000');

      expect(ledger.getAccount(pk1, defaultTokenId())).toBeDefined();
      expect(ledger.getAccount(pk2, defaultTokenId())).toBeUndefined();
    });

    it('should distinguish accounts by token ID', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);
      const tokenId1 = defaultTokenId();
      const tokenId2: FieldConst = [0, 5n]; // custom token

      ledger.addAccount(pk, '1000'); // default token only

      expect(ledger.getAccount(pk, tokenId1)).toBeDefined();
      expect(ledger.getAccount(pk, tokenId2)).toBeUndefined();
    });

    it('should return account with correct structure', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(123456789n);

      ledger.addAccount(pk, '5000000000');

      const account = ledger.getAccount(pk, defaultTokenId());

      expect(account).toMatchObject({
        balance: '5000000000',
        nonce: '0',
        tokenSymbol: '',
        timing: {
          isTimed: false,
        },
        permissions: {
          editState: 'Signature',
          send: 'Signature',
          receive: 'None',
        },
        zkapp: null,
      });
    });
  });

  describe('Account ID encoding', () => {
    it('should handle different public keys with same isOdd', () => {
      const ledger = Ledger.create();
      const pk1 = createTestPublicKey(100n, false);
      const pk2 = createTestPublicKey(200n, false);

      ledger.addAccount(pk1, '1000');
      ledger.addAccount(pk2, '2000');

      expect(ledger.getAccount(pk1, defaultTokenId())!.balance).toBe('1000');
      expect(ledger.getAccount(pk2, defaultTokenId())!.balance).toBe('2000');
    });

    it('should handle same x with different isOdd', () => {
      const ledger = Ledger.create();
      const pk1 = createTestPublicKey(100n, false);
      const pk2 = createTestPublicKey(100n, true);

      ledger.addAccount(pk1, '1000');
      ledger.addAccount(pk2, '2000');

      expect(ledger.getAccount(pk1, defaultTokenId())!.balance).toBe('1000');
      expect(ledger.getAccount(pk2, defaultTokenId())!.balance).toBe('2000');
    });

    it('should handle very large field values', () => {
      const ledger = Ledger.create();
      const largex = (1n << 250n) - 1n; // near max field value
      const pk = createTestPublicKey(largex);

      ledger.addAccount(pk, '1000');

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account).toBeDefined();
      expect(account!.balance).toBe('1000');
    });
  });

  describe('applyJsonTransaction()', () => {
    it.skip('TODO: needs real transaction test', () => {
      // TODO: add real transaction tests once we have the integration ready
    });
  });

  describe('Edge cases', () => {
    it('should handle account with x = 0', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(0n);

      ledger.addAccount(pk, '1000');

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account).toBeDefined();
    });

    it('should handle account with x = 1', () => {
      const ledger = Ledger.create();
      const pk = createTestPublicKey(1n);

      ledger.addAccount(pk, '1000');

      const account = ledger.getAccount(pk, defaultTokenId());
      expect(account).toBeDefined();
    });

    it('should maintain independence between different ledgers', () => {
      const ledger1 = Ledger.create();
      const ledger2 = Ledger.create();
      const pk = createTestPublicKey(1n);

      ledger1.addAccount(pk, '1000');
      ledger2.addAccount(pk, '5000');

      expect(ledger1.getAccount(pk, defaultTokenId())!.balance).toBe('1000');
      expect(ledger2.getAccount(pk, defaultTokenId())!.balance).toBe('5000');
    });
  });
});

// Helpers

/**
 * Creates a test public key from a bigint value.
 */
function createTestPublicKey(x: bigint, isOdd: boolean = false): MlPublicKey {
  const fieldConst: FieldConst = [0, x];
  const mlBool: 0 | 1 = isOdd ? 1 : 0;
  return [0, fieldConst, mlBool];
}

/**
 * Returns the default token ID (1n = MINA token).
 */
function defaultTokenId(): FieldConst {
  return [0, 1n];
}
