import { BalanceChange } from './parties-json';

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

export { TypeMap };

type Field = string;
type UInt64 = string;
type UInt32 = string;

type Memo = string;
type VerificationKey = string;
type SnappProof = string;
type Signature = string;
type PublicKey = string;

type Sign = 'Positive' | 'Negative';
type AuthRequired = 'Signature' | 'Proof' | 'Either' | 'None' | 'Impossible';

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
  BalanceChange: BalanceChange;
  // builtin
  number: number;
  string: string;
  boolean: boolean;
  null: null;
  undefined: null;
  bigint: string;
};
