import type { ZkappCommand as ZkappCommandJson } from '../../bindings/mina-transaction/gen/transaction-json.js';
import type { SignatureJson } from './signature.js';

export type UInt32 = number | bigint | string;
export type UInt64 = number | bigint | string;

export type Field = number | bigint | string;

export type PublicKey = string;
export type PrivateKey = string;
export type Signature = SignatureJson;
export type NetworkId = 'mainnet' | 'testnet' | { custom: string };

export const NetworkId = {
  toString(network: NetworkId) {
    return typeof network === 'string' ? network : network.custom;
  },
};

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

export type SignableData = string | StakeDelegation | Payment;

export type SignedLegacy<T> = {
  signature: SignatureJson;
  publicKey: PublicKey;
  data: T;
};
export type Signed<T> = {
  signature: string; // base58
  publicKey: PublicKey;
  data: T;
};

// distinguish from Signed because signature is in hex format
export type SignedRosetta<T> = Signed<T>;

export type SignedAny = SignedLegacy<SignableData> | Signed<ZkappCommand>;

export type Group = {
  x: Field;
  y: Field;
};

export type Nullifier = {
  publicKey: Group;
  public: {
    nullifier: Group;
    s: Field;
  };
  private: {
    c: Field;
    g_r: Group;
    h_m_pk_r: Group;
  };
};
