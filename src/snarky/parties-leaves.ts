import { Field, Bool, Group, Ledger } from '../snarky';
import * as Json from './parties-json';

export {
  PublicKey,
  Field,
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

export { toJson };

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
  boolean: boolean;
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

type ToJson = { [K in keyof TypeMap]: (x: TypeMap[K]) => Json.TypeMap[K] };

let ToJson: ToJson = {
  PublicKey(x: PublicKey): Json.PublicKey {
    return Ledger.publicKeyToString(x);
  },
  Field: asString,
  AuthRequired(x: AuthRequired): Json.AuthRequired {
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
  TokenId: asString,
  Sign(x: Sign) {
    return x.toString() === '1';
  },
  VerificationKey: identity,
  Signature: identity,
  SnappProof: identity,
  Memo: identity,
  // builtin
  number: identity,
  string: identity,
  boolean: identity,
  null: identity,
  undefined(_: undefined) {
    return null;
  },
  bigint: asString,
};

function toJson<K extends keyof TypeMap>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToJson))
    throw Error(`toJson: unsupported type "${typeName}"`);
  return ToJson[typeName](value);
}
