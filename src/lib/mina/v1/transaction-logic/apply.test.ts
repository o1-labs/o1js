/**
 * Unit tests for transaction application logic.
 */
import { applyAccountUpdate } from './apply.js';
import { Account, newAccount } from '../account.js';
import { AccountUpdate, TokenId } from '../account-update.js';
import { PrivateKey, PublicKey } from '../../../provable/crypto/signature.js';
import { Field, Bool } from '../../../provable/wrapped.js';
import { UInt64, UInt32, Int64 } from '../../../provable/int.js';
import { Permissions } from '../account-update.js';

describe('applyAccountUpdate', () => {
  let publicKey: PublicKey;
  let tokenId: Field;
  let account: Account;

  beforeEach(() => {
    publicKey = PrivateKey.random().toPublicKey();
    tokenId = TokenId.default;
    account = newAccount({ publicKey, tokenId });
    account.balance = UInt64.from(1000);
  });

  describe('balance changes', () => {
    it('should apply positive balance change (deposit)', () => {
      // create an account update with +100 balance change
      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.balanceChange = Int64.from(100);

      const updated = applyAccountUpdate(account, update);

      expect(updated.balance.toString()).toBe('1100');
    });

    it('should apply negative balance change (withdrawal)', () => {
      // create an account update with -100 balance change
      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.balanceChange = Int64.from(-100);

      const updated = applyAccountUpdate(account, update);

      expect(updated.balance.toString()).toBe('900');
    });

    it('should apply zero balance change (no change)', () => {
      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.balanceChange = Int64.from(0);

      const updated = applyAccountUpdate(account, update);

      expect(updated.balance.toString()).toBe('1000');
    });

    it('should reject balance change causing negative balance', () => {
      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.balanceChange = Int64.from(-2000); // would make balance -1000

      expect(() => {
        applyAccountUpdate(account, update);
      }).toThrow(/negative balance|insufficient/i);
    });

    it('should handle balance change to exactly zero', () => {
      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.balanceChange = Int64.from(-1000);

      const updated = applyAccountUpdate(account, update);

      expect(updated.balance.toString()).toBe('0');
    });
  });

  describe('nonce increment', () => {
    it('should increment nonce when requested', () => {
      account.nonce = UInt32.from(5);

      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.incrementNonce = Bool(true);

      const updated = applyAccountUpdate(account, update);

      expect(updated.nonce.toString()).toBe('6');
    });

    it('should not increment nonce when not requested', () => {
      account.nonce = UInt32.from(5);

      const update = AccountUpdate.default(publicKey, tokenId);
      update.body.incrementNonce = Bool(false);

      const updated = applyAccountUpdate(account, update);

      expect(updated.nonce.toString()).toBe('5');
    });
  });

  describe('permissions update', () => {
    it('should update permissions when set', () => {
      const update = AccountUpdate.default(publicKey, tokenId);
      const newPermissions = Permissions.allImpossible();
      update.update.permissions.isSome = Bool(true);
      update.update.permissions.value = newPermissions;

      const updated = applyAccountUpdate(account, update);

      expect(updated.permissions).toEqual(newPermissions);
    });

    it('should not update permissions when not set', () => {
      const originalPermissions = account.permissions;

      const update = AccountUpdate.default(publicKey, tokenId);
      update.update.permissions.isSome = Bool(false);

      const updated = applyAccountUpdate(account, update);

      expect(updated.permissions).toEqual(originalPermissions);
    });
  });

  describe('appState updates', () => {
    it('should update single appState field', () => {
      // initialize account with zkapp state
      if (!account.zkapp) {
        account.zkapp = {
          appState: [Field(0), Field(0), Field(0), Field(0), Field(0), Field(0), Field(0), Field(0)],
          verificationKey: undefined,
          zkappVersion: UInt32.zero,
          actionState: [Field(0), Field(0), Field(0), Field(0), Field(0)],
          lastActionSlot: UInt32.zero,
          provedState: Bool(false),
          zkappUri: '',
        };
      }

      const update = AccountUpdate.default(publicKey, tokenId);
      update.update.appState[0].isSome = Bool(true);
      update.update.appState[0].value = Field(42);

      const updated = applyAccountUpdate(account, update);

      expect(updated.zkapp?.appState[0].toString()).toBe('42');
      expect(updated.zkapp?.appState[1].toString()).toBe('0'); // others unchanged
    });

    it('should update multiple appState fields', () => {
      if (!account.zkapp) {
        account.zkapp = {
          appState: [Field(1), Field(2), Field(3), Field(4), Field(5), Field(6), Field(7), Field(8)],
          verificationKey: undefined,
          zkappVersion: UInt32.zero,
          actionState: [Field(0), Field(0), Field(0), Field(0), Field(0)],
          lastActionSlot: UInt32.zero,
          provedState: Bool(false),
          zkappUri: '',
        };
      }

      const update = AccountUpdate.default(publicKey, tokenId);
      update.update.appState[0].isSome = Bool(true);
      update.update.appState[0].value = Field(100);
      update.update.appState[2].isSome = Bool(true);
      update.update.appState[2].value = Field(300);
      update.update.appState[7].isSome = Bool(true);
      update.update.appState[7].value = Field(800);

      const updated = applyAccountUpdate(account, update);

      expect(updated.zkapp?.appState[0].toString()).toBe('100');
      expect(updated.zkapp?.appState[1].toString()).toBe('2'); // unchanged
      expect(updated.zkapp?.appState[2].toString()).toBe('300');
      expect(updated.zkapp?.appState[7].toString()).toBe('800');
    });

    it('should handle account without zkapp', () => {
      // remove zkapp from account
      const plainAccount = newAccount({ publicKey, tokenId });
      plainAccount.balance = UInt64.from(1000);

      const update = AccountUpdate.default(publicKey, tokenId);
      // try to update appState on non-zkapp account
      update.update.appState[0].isSome = Bool(true);
      update.update.appState[0].value = Field(42);

      const updated = applyAccountUpdate(plainAccount, update);

      // should initialize zkapp with the state update
      expect(updated.zkapp?.appState[0].toString()).toBe('42');
      expect(updated.zkapp?.appState[1].toString()).toBe('0');
    });
  });
});
