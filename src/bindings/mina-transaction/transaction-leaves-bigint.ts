import {
  Field,
  Bool,
  UInt32,
  UInt64,
  Sign,
} from '../../mina-signer/src/field-bigint.js';
import { PublicKey } from '../../mina-signer/src/curve-bigint.js';
import { derivedLeafTypesSignable } from './derived-leaves.js';
import { createEvents } from '../../lib/mina/v1/events.js';
import {
  Poseidon,
  HashHelpers,
  packToFields,
} from '../../mina-signer/src/poseidon-bigint.js';
import { mocks, protocolVersions } from '../crypto/constants.js';
import { signable } from '../../mina-signer/src/derivers-bigint.js';

export {
  PublicKey,
  Field,
  Bool,
  AuthRequired,
  UInt64,
  UInt32,
  Sign,
  BalanceChange,
  TokenId,
  MayUseToken,
};

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
type MayUseToken = {
  parentsOwnToken: Bool;
  inheritFromParent: Bool;
};

const { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri, MayUseToken } =
  derivedLeafTypesSignable({ Field, Bool, HashHelpers, packToFields });

type Event = Field[];
type Events = {
  hash: Field;
  data: Event[];
};
type Actions = Events;
const { Events, Actions } = createEvents({ Field, Poseidon });

type ActionState = Field;
const ActionState = {
  ...Field,
  empty: Actions.emptyActionState,
};

type VerificationKeyHash = Field;
const VerificationKeyHash = {
  ...Field,
  empty: () => Field(mocks.dummyVerificationKeyHash),
};

type ReceiptChainHash = Field;
const ReceiptChainHash = {
  ...Field,
  empty: () => HashHelpers.emptyHashWithPrefix('CodaReceiptEmpty'),
};

type TransactionVersion = Field;
const TransactionVersion = {
  ...UInt32,
  empty: () => UInt32(protocolVersions.txnVersion),
};

type BalanceChange = { magnitude: UInt64; sgn: Sign };
const BalanceChange = signable({ magnitude: UInt64, sgn: Sign });
