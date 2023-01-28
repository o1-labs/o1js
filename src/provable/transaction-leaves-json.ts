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

type Field = string;
type Bool = boolean;
type UInt64 = string;
type UInt32 = string;
type PublicKey = string;
type Sign = 'Positive' | 'Negative';
type AuthRequired = 'Signature' | 'Proof' | 'Either' | 'None' | 'Impossible';
type AuthorizationKind = 'Signature' | 'Proof' | 'None_given';
type TokenId = Field;
