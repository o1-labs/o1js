import {
  GenericBool,
  GenericField,
  GenericHashInput,
  GenericSignable,
  GenericSignableBool,
  GenericSignableField,
} from '../lib/generic.js';
import { createDerivers } from '../lib/provable-generic.js';
import * as Json from './gen/transaction-json.js';
import {
  bytesToBits,
  prefixToField,
  stringLengthInBytes,
  stringToBytes,
} from '../lib/binable.js';
import { Base58, fieldEncodings } from '../../lib/util/base58.js';
import { dataAsHash } from '../../lib/mina/v1/events.js';
import { HashHelpers } from '../../lib/provable/crypto/hash-generic.js';
import { prefixes } from '../crypto/constants.js';

export { derivedLeafTypes, derivedLeafTypesSignable, tokenSymbolLength };

const tokenSymbolLength = 6;

function derivedLeafTypes<Field, Bool>({
  Field,
  Bool,
  HashHelpers,
  packToFields,
}: {
  Field: GenericField<Field>;
  Bool: GenericBool<Field, Bool>;
  HashHelpers: HashHelpers<Field>;
  packToFields: (input: GenericHashInput<Field>) => Field[];
}) {
  let { provable } = createDerivers<Field>();
  const Encoding = fieldEncodings<Field>(Field);
  const fieldBase = provable(Field);

  return {
    TokenId: createEncodedField(
      fieldBase,
      Encoding.TokenId,
      Field(defaultTokenId)
    ),
    StateHash: createEncodedField(fieldBase, Encoding.StateHash),
    TokenSymbol: createTokenSymbol(
      provable({ field: Field, symbol: String }),
      Field
    ),
    AuthRequired: createAuthRequired(
      provable({
        constant: Bool,
        signatureNecessary: Bool,
        signatureSufficient: Bool,
      }),
      Bool
    ),
    ZkappUri: createZkappUri(Field, HashHelpers, packToFields),
  };
}

function derivedLeafTypesSignable<Field, Bool>({
  Field,
  Bool,
  HashHelpers,
  packToFields,
}: {
  Field: GenericSignableField<Field>;
  Bool: GenericSignableBool<Field, Bool>;
  HashHelpers: HashHelpers<Field>;
  packToFields: (input: GenericHashInput<Field>) => Field[];
}) {
  let { signable } = createDerivers<Field>();
  const Encoding = fieldEncodings<Field>(Field);
  const fieldBase = signable(Field);

  return {
    TokenId: createEncodedField(
      fieldBase,
      Encoding.TokenId,
      Field(defaultTokenId)
    ),
    StateHash: createEncodedField(fieldBase, Encoding.StateHash),
    TokenSymbol: createTokenSymbol(
      signable({ field: Field, symbol: String }),
      Field
    ),
    AuthRequired: createAuthRequired(
      signable({
        constant: Bool,
        signatureNecessary: Bool,
        signatureSufficient: Bool,
      }),
      Bool
    ),
    MayUseToken: signable({ parentsOwnToken: Bool, inheritFromParent: Bool }),
    Bool,
    ZkappUri: createZkappUri(Field, HashHelpers, packToFields),
  };
}

const defaultTokenId = 1;

function createEncodedField<
  Field,
  Base extends GenericSignable<Field, string, Field>
>(base: Base, encoding: Base58<Field>, empty?: Field) {
  return {
    ...(base as Omit<Base, 'toJSON' | 'fromJSON'>),
    empty: empty !== undefined ? () => empty : base.empty,
    toJSON(x: Field): Json.TokenId {
      return encoding.toBase58(x);
    },
    fromJSON(x: Json.TokenId) {
      return encoding.fromBase58(x);
    },
  };
}

type TokenSymbol<Field> = { symbol: string; field: Field };

function createTokenSymbol<
  Field,
  Base extends GenericSignable<TokenSymbol<Field>, any, Field>
>(base: Base, Field: GenericSignableField<Field>) {
  let self = {
    ...(base as Omit<Base, 'toJSON' | 'fromJSON'>),
    toInput({ field }: TokenSymbol<Field>): GenericHashInput<Field> {
      return { packed: [[field, 48]] };
    },
    toJSON({ symbol }: TokenSymbol<Field>) {
      return symbol;
    },
    fromJSON(symbol: string): TokenSymbol<Field> {
      let bytesLength = stringLengthInBytes(symbol);
      if (bytesLength > tokenSymbolLength)
        throw Error(
          `Token symbol ${symbol} should be a maximum of 6 bytes, but is ${bytesLength}`
        );
      return { symbol, field: prefixToField(Field, symbol) };
    },
  };
  return self;
}

type AuthRequired<Bool> = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};

function createAuthRequired<
  Field,
  Bool,
  Base extends GenericSignable<AuthRequired<Bool>, AuthRequired<boolean>, Field>
>(base: Base, Bool: GenericSignableBool<Field, Bool>) {
  return {
    ...(base as Omit<Base, 'toJSON' | 'fromJSON'>),
    empty(): AuthRequired<Bool> {
      return {
        constant: Bool(true),
        signatureNecessary: Bool(false),
        signatureSufficient: Bool(true),
      };
    },
    toJSON(x: AuthRequired<Bool>): Json.AuthRequired {
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
    fromJSON(json: Json.AuthRequired): AuthRequired<Bool> {
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
}

function createZkappUri<Field>(
  Field: GenericSignableField<Field>,
  HashHelpers: HashHelpers<Field>,
  packToFields: (input: GenericHashInput<Field>) => Field[]
) {
  // Mina_base.Zkapp_account.hash_zkapp_uri_opt
  function hashZkappUri(uri: string) {
    let bits = bytesToBits(stringToBytes(uri));
    bits.push(true);
    let input: GenericHashInput<Field> = {
      packed: bits.map((b) => [Field(Number(b)), 1]),
    };
    let packed = packToFields(input);
    return HashHelpers.hashWithPrefix(prefixes.zkappUri, packed);
  }

  return dataAsHash<string, string, string, Field>({
    empty() {
      let hash = HashHelpers.hashWithPrefix(prefixes.zkappUri, [
        Field(0),
        Field(0),
      ]);
      return { data: '', hash };
    },
    toValue(data) {
      return data;
    },
    fromValue(value) {
      return value;
    },
    toJSON(data: string) {
      return data;
    },
    fromJSON(json: string) {
      return { data: json, hash: hashZkappUri(json) };
    },
    Field,
  });
}
