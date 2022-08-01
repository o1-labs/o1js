// @generated this file is auto-generated - don't edit it directly

import {
  PublicKey,
  UInt64,
  UInt32,
  TokenId,
  Field,
  Bool,
  AuthRequired,
  TokenSymbol,
  Sign,
  StringWithHash,
  Events,
} from '../parties-leaves';
import { asFieldsAndAux, AsFieldsAndAux } from '../parties-helpers';
import * as Json from './parties-json';
import { jsLayout } from './js-layout';

export { customTypes, Parties, Party };
export { Json };
export * from '../parties-leaves';

type CustomTypes = {
  StringWithHash: AsFieldsAndAux<
    {
      data: string;
      hash: Field;
    },
    Json.TypeMap['string']
  >;
  TokenSymbol: AsFieldsAndAux<TokenSymbol, Json.TypeMap['string']>;
  Events: AsFieldsAndAux<
    {
      data: Field[][];
      hash: Field;
    },
    Json.TypeMap['Field'][][]
  >;
};
let customTypes: CustomTypes = { StringWithHash, TokenSymbol, Events };

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
        tokenSymbol: { isSome: Bool; value: TokenSymbol };
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
          isNew: { isSome: Bool; value: Bool };
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

let Parties = asFieldsAndAux<Parties, Json.Parties>(
  jsLayout.Parties as any,
  customTypes
);

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
      tokenSymbol: { isSome: Bool; value: TokenSymbol };
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
        isNew: { isSome: Bool; value: Bool };
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

let Party = asFieldsAndAux<Party, Json.Party>(
  jsLayout.Party as any,
  customTypes
);
