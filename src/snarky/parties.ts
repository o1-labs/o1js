// this file is auto-generated - don't edit it directly

import {
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
} from './parties-leaves';
import { toJson } from './parties-helpers';
import * as Json from './parties-json';
import { jsLayout } from './js-layout';

export { Parties, BalanceChange };
export { Json };
export * from './parties-leaves';

type Parties = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      update: {
        appState: { isSome: Bool; value: Field }[];
        delegate: { isSome: Bool; value: PublicKey };
        verificationKey: {
          isSome: Bool;
          value: {
            data: VerificationKey;
            hash: Field;
          };
        };
        permissions: {
          isSome: Bool;
          value: {
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
        };
        zkappUri: { isSome: Bool; value: string };
        tokenSymbol: { isSome: Bool; value: string };
        timing: {
          isSome: Bool;
          value: {
            initialMinimumBalance: Balance;
            cliffTime: GlobalSlot;
            cliffAmount: CurrencyAmount;
            vestingPeriod: GlobalSlot;
            vestingIncrement: CurrencyAmount;
          };
        };
        votingFor: { isSome: Bool; value: StateHash };
      };
      fee: Fee;
      events: Field[][];
      sequenceEvents: Field[][];
      protocolStatePrecondition: {
        snarkedLedgerHash: { isSome: Bool; value: Field };
        timestamp: {
          lower: BlockTime;
          upper: BlockTime;
        };
        blockchainLength: {
          lower: UInt32;
          upper: UInt32;
        };
        minWindowDensity: {
          lower: UInt32;
          upper: UInt32;
        };
        totalCurrency: {
          lower: CurrencyAmount;
          upper: CurrencyAmount;
        };
        globalSlotSinceHardFork: {
          lower: UInt32;
          upper: UInt32;
        };
        globalSlotSinceGenesis: {
          lower: UInt32;
          upper: UInt32;
        };
        stakingEpochData: {
          ledger: {
            hash: { isSome: Bool; value: Field };
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed: { isSome: Bool; value: Field };
          startCheckpoint: { isSome: Bool; value: Field };
          lockCheckpoint: { isSome: Bool; value: Field };
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        nextEpochData: {
          ledger: {
            hash: { isSome: Bool; value: Field };
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed: { isSome: Bool; value: Field };
          startCheckpoint: { isSome: Bool; value: Field };
          lockCheckpoint: { isSome: Bool; value: Field };
          epochLength: {
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
        appState: { isSome: Bool; value: Field }[];
        delegate: { isSome: Bool; value: PublicKey };
        verificationKey: {
          isSome: Bool;
          value: {
            data: VerificationKey;
            hash: Field;
          };
        };
        permissions: {
          isSome: Bool;
          value: {
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
        };
        zkappUri: { isSome: Bool; value: string };
        tokenSymbol: { isSome: Bool; value: string };
        timing: {
          isSome: Bool;
          value: {
            initialMinimumBalance: Balance;
            cliffTime: GlobalSlot;
            cliffAmount: CurrencyAmount;
            vestingPeriod: GlobalSlot;
            vestingIncrement: CurrencyAmount;
          };
        };
        votingFor: { isSome: Bool; value: StateHash };
      };
      balanceChange: {
        magnitude: CurrencyAmount;
        sgn: Sign;
      };
      incrementNonce: Bool;
      events: Field[][];
      sequenceEvents: Field[][];
      callData: Field;
      callDepth: number;
      protocolStatePrecondition: {
        snarkedLedgerHash: { isSome: Bool; value: Field };
        timestamp: {
          lower: BlockTime;
          upper: BlockTime;
        };
        blockchainLength: {
          lower: UInt32;
          upper: UInt32;
        };
        minWindowDensity: {
          lower: UInt32;
          upper: UInt32;
        };
        totalCurrency: {
          lower: CurrencyAmount;
          upper: CurrencyAmount;
        };
        globalSlotSinceHardFork: {
          lower: UInt32;
          upper: UInt32;
        };
        globalSlotSinceGenesis: {
          lower: UInt32;
          upper: UInt32;
        };
        stakingEpochData: {
          ledger: {
            hash: { isSome: Bool; value: Field };
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed: { isSome: Bool; value: Field };
          startCheckpoint: { isSome: Bool; value: Field };
          lockCheckpoint: { isSome: Bool; value: Field };
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        nextEpochData: {
          ledger: {
            hash: { isSome: Bool; value: Field };
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            };
          };
          seed: { isSome: Bool; value: Field };
          startCheckpoint: { isSome: Bool; value: Field };
          lockCheckpoint: { isSome: Bool; value: Field };
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          };
        };
      };
      accountPrecondition: {
        balance: {
          lower: Balance;
          upper: Balance;
        };
        nonce: {
          lower: UInt32;
          upper: UInt32;
        };
        receiptChainHash: { isSome: Bool; value: Field };
        delegate: { isSome: Bool; value: PublicKey };
        state: { isSome: Bool; value: Field }[];
        sequenceState: { isSome: Bool; value: Field };
        provedState: { isSome: Bool; value: Bool };
      };
      useFullCommitment: Bool;
      caller: TokenId;
    };
    authorization: {
      proof?: SnappProof;
      signature?: Signature;
    };
  }[];
  memo: Memo;
};

let Parties = {
  toJson(parties: Parties): Json.Parties {
    return toJson(jsLayout.Parties, parties);
  },
};

type BalanceChange = {
  magnitude: CurrencyAmount;
  sgn: Sign;
};

let BalanceChange = {
  toJson(balancechange: BalanceChange): Json.BalanceChange {
    return toJson(jsLayout.BalanceChange, balancechange);
  },
};
