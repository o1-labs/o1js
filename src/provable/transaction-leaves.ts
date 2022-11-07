import { Field, Bool } from '../lib/core.js';
import { UInt32, UInt64, Sign } from '../lib/int.js';
import { PublicKey } from '../lib/signature.js';
import { Provables } from '../lib/circuit_value.js';
import { derivedLeafTypes } from './derived-leaves.js';

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

export { Events, Events as SequenceEvents, StringWithHash, TokenSymbol };

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};
type AuthorizationKind = { isSigned: Bool; isProved: Bool };
type TokenId = Field;
type TokenSymbol = { symbol: string; field: Field };

const { TokenId, TokenSymbol, AuthRequired, AuthorizationKind } =
  derivedLeafTypes({ Field, Bool });

// types which got an annotation about its circuit type in Ocaml

const Events = Provables.dataAsHash({
  emptyValue: [],
  toJSON(data: Field[][]) {
    return data.map((row) => row.map((e) => e.toString()));
  },
  fromJSON(json: string[][]) {
    let data = json.map((row) => row.map((e) => Field(e)));
    // TODO compute hash
    throw Error('unimplemented');
  },
});
const StringWithHash = Provables.dataAsHash({
  emptyValue: '',
  toJSON(data: string) {
    return data;
  },
  fromJSON(json: string) {
    let data = json;
    // TODO compute hash
    throw Error('unimplemented');
  },
});
