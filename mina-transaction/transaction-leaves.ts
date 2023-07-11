import { Field, Bool } from '../../lib/core.js';
import { UInt32, UInt64, Sign } from '../../lib/int.js';
import { PublicKey } from '../../lib/signature.js';
import { derivedLeafTypes } from './derived-leaves.js';
import { createEvents } from '../../lib/events.js';
import {
  Poseidon,
  Hash,
  packToFields,
  emptyHashWithPrefix,
} from '../../lib/hash.js';
import { provable } from '../../lib/circuit_value.js';
import { mocks } from '../crypto/constants.js';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export {
  Events,
  Actions,
  ZkappUri,
  TokenSymbol,
  ActionState,
  VerificationKeyHash,
  ReceiptChainHash,
  StateHash,
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

const { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri } =
  derivedLeafTypes({ Field, Bool, Hash, packToFields });

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
  emptyValue: Actions.emptyActionState,
};

type VerificationKeyHash = Field;
const VerificationKeyHash = {
  ...provable(Field),
  emptyValue: () => Field(mocks.dummyVerificationKeyHash),
};

type ReceiptChainHash = Field;
const ReceiptChainHash = {
  ...provable(Field),
  emptyValue: () => emptyHashWithPrefix('CodaReceiptEmpty'),
};
