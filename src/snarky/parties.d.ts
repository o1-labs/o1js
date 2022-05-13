// this file is auto-generated - don't edit it directly

import {
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
} from './parties-leaves';

export { Parties };

type Parties = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      update: {
        appState: (Field | undefined)[];
        delegate?: PublicKey;
        verificationKey?: {
          data: VerificationKey;
          hash: Field;
        };
        permissions?: {
          editState: AuthRequired;
          send: AuthRequired;
          receive: AuthRequired;
          setDelegate: AuthRequired;
          setPermissions: AuthRequired;
          setVerificationKey: AuthRequired;
          setZkappUri: AuthRequired;
          editSequenceState: AuthRequired;
          setTokenSymbol: AuthRequired;
          incrementNonce: AuthRequired;
          setVotingFor: AuthRequired;
        };
        zkappUri?: string;
        tokenSymbol?: string;
        timing?: {
          initialMinimumBalance: Balance;
          cliffTime: GlobalSlot;
          cliffAmount: CurrencyAmount;
          vestingPeriod: GlobalSlot;
          vestingIncrement: CurrencyAmount;
        };
        votingFor?: StateHash;
      };
      fee: Fee;
      events: Field[][];
      sequenceEvents: Field[][];
      protocolStatePrecondition: {
        snarkedLedgerHash?: Field;
        timestamp?: {
          lower: BlockTime;
          upper: BlockTime;
        };
        blockchainLength?: {
          lower: UInt32;
          upper: UInt32;
        };
        minWindowDensity?: {
          lower: UInt32;
          upper: UInt32;
        };
        totalCurrency?: {
          lower: CurrencyAmount;
          upper: CurrencyAmount;
        };
        globalSlotSinceHardFork?: {
          lower: UInt32;
          upper: UInt32;
        };
        globalSlotSinceGenesis?: {
          lower: UInt32;
          upper: UInt32;
        };
        stakingEpochData: {
          ledger: {
            hash?: Field;
            totalCurrency?: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed?: Field;
          startCheckpoint?: Field;
          lockCheckpoint?: Field;
          epochLength?: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        nextEpochData: {
          ledger: {
            hash?: Field;
            totalCurrency?: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed?: Field;
          startCheckpoint?: Field;
          lockCheckpoint?: Field;
          epochLength?: {
            lower: UInt32;
            upper: UInt32;
          };
        };
      };
      nonce: UInt32;
    };
    authorization: Signature;
  };
  otherParties: {
    body: {
      publicKey: PublicKey;
      tokenId: TokenId;
      update: {
        appState: (Field | undefined)[];
        delegate?: PublicKey;
        verificationKey?: {
          data: VerificationKey;
          hash: Field;
        };
        permissions?: {
          editState: AuthRequired;
          send: AuthRequired;
          receive: AuthRequired;
          setDelegate: AuthRequired;
          setPermissions: AuthRequired;
          setVerificationKey: AuthRequired;
          setZkappUri: AuthRequired;
          editSequenceState: AuthRequired;
          setTokenSymbol: AuthRequired;
          incrementNonce: AuthRequired;
          setVotingFor: AuthRequired;
        };
        zkappUri?: string;
        tokenSymbol?: string;
        timing?: {
          initialMinimumBalance: Balance;
          cliffTime: GlobalSlot;
          cliffAmount: CurrencyAmount;
          vestingPeriod: GlobalSlot;
          vestingIncrement: CurrencyAmount;
        };
        votingFor?: StateHash;
      };
      balanceChange: {
        magnitude: CurrencyAmount;
        sgn: Sign;
      };
      incrementNonce: boolean;
      events: Field[][];
      sequenceEvents: Field[][];
      callData: Field;
      callDepth: number;
      protocolStatePrecondition: {
        snarkedLedgerHash?: Field;
        timestamp?: {
          lower: BlockTime;
          upper: BlockTime;
        };
        blockchainLength?: {
          lower: UInt32;
          upper: UInt32;
        };
        minWindowDensity?: {
          lower: UInt32;
          upper: UInt32;
        };
        totalCurrency?: {
          lower: CurrencyAmount;
          upper: CurrencyAmount;
        };
        globalSlotSinceHardFork?: {
          lower: UInt32;
          upper: UInt32;
        };
        globalSlotSinceGenesis?: {
          lower: UInt32;
          upper: UInt32;
        };
        stakingEpochData: {
          ledger: {
            hash?: Field;
            totalCurrency?: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed?: Field;
          startCheckpoint?: Field;
          lockCheckpoint?: Field;
          epochLength?: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        nextEpochData: {
          ledger: {
            hash?: Field;
            totalCurrency?: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed?: Field;
          startCheckpoint?: Field;
          lockCheckpoint?: Field;
          epochLength?: {
            lower: UInt32;
            upper: UInt32;
          };
        };
      };
      accountPrecondition: {
        balance?: {
          lower: Balance;
          upper: Balance;
        };
        nonce?: {
          lower: UInt32;
          upper: UInt32;
        };
        receiptChainHash?: Field;
        delegate?: PublicKey;
        state: (Field | undefined)[];
        sequenceState?: Field;
        provedState?: boolean;
      };
      useFullCommitment: boolean;
      caller: TokenId;
    };
    authorization: {
      proof?: SnappProof;
      signature?: Signature;
    };
  }[];
  memo: Memo;
};
