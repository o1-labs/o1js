import { Types } from '../../provable/types.js';
import { Bool, Field, LedgerAccount } from '../../snarky.js';
import { Permissions } from '../account_update.js';
import { UInt32, UInt64 } from '../int.js';
import { PublicKey } from '../signature.js';

export { ledgerAccountToJSON };

function ledgerAccountToJSON({
  balance,
  nonce,
  permissions,
  publicKey,
  receiptChainHash,
  timing,
  tokenId,
  tokenSymbol,
  votingFor,
  delegate,
  zkapp,
}: LedgerAccount): Types.Account {
  return {
    balance: UInt64.fromObject(balance),
    nonce: UInt32.fromObject(nonce),
    permissions: Permissions.fromJSON(permissions),
    publicKey: PublicKey.fromObject(publicKey),
    receiptChainHash,
    timing: {
      cliffAmount: UInt64.fromObject(timing.cliffAmount),
      cliffTime: UInt32.fromObject(timing.cliffTime),
      initialMinimumBalance: UInt64.fromObject(timing.initialMinimumBalance),
      isTimed: timing.isTimed,
      vestingIncrement: UInt64.fromObject(timing.vestingIncrement),
      vestingPeriod: UInt32.fromObject(timing.vestingPeriod),
    },
    tokenId,
    tokenSymbol,
    votingFor,
    delegate: delegate && PublicKey.fromObject(delegate),
    zkapp: zkapp && {
      appState: zkapp.appState,
      lastSequenceSlot: UInt32.from(zkapp.lastSequenceSlot),
      provedState: Bool(zkapp.provedState),
      sequenceState: zkapp.sequenceState,
      zkappUri: '',
      zkappVersion: UInt32.from(zkapp.zkappVersion),
      verificationKey: zkapp.verificationKey && {
        data: zkapp.verificationKey.data,
        hash: Field(zkapp.verificationKey.hash),
      },
    },
  };
}
