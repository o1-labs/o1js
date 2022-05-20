// @generated this file is auto-generated - don't edit it directly

import {
  PublicKey,
  Field,
  Bool,
  VerificationKey,
  AuthRequired,
  StringWithHash,
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
  convertEventsToJson,
  convertEventsToFields,
} from '../parties-leaves';
import { toJson, toFields } from '../parties-helpers';
import * as Json from './parties-json';
import { jsLayout } from './js-layout';

export { Parties, BalanceChange, Party };
export { Json };
export * from '../parties-leaves';

type JsonConverters = {
  Events: (events: {
    data: Field[][];
    hash: Field;
  }) => Json.TypeMap['Field'][][];
};
let jsonConverters: JsonConverters = { Events: convertEventsToJson };

type FieldsConverters = {
  Events: (events: { data: Field[][]; hash: Field }) => Field[];
};
let fieldsConverters: FieldsConverters = { Events: convertEventsToFields };

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
        zkappUri: { isSome: Bool; value: StringWithHash };
        tokenSymbol: { isSome: Bool; value: StringWithHash };
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
      events: {
        data: Field[][];
        hash: Field;
      };
      sequenceEvents: {
        data: Field[][];
        hash: Field;
      };
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
        zkappUri: { isSome: Bool; value: StringWithHash };
        tokenSymbol: { isSome: Bool; value: StringWithHash };
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
      events: {
        data: Field[][];
        hash: Field;
      };
      sequenceEvents: {
        data: Field[][];
        hash: Field;
      };
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
        sequenceState: Field;
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
    return toJson(jsLayout.Parties, parties, jsonConverters);
  },
  toFields(parties: Parties): Field[] {
    return toFields(jsLayout.Parties, parties, fieldsConverters);
  },
};

type BalanceChange = {
  magnitude: CurrencyAmount;
  sgn: Sign;
};

let BalanceChange = {
  toJson(balancechange: BalanceChange): Json.BalanceChange {
    return toJson(jsLayout.BalanceChange, balancechange, jsonConverters);
  },
  toFields(balancechange: BalanceChange): Field[] {
    return toFields(jsLayout.BalanceChange, balancechange, fieldsConverters);
  },
};

type Party = {
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
      zkappUri: { isSome: Bool; value: StringWithHash };
      tokenSymbol: { isSome: Bool; value: StringWithHash };
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
    events: {
      data: Field[][];
      hash: Field;
    };
    sequenceEvents: {
      data: Field[][];
      hash: Field;
    };
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
      sequenceState: Field;
      provedState: { isSome: Bool; value: Bool };
    };
    useFullCommitment: Bool;
    caller: TokenId;
  };
  authorization: {
    proof?: SnappProof;
    signature?: Signature;
  };
};

let Party = {
  toJson(party: Party): Json.Party {
    return toJson(jsLayout.Party, party, jsonConverters);
  },
  toFields(party: Party): Field[] {
    return toFields(jsLayout.Party, party, fieldsConverters);
  },
};
