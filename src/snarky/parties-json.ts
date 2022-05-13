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
} from './parties-leaves-json';

export { Parties };

type Parties = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      update: {
        appState: (Field | null)[];
        delegate: PublicKey | null;
        verificationKey: {
          data: VerificationKey;
          hash: Field;
        } | null;
        permissions: {
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
        } | null;
        zkappUri: string | null;
        tokenSymbol: string | null;
        timing: {
          initialMinimumBalance: Balance;
          cliffTime: GlobalSlot;
          cliffAmount: CurrencyAmount;
          vestingPeriod: GlobalSlot;
          vestingIncrement: CurrencyAmount;
        } | null;
        votingFor: StateHash | null;
      };
      fee: Fee;
      events: Field[][];
      sequenceEvents: Field[][];
      protocolStatePrecondition: {
        snarkedLedgerHash: Field | null;
        timestamp: {
          lower: BlockTime;
          upper: BlockTime;
        } | null;
        blockchainLength: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        minWindowDensity: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        totalCurrency: {
          lower: CurrencyAmount;
          upper: CurrencyAmount;
        } | null;
        globalSlotSinceHardFork: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        globalSlotSinceGenesis: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        stakingEpochData: {
          ledger: {
            hash: Field | null;
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            } | null;
          };
          seed: Field | null;
          startCheckpoint: Field | null;
          lockCheckpoint: Field | null;
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          } | null;
        };
        nextEpochData: {
          ledger: {
            hash: Field | null;
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            } | null;
          };
          seed: Field | null;
          startCheckpoint: Field | null;
          lockCheckpoint: Field | null;
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          } | null;
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
        appState: (Field | null)[];
        delegate: PublicKey | null;
        verificationKey: {
          data: VerificationKey;
          hash: Field;
        } | null;
        permissions: {
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
        } | null;
        zkappUri: string | null;
        tokenSymbol: string | null;
        timing: {
          initialMinimumBalance: Balance;
          cliffTime: GlobalSlot;
          cliffAmount: CurrencyAmount;
          vestingPeriod: GlobalSlot;
          vestingIncrement: CurrencyAmount;
        } | null;
        votingFor: StateHash | null;
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
        snarkedLedgerHash: Field | null;
        timestamp: {
          lower: BlockTime;
          upper: BlockTime;
        } | null;
        blockchainLength: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        minWindowDensity: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        totalCurrency: {
          lower: CurrencyAmount;
          upper: CurrencyAmount;
        } | null;
        globalSlotSinceHardFork: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        globalSlotSinceGenesis: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        stakingEpochData: {
          ledger: {
            hash: Field | null;
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            } | null;
          };
          seed: Field | null;
          startCheckpoint: Field | null;
          lockCheckpoint: Field | null;
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          } | null;
        };
        nextEpochData: {
          ledger: {
            hash: Field | null;
            totalCurrency: {
              lower: CurrencyAmount;
              upper: CurrencyAmount;
            } | null;
          };
          seed: Field | null;
          startCheckpoint: Field | null;
          lockCheckpoint: Field | null;
          epochLength: {
            lower: UInt32;
            upper: UInt32;
          } | null;
        };
      };
      accountPrecondition: {
        balance: {
          lower: Balance;
          upper: Balance;
        } | null;
        nonce: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        receiptChainHash: Field | null;
        delegate: PublicKey | null;
        state: (Field | null)[];
        sequenceState: Field | null;
        provedState: boolean | null;
      };
      useFullCommitment: boolean;
      caller: TokenId;
    };
    authorization: {
      proof: SnappProof | null;
      signature: Signature | null;
    };
  }[];
  memo: Memo;
};
