import {
  Field,
  Bool,
  UInt32,
  UInt64,
  Sign,
  HashInput,
  ProvableExtended,
} from './field-bigint.js';
import * as Json from './gen/transaction-json.js';
import { PublicKey } from './curve-bigint.js';
import * as Encoding from '../mina-signer/copied/encoding.js';
import { provable } from './provable-bigint.js';

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

const TokenId = {
  ...provable(Field),
  toJSON(x: TokenId): Json.TokenId {
    return Encoding.TokenId.toBase58(x);
  },
};

const TokenSymbol = {
  ...provable({ field: Field, symbol: String }),
  toInput({ field }: TokenSymbol): HashInput {
    return { packed: [[field, 48]] };
  },
  toJSON({ symbol }: TokenSymbol) {
    return symbol;
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
    let c = x.constant;
    let n = x.signatureNecessary;
    let s = x.signatureSufficient;
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
};

const AuthorizationKind = {
  ...provable(
    { isSigned: Bool, isProved: Bool },
    {
      customObjectKeys: ['isSigned', 'isProved'],
    }
  ),
  toJSON(x: AuthorizationKind): Json.AuthorizationKind {
    // prettier-ignore
    switch (`${x.isSigned}${x.isProved}`) {
      case '00': return 'None_given';
      case '10': return 'Signature';
      case '01': return 'Proof';
      default: throw Error('Unexpected authorization kind');
    }
  },
};

// types which got an annotation about its circuit type in Ocaml

const Events = dataAsHash({
  emptyValue: [],
  toJSON(data: Field[][]) {
    return data.map((row) => row.map((e) => e.toString()));
  },
});
const StringWithHash = dataAsHash({
  emptyValue: '',
  toJSON(data: string) {
    return data;
  },
});

function dataAsHash<T, J>({
  emptyValue,
  toJSON,
}: {
  emptyValue: T;
  toJSON: (value: T) => J;
}): ProvableExtended<{ data: T; hash: Field }, J> {
  return {
    sizeInFields() {
      return 1;
    },
    toFields({ hash }) {
      return [hash];
    },
    toAuxiliary(value) {
      return [value?.data ?? emptyValue];
    },
    fromFields([hash], [data]) {
      return { data, hash };
    },
    toJSON({ data }) {
      return toJSON(data);
    },
    check() {},
    toInput({ hash }) {
      return { fields: [hash] };
    },
  };
}
