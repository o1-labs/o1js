import { Field, Bool, UInt32, UInt64, Sign } from './field-bigint.js';
import { PublicKey } from './curve-bigint.js';
import { dataAsHash } from './provable-bigint.js';
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

const Events = dataAsHash({
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
const StringWithHash = dataAsHash({
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
