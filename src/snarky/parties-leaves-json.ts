export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export { TypeMap };

type Field = string;
type Bool = boolean;
type UInt64 = string;
type UInt32 = string;
type PublicKey = string;
type Sign = 'Positive' | 'Negative';
type AuthRequired = 'Signature' | 'Proof' | 'Either' | 'None' | 'Impossible';
type TokenId = Field;

// to what types in the js layout are mapped
type TypeMap = {
  PublicKey: PublicKey;
  Field: Field;
  Bool: Bool;
  AuthRequired: AuthRequired;
  UInt32: UInt32;
  UInt64: UInt64;
  Sign: Sign;
  TokenId: TokenId;
  // TODO sort this out: we override timestamp, which is implicit but has to be null for intg test to succeed
  BlockTimeInterval: { lower: string; upper: string };
  // builtin
  number: number;
  null: null;
  undefined: null;
  string: string;
};
