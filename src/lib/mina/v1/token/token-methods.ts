import { AccountUpdate, Authorization, TokenId } from '../account-update.js';
import { isSmartContract } from '../smart-contract-base.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import type { SmartContract } from '../zkapp.js';
import { UInt64 } from '../../provable/int.js';
import { Bool, Field } from '../../provable/wrapped.js';

export { tokenMethods };

function tokenMethods(self: AccountUpdate) {
  return {
    /**
     * Mints token balance to `address`. Returns the mint account update.
     */
    mint({
      address,
      amount,
    }: {
      address: PublicKey | AccountUpdate | SmartContract;
      amount: number | bigint | UInt64;
    }) {
      let id = TokenId.derive(self.publicKey, self.tokenId);
      let receiver = getApprovedUpdate(self, id, address, 'token.mint()');
      receiver.balance.addInPlace(amount);
      return receiver;
    },

    /**
     * Burn token balance on `address`. Returns the burn account update.
     */
    burn({
      address,
      amount,
    }: {
      address: PublicKey | AccountUpdate | SmartContract;
      amount: number | bigint | UInt64;
    }) {
      let id = TokenId.derive(self.publicKey, self.tokenId);
      let sender = getApprovedUpdate(self, id, address, 'token.burn()');

      // Sub the amount to burn from the sender's account
      sender.balance.subInPlace(amount);

      // Require signature from the sender account being deducted
      sender.body.useFullCommitment = Bool(true);
      Authorization.setLazySignature(sender);
      return sender;
    },

    /**
     * Move token balance from `from` to `to`. Returns the `to` account update.
     */
    send({
      from,
      to,
      amount,
    }: {
      from: PublicKey | AccountUpdate | SmartContract;
      to: PublicKey | AccountUpdate | SmartContract;
      amount: number | bigint | UInt64;
    }) {
      let id = TokenId.derive(self.publicKey, self.tokenId);
      let sender = getApprovedUpdate(self, id, from, 'token.send() (sender)');
      sender.balance.subInPlace(amount);
      sender.body.useFullCommitment = Bool(true);
      Authorization.setLazySignature(sender);

      let receiver = getApprovedUpdate(self, id, to, 'token.send() (receiver)');
      receiver.balance.addInPlace(amount);

      return receiver;
    },
  };
}

// helper

function getApprovedUpdate(
  self: AccountUpdate,
  tokenId: Field,
  child: PublicKey | AccountUpdate | SmartContract,
  label: string
) {
  if (isSmartContract(child)) {
    child = child.self;
  }
  if (child instanceof AccountUpdate) {
    child.tokenId.assertEquals(tokenId);
    self.approve(child);
  }
  if (child instanceof PublicKey) {
    child = AccountUpdate.default(child, tokenId);
    self.approve(child);
  }
  if (!child.label) child.label = `${self.label ?? 'Unlabeled'}.${label}`;
  return child;
}
