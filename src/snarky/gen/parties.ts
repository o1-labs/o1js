// @generated this file is auto-generated - don't edit it directly

import {
  PublicKey,
  UInt64,
  UInt32,
  TokenId,
  Field,
  Bool,
  AuthRequired,
  Sign,
  convertStringWithHashToJson,
  convertEventsToJson,
  convertStringWithHashToFields,
  convertEventsToFields,
} from '../parties-leaves';
import { toJson, toFields } from '../parties-helpers';
import * as Json from './parties-json';
import { jsLayout } from './js-layout';

export { Parties, Party };
export { Json };
export * from '../parties-leaves';

type JsonConverters = {
  StringWithHash: (stringwithhash: {
    data: string;
    hash: Field;
  }) => Json.TypeMap['string'];
  Events: (events: {
    data: Field[][];
    hash: Field;
  }) => Json.TypeMap['Field'][][];
};
let jsonConverters: JsonConverters = {
  StringWithHash: convertStringWithHashToJson,
  Events: convertEventsToJson,
};

type FieldsConverters = {
  StringWithHash: (stringwithhash: { data: string; hash: Field }) => Field[];
  Events: (events: { data: Field[][]; hash: Field }) => Field[];
};
let fieldsConverters: FieldsConverters = {
  StringWithHash: convertStringWithHashToFields,
  Events: convertEventsToFields,
};

type Parties = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      fee: UInt64;
      validUntil?: UInt32;
      nonce: UInt32;
    };
    authorization: string;
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
            data: string;
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
        zkappUri: {
          isSome: Bool;
          value: {
            data: string;
            hash: Field;
          };
        };
        tokenSymbol: {
          isSome: Bool;
          value: {
            data: string;
            hash: Field;
          };
        };
        timing: {
          isSome: Bool;
          value: {
            initialMinimumBalance: UInt64;
            cliffTime: UInt32;
            cliffAmount: UInt64;
            vestingPeriod: UInt32;
            vestingIncrement: UInt64;
          };
        };
        votingFor: { isSome: Bool; value: Field };
      };
      balanceChange: {
        magnitude: UInt64;
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
      preconditions: {
        network: {
          snarkedLedgerHash: { isSome: Bool; value: Field };
          timestamp: {
            lower: UInt64;
            upper: UInt64;
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
            lower: UInt64;
            upper: UInt64;
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
                lower: UInt64;
                upper: UInt64;
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
                lower: UInt64;
                upper: UInt64;
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
        account: {
          balance: {
            lower: UInt64;
            upper: UInt64;
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
      };
      useFullCommitment: Bool;
      caller: TokenId;
    };
    authorization: {
      proof?: string;
      signature?: string;
    };
  }[];
  memo: string;
};

let Parties = {
  toJson(parties: Parties): Json.Parties {
    return toJson(jsLayout.Parties as any, parties, jsonConverters);
  },
  toFields(parties: Parties): Field[] {
    return toFields(jsLayout.Parties as any, parties, fieldsConverters);
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
          data: string;
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
      zkappUri: {
        isSome: Bool;
        value: {
          data: string;
          hash: Field;
        };
      };
      tokenSymbol: {
        isSome: Bool;
        value: {
          data: string;
          hash: Field;
        };
      };
      timing: {
        isSome: Bool;
        value: {
          initialMinimumBalance: UInt64;
          cliffTime: UInt32;
          cliffAmount: UInt64;
          vestingPeriod: UInt32;
          vestingIncrement: UInt64;
        };
      };
      votingFor: { isSome: Bool; value: Field };
    };
    balanceChange: {
      magnitude: UInt64;
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
    preconditions: {
      network: {
        snarkedLedgerHash: { isSome: Bool; value: Field };
        timestamp: {
          lower: UInt64;
          upper: UInt64;
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
          lower: UInt64;
          upper: UInt64;
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
              lower: UInt64;
              upper: UInt64;
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
              lower: UInt64;
              upper: UInt64;
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
      account: {
        balance: {
          lower: UInt64;
          upper: UInt64;
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
    };
    useFullCommitment: Bool;
    caller: TokenId;
  };
  authorization: {
    proof?: string;
    signature?: string;
  };
};

let Party = {
  toJson(party: Party): Json.Party {
    return toJson(jsLayout.Party as any, party, jsonConverters);
  },
  toFields(party: Party): Field[] {
    return toFields(jsLayout.Party as any, party, fieldsConverters);
  },
};
