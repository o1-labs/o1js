import { ZkappCommand as ZkappCommandJson } from '../../provable/gen/transaction-json.js';

export type UInt32 = number | bigint | string;
export type UInt64 = number | bigint | string;

export type PublicKey = string;
export type PrivateKey = string;
export type Signature = string;
export type Network = 'mainnet' | 'testnet';

export type Keypair = {
  readonly privateKey: PrivateKey;
  readonly publicKey: PublicKey;
};

export type Common = {
  readonly to: PublicKey;
  readonly from: PublicKey;
  readonly fee: UInt64;
  readonly nonce: UInt32;
  readonly memo?: string;
  readonly validUntil?: UInt32;
};
export type StrictCommon = {
  readonly to: string;
  readonly from: string;
  readonly fee: string;
  readonly nonce: string;
  readonly memo: string;
  readonly validUntil: string;
};

export type StakeDelegation = Common;
export type Payment = Common & { readonly amount: UInt64 };

type FeePayer = {
  readonly feePayer: PublicKey;
  readonly fee: UInt64;
  readonly nonce: UInt32;
  readonly memo?: string;
  readonly validUntil?: UInt32 | null;
};
export type StrictFeePayer = {
  readonly feePayer: PublicKey;
  readonly fee: string;
  readonly nonce: string;
  readonly memo: string;
  readonly validUntil: string | null;
};

export type ZkappCommand = {
  readonly zkappCommand: ZkappCommandJson;
  readonly feePayer: FeePayer;
};

export type SignableData = string | StakeDelegation | Payment | ZkappCommand;

export type Signed<T> = { signature: Signature; publicKey: PublicKey; data: T };
