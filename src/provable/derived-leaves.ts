import { GenericBool, GenericField, GenericHashInput } from './generic.js';
import { createProvable } from './provable-generic.js';
import * as Json from './gen/transaction-json.js';
import { fieldEncodings, prefixToField } from './binable.js';

export { derivedLeafTypes };

function derivedLeafTypes<Field, Bool>({
  Field,
  Bool,
}: {
  Field: GenericField<Field>;
  Bool: GenericBool<Field, Bool>;
}) {
  let provable = createProvable<Field>();
  const Encoding = fieldEncodings<Field>(Field);

  type TokenId = Field;
  type TokenSymbol = { symbol: string; field: Field };
  type AuthRequired = {
    constant: Bool;
    signatureNecessary: Bool;
    signatureSufficient: Bool;
  };
  type AuthorizationKind = { isSigned: Bool; isProved: Bool };

  const TokenId = {
    ...provable(Field),
    toJSON(x: TokenId): Json.TokenId {
      return Encoding.TokenId.toBase58(x);
    },
    fromJSON(x: Json.TokenId) {
      return Encoding.TokenId.fromBase58(x);
    },
  };

  type HashInput = GenericHashInput<Field>;
  const TokenSymbol = {
    ...provable({ field: Field, symbol: String }),
    toInput({ field }: TokenSymbol): HashInput {
      return { packed: [[field, 48]] };
    },
    toJSON({ symbol }: TokenSymbol) {
      return symbol;
    },
    fromJSON(symbol: string): TokenSymbol {
      return { symbol, field: prefixToField(Field, symbol) };
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
      let c = Number(Bool.toJSON(x.constant));
      let n = Number(Bool.toJSON(x.signatureNecessary));
      let s = Number(Bool.toJSON(x.signatureSufficient));
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
      let isSigned = Number(Bool.toJSON(x.isSigned));
      let isProved = Number(Bool.toJSON(x.isProved));
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

  return { TokenId, TokenSymbol, AuthRequired, AuthorizationKind };
}
