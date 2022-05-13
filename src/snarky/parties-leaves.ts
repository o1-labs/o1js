import { Field, Bool, Group } from '../snarky';

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
