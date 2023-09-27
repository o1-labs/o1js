import { GenericBool, GenericField, GenericHashInput } from '../lib/generic.js';
import { createProvable } from '../lib/provable-generic.js';
import * as Json from './gen/transaction-json.js';
import {
  bytesToBits,
  prefixToField,
  stringLengthInBytes,
  stringToBytes,
} from '../lib/binable.js';
import { fieldEncodings } from '../../lib/base58.js';
import { dataAsHash } from '../../lib/events.js';
import { HashHelpers } from '../../lib/hash-generic.js';
import { prefixes } from '../crypto/constants.js';

export { derivedLeafTypes, tokenSymbolLength };

const tokenSymbolLength = 6;

function derivedLeafTypes<Field, Bool>({
  Field,
  Bool,
  Hash,
  packToFields,
}: {
  Field: GenericField<Field>;
  Bool: GenericBool<Field, Bool>;
  Hash: HashHelpers<Field>;
  packToFields: (input: GenericHashInput<Field>) => Field[];
}) {
  let provable = createProvable<Field>();
  const Encoding = fieldEncodings<Field>(Field);

  type TokenId = Field;
  type StateHash = Field;
  type TokenSymbol = { symbol: string; field: Field };
  type AuthRequired = {
    constant: Bool;
    signatureNecessary: Bool;
    signatureSufficient: Bool;
  };

  const defaultTokenId = 1;
  const TokenId = {
    ...provable(Field),
    emptyValue(): TokenId {
      return Field(defaultTokenId);
    },
    toJSON(x: TokenId): Json.TokenId {
      return Encoding.TokenId.toBase58(x);
    },
    fromJSON(x: Json.TokenId) {
      return Encoding.TokenId.fromBase58(x);
    },
  };

  const StateHash = {
    ...provable(Field),
    toJSON(x: Field): Json.Field {
      return Encoding.StateHash.toBase58(x);
    },
    fromJSON(x: Json.Field) {
      return Encoding.StateHash.fromBase58(x);
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
      let bytesLength = stringLengthInBytes(symbol);
      if (bytesLength > tokenSymbolLength)
        throw Error(
          `Token symbol ${symbol} should be a maximum of 6 bytes, but is ${bytesLength}`
        );
      return { symbol, field: prefixToField(Field, symbol) };
    },
  };

  const AuthRequired = {
    ...provable({
      constant: Bool,
      signatureNecessary: Bool,
      signatureSufficient: Bool,
    }),
    emptyValue(): AuthRequired {
      return {
        constant: Bool(true),
        signatureNecessary: Bool(false),
        signatureSufficient: Bool(true),
      };
    },
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

  // Mina_base.Zkapp_account.hash_zkapp_uri_opt
  function hashZkappUri(uri: string) {
    let bits = bytesToBits(stringToBytes(uri));
    bits.push(true);
    let input: HashInput = { packed: bits.map((b) => [Field(Number(b)), 1]) };
    let packed = packToFields(input);
    return Hash.hashWithPrefix(prefixes.zkappUri, packed);
  }

  const ZkappUri = dataAsHash<string, string, Field>({
    emptyValue() {
      let hash = Hash.hashWithPrefix(prefixes.zkappUri, [Field(0), Field(0)]);
      return { data: '', hash };
    },
    toJSON(data: string) {
      return data;
    },
    fromJSON(json: string) {
      return { data: json, hash: hashZkappUri(json) };
    },
  });

  return { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri };
}
