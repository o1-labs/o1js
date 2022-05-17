import { Field, Bool, Group, Ledger } from '../snarky';
import { BalanceChange } from './parties';
import * as Json from './parties-json';

export {
  PublicKey,
  Field,
  Bool,
  VerificationKey,
  AuthRequired,
  Balance,
  GlobalSlot,
  CurrencyAmount,
  StateHash,
  Fee,
  BlockTime,
  UInt32,
  Signature,
  TokenId,
  Sign,
  SnappProof,
  Memo,
};

export { toJson, toJsonLeafTypes, toFields, toFieldsLeafTypes };

type UInt64 = { value: Field };
type UInt32 = { value: Field };
type Sign = Field; // constrained to +-1
type PublicKey = { g: Group };
type Memo = string;

// these two are opaque to JS atm
type VerificationKey = string;
type SnappProof = string;
type Signature = string; // <-- should be exposed fairly easily!

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};

// derived types
type Balance = UInt64;
type GlobalSlot = UInt32;
type CurrencyAmount = UInt64;
type StateHash = Field;
type Fee = UInt64;
type BlockTime = UInt32;
type TokenId = Field;

// to what types in the js layout are mapped
type TypeMap = {
  PublicKey: PublicKey;
  Field: Field;
  Bool: Bool;
  VerificationKey: VerificationKey;
  AuthRequired: AuthRequired;
  Balance: Balance;
  GlobalSlot: GlobalSlot;
  CurrencyAmount: CurrencyAmount;
  StateHash: StateHash;
  Fee: Fee;
  BlockTime: BlockTime;
  UInt32: UInt32;
  Signature: Signature;
  TokenId: TokenId;
  Sign: Sign;
  SnappProof: SnappProof;
  Memo: Memo;
  // builtin
  number: number;
  string: string;
  null: null;
  undefined: undefined;
  bigint: bigint;
};

// json conversion

function identity(x: any) {
  return x;
}
function asString(x: Field | UInt32 | UInt64 | bigint) {
  return x.toString();
}

type ToJsonTypeMap = TypeMap & {
  BalanceChange: BalanceChange;
  BlockTimeInterval: { lower: BlockTime; upper: BlockTime };
};
type ToJson = {
  [K in keyof ToJsonTypeMap]: (x: ToJsonTypeMap[K]) => Json.TypeMap[K];
};

let ToJson: ToJson = {
  PublicKey(x: PublicKey): Json.PublicKey {
    return Ledger.publicKeyToString(x);
  },
  Field: asString,
  Bool(x: Bool) {
    return x.toBoolean();
  },
  AuthRequired(x: AuthRequired) {
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
  Balance: asString,
  GlobalSlot: asString,
  CurrencyAmount: asString,
  StateHash: asString,
  Fee: asString,
  BlockTime: asString,
  UInt32: asString,
  TokenId(x: TokenId) {
    return Ledger.fieldToBase58(x);
  },
  Sign(x: Sign) {
    if (x.toString() === '1') return 'Positive';
    if (x.neg().toString() === '1') return 'Negative';
    throw Error(`Invalid Sign: ${x}`);
  },
  VerificationKey: identity,
  Signature: identity,
  SnappProof: identity,
  Memo: identity,
  // override automatic conversion, essentially defining custom leaf types
  BalanceChange({ magnitude, sgn }: BalanceChange) {
    // TODO this is a hack, magnitude is actually the full int64
    let b = magnitude.toString();
    if (b.charAt(0) === '-') {
      return { magnitude: b.slice(1), sgn: 'Negative' };
    } else {
      return { magnitude: b, sgn: 'Positive' };
    }
  },
  // TODO this is a hack
  BlockTimeInterval(_: { lower: BlockTime; upper: BlockTime }) {
    return null;
  },
  // builtin
  number: identity,
  string: identity,
  null: identity,
  undefined(_: undefined) {
    return null;
  },
  bigint: asString,
};

function toJson<K extends keyof ToJsonTypeMap>(
  typeName: K,
  value: ToJsonTypeMap[K]
) {
  if (!(typeName in ToJson))
    throw Error(`toJson: unsupported type "${typeName}"`);
  return ToJson[typeName](value);
}

// to fields

type ToFields = { [K in keyof TypeMap]: (x: TypeMap[K]) => Field[] };

function asFields(x: any): Field[] {
  return x.toFields();
}
function empty(x: any) {
  return [];
}

let ToFields: ToFields = {
  PublicKey: asFields,
  Field: asFields,
  Bool: asFields,
  AuthRequired(x: AuthRequired) {
    return [x.constant, x.signatureNecessary, x.signatureSufficient]
      .map(asFields)
      .flat();
  },
  Balance: asFields,
  GlobalSlot: asFields,
  CurrencyAmount: asFields,
  StateHash: asFields,
  Fee: asFields,
  BlockTime: asFields,
  UInt32: asFields,
  TokenId: asFields,
  Sign: asFields,
  VerificationKey: empty, // the hash is separate
  Signature: empty, // doesn't have to be converted to fields
  SnappProof: empty, // doesn't have to be converted to fields
  Memo: empty, // doesn't have to be converted to fields
  // builtin
  number: empty,
  string: empty,
  null: empty,
  undefined: empty,
  bigint: empty,
};

function toFields<K extends keyof TypeMap>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToFields))
    throw Error(`toFields: unsupported type "${typeName}"`);
  return ToFields[typeName](value);
}

let toJsonLeafTypes = new Set(Object.keys(ToJson));
let toFieldsLeafTypes = new Set(Object.keys(ToFields));
