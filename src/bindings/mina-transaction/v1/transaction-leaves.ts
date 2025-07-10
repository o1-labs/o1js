import { createEvents } from '../../../lib/mina/v1/events.js';
import {
  HashHelpers,
  Poseidon,
  emptyHashWithPrefix,
  packToFields,
} from '../../../lib/provable/crypto/poseidon.js';
import { PublicKey } from '../../../lib/provable/crypto/signature.js';
import { Int64, Sign, UInt32, UInt64 } from '../../../lib/provable/int.js';
import { provable } from '../../../lib/provable/types/provable-derivers.js';
import { Bool, Field } from '../../../lib/provable/wrapped.js';
import { mocks, protocolVersions } from '../../crypto/constants.js';

import { derivedLeafTypes } from './derived-leaves.js';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, BalanceChange, TokenId };

export {
  Events,
  Actions,
  ZkappUri,
  TokenSymbol,
  ActionState,
  VerificationKeyHash,
  ReceiptChainHash,
  StateHash,
  TransactionVersion,
  MayUseToken,
};

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};
type TokenId = Field;
type StateHash = Field;
type TokenSymbol = { symbol: string; field: Field };
type ZkappUri = { data: string; hash: Field };

const { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri } = derivedLeafTypes({
  Field,
  Bool,
  HashHelpers,
  packToFields,
});

type Event = Field[];
type Events = {
  hash: Field;
  data: Event[];
};
type Actions = Events;
const { Events, Actions } = createEvents({ Field, Poseidon });

type ActionState = Field;
const ActionState = {
  ...provable(Field),
  empty: Actions.emptyActionState,
};

type VerificationKeyHash = Field;
const VerificationKeyHash = {
  ...provable(Field),
  empty: () => Field(mocks.dummyVerificationKeyHash),
};

type ReceiptChainHash = Field;
const ReceiptChainHash = {
  ...provable(Field),
  empty: () => emptyHashWithPrefix('CodaReceiptEmpty'),
};

type TransactionVersion = Field;
const TransactionVersion = {
  ...provable(UInt32),
  empty: () => UInt32.from(protocolVersions.txnVersion),
};

type BalanceChange = Int64;
const BalanceChange = Int64;
type MayUseToken = {
  parentsOwnToken: Bool;
  inheritFromParent: Bool;
};
const MayUseToken = {
  ...provable({ parentsOwnToken: Bool, inheritFromParent: Bool }),

  check: ({ parentsOwnToken, inheritFromParent }: MayUseToken) => {
    Bool.check(parentsOwnToken);
    Bool.check(inheritFromParent);
    parentsOwnToken
      .and(inheritFromParent)
      .assertFalse('MayUseToken: parentsOwnToken and inheritFromParent cannot both be true');
  },
};
