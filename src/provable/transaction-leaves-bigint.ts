import { Field, Bool, UInt32, UInt64, Sign } from './field-bigint.js';
import { PublicKey } from './curve-bigint.js';
import { derivedLeafTypes } from './derived-leaves.js';
import { createEvents } from '../lib/events.js';
import { Poseidon, Hash, packToFields } from './poseidon-bigint.js';

export {
  PublicKey,
  Field,
  Bool,
  AuthRequired,
  AuthorizationKind,
  UInt64,
  UInt32,
  Sign,
  TokenId,
};

export {
  Events,
  SequenceEvents,
  ZkappUri,
  TokenSymbol,
  SequenceState,
  StateHash,
};

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};
type AuthorizationKind = { isSigned: Bool; isProved: Bool };
type TokenId = Field;
type StateHash = Field;
type TokenSymbol = { symbol: string; field: Field };
type ZkappUri = { data: string; hash: Field };

const {
  TokenId,
  StateHash,
  TokenSymbol,
  AuthRequired,
  AuthorizationKind,
  ZkappUri,
} = derivedLeafTypes({ Field, Bool, Hash, packToFields });

type Event = Field[];
type Events = {
  hash: Field;
  data: Event[];
};
type SequenceEvents = Events;
const { Events, SequenceEvents } = createEvents({ Field, Poseidon });

type SequenceState = Field;
const SequenceState = {
  ...Field,
  emptyValue: SequenceEvents.emptySequenceState,
};
