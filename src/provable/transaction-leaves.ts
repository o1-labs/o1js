import { Field, Bool } from '../lib/core.js';
import * as Json from './gen/transaction-json.js';
import { UInt32, UInt64, Sign } from '../lib/int.js';
import { TokenSymbol } from '../lib/hash.js';
import { PublicKey } from '../lib/signature.js';
import { Provables, provable } from '../lib/circuit_value.js';
import * as Encoding from '../lib/encoding.js';

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

const TokenId = {
  ...provable(Field),
  toJSON(x: TokenId): Json.TokenId {
    return Encoding.TokenId.toBase58(x);
  },
  fromJSON(x: Json.TokenId) {
    return Encoding.TokenId.fromBase58(x);
  },
};

const AuthRequired = {
  ...provable(
    { constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool },
    {
      customObjectKeys: [
        'constant',
        'signatureNecessary',
        'signatureSufficient',
      ],
    }
  ),
  toJSON(x: AuthRequired): Json.AuthRequired {
    let c = Number(x.constant.toBoolean());
    let n = Number(x.signatureNecessary.toBoolean());
    let s = Number(x.signatureSufficient.toBoolean());
    // prettier-ignore
    switch (`${c}${n}${s}`) {
      case '110': return 'Impossible';
      case '101': return 'None';
      case '000': return 'Proof';
      case '011': return 'Signature';
      case '001': return 'Either';
      default: throw Error('Unexpected permission');
    }
  },
  fromJSON(json: Json.AuthRequired): AuthRequired {
    let map: Record<Json.AuthRequired, string> = {
      Impossible: '110',
      None: '101',
      Proof: '000',
      Signature: '011',
      Either: '001',
    };
    let code = map[json];
    if (code === undefined) throw Error('Unexpected permission');
    let [constant, signatureNecessary, signatureSufficient] = code
      .split('')
      .map((s) => Bool(!!Number(s)));
    return { constant, signatureNecessary, signatureSufficient };
  },
};

const AuthorizationKind = {
  ...provable(
    { isSigned: Bool, isProved: Bool },
    {
      customObjectKeys: ['isSigned', 'isProved'],
    }
  ),
  toJSON(x: AuthorizationKind): Json.AuthorizationKind {
    let isSigned = Number(x.isSigned.toBoolean());
    let isProved = Number(x.isProved.toBoolean());
    // prettier-ignore
    switch (`${isSigned}${isProved}`) {
      case '00': return 'None_given';
      case '10': return 'Signature';
      case '01': return 'Proof';
      default: throw Error('Unexpected authorization kind');
    }
  },
  fromJSON(json: Json.AuthorizationKind): AuthorizationKind {
    let booleans = {
      None_given: [false, false],
      Signature: [true, false],
      Proof: [false, true],
    }[json];
    if (booleans === undefined) throw Error('Unexpected authorization kind');
    let [isSigned, isProved] = booleans.map(Bool);
    return { isSigned, isProved };
  },
};

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
