// @generated this file is auto-generated - don't edit it directly

import {
  PublicKey,
  UInt64,
  UInt32,
  AuthorizationKind,
  TokenId,
  Field,
  Bool,
  AuthRequired,
  TokenSymbol,
  Sign,
  StringWithHash,
  Events,
  SequenceEvents,
  SequenceState,
} from '../transaction-leaves-bigint.js';
import { GenericProvableExtended } from '../../provable/generic.js';
import {
  ProvableFromLayout,
  GenericLayout,
} from '../../provable/from-layout.js';
import * as Json from './transaction-json.js';
import { jsLayout } from './js-layout.js';

export { customTypes, ZkappCommand, AccountUpdate };
export { Json };
export * from '../transaction-leaves-bigint.js';
export { provableFromLayout, toJSONEssential, Layout };

type TypeMap = {
  PublicKey: PublicKey;
  UInt64: UInt64;
  UInt32: UInt32;
  AuthorizationKind: AuthorizationKind;
  TokenId: TokenId;
  Field: Field;
  Bool: Bool;
  AuthRequired: AuthRequired;
  Sign: Sign;
};

const TypeMap: {
  [K in keyof TypeMap]: ProvableExtended<TypeMap[K], Json.TypeMap[K]>;
} = {
  PublicKey,
  UInt64,
  UInt32,
  AuthorizationKind,
  TokenId,
  Field,
  Bool,
  AuthRequired,
  Sign,
};

type ProvableExtended<T, TJson> = GenericProvableExtended<T, TJson, Field>;
type Layout = GenericLayout<TypeMap>;

type CustomTypes = {
  StringWithHash: ProvableExtended<
    {
      data: string;
      hash: Field;
    },
    string
  >;
  TokenSymbol: ProvableExtended<TokenSymbol, string>;
  Events: ProvableExtended<
    {
      data: Field[][];
      hash: Field;
    },
    Json.TypeMap['Field'][][]
  >;
  SequenceEvents: ProvableExtended<
    {
      data: Field[][];
      hash: Field;
    },
    Json.TypeMap['Field'][][]
  >;
  SequenceState: ProvableExtended<Field, Json.TypeMap['Field']>;
};
let customTypes: CustomTypes = {
  StringWithHash,
  TokenSymbol,
  Events,
  SequenceEvents,
  SequenceState,
};
let { provableFromLayout, toJSONEssential } = ProvableFromLayout<
  TypeMap,
  Json.TypeMap
>(TypeMap, customTypes);

type ZkappCommand = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      fee: UInt64;
      validUntil?: UInt32;
      nonce: UInt32;
      authorizationKind: AuthorizationKind;
    };
    authorization: {
      proof?: string;
      signature?: string;
    };
  };
  accountUpdates: {
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
            isSome: Bool;
            value: {
              lower: UInt64;
              upper: UInt64;
            };
          };
          blockchainLength: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
          minWindowDensity: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
          totalCurrency: {
            isSome: Bool;
            value: {
              lower: UInt64;
              upper: UInt64;
            };
          };
          globalSlotSinceHardFork: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
          globalSlotSinceGenesis: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
          stakingEpochData: {
            ledger: {
              hash: { isSome: Bool; value: Field };
              totalCurrency: {
                isSome: Bool;
                value: {
                  lower: UInt64;
                  upper: UInt64;
                };
              };
            };
            seed: { isSome: Bool; value: Field };
            startCheckpoint: { isSome: Bool; value: Field };
            lockCheckpoint: { isSome: Bool; value: Field };
            epochLength: {
              isSome: Bool;
              value: {
                lower: UInt32;
                upper: UInt32;
              };
            };
          };
          nextEpochData: {
            ledger: {
              hash: { isSome: Bool; value: Field };
              totalCurrency: {
                isSome: Bool;
                value: {
                  lower: UInt64;
                  upper: UInt64;
                };
              };
            };
            seed: { isSome: Bool; value: Field };
            startCheckpoint: { isSome: Bool; value: Field };
            lockCheckpoint: { isSome: Bool; value: Field };
            epochLength: {
              isSome: Bool;
              value: {
                lower: UInt32;
                upper: UInt32;
              };
            };
          };
        };
        account: {
          balance: {
            isSome: Bool;
            value: {
              lower: UInt64;
              upper: UInt64;
            };
          };
          nonce: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
          receiptChainHash: { isSome: Bool; value: Field };
          delegate: { isSome: Bool; value: PublicKey };
          state: { isSome: Bool; value: Field }[];
          sequenceState: { isSome: Bool; value: Field };
          provedState: { isSome: Bool; value: Bool };
          isNew: { isSome: Bool; value: Bool };
        };
      };
      useFullCommitment: Bool;
      caller: TokenId;
      authorizationKind: AuthorizationKind;
    };
    authorization: {
      proof?: string;
      signature?: string;
    };
  }[];
  memo: string;
};

let ZkappCommand = provableFromLayout<ZkappCommand, Json.ZkappCommand>(
  jsLayout.ZkappCommand as any
);

type AccountUpdate = {
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
          isSome: Bool;
          value: {
            lower: UInt64;
            upper: UInt64;
          };
        };
        blockchainLength: {
          isSome: Bool;
          value: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        minWindowDensity: {
          isSome: Bool;
          value: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        totalCurrency: {
          isSome: Bool;
          value: {
            lower: UInt64;
            upper: UInt64;
          };
        };
        globalSlotSinceHardFork: {
          isSome: Bool;
          value: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        globalSlotSinceGenesis: {
          isSome: Bool;
          value: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        stakingEpochData: {
          ledger: {
            hash: { isSome: Bool; value: Field };
            totalCurrency: {
              isSome: Bool;
              value: {
                lower: UInt64;
                upper: UInt64;
              };
            };
          };
          seed: { isSome: Bool; value: Field };
          startCheckpoint: { isSome: Bool; value: Field };
          lockCheckpoint: { isSome: Bool; value: Field };
          epochLength: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
        };
        nextEpochData: {
          ledger: {
            hash: { isSome: Bool; value: Field };
            totalCurrency: {
              isSome: Bool;
              value: {
                lower: UInt64;
                upper: UInt64;
              };
            };
          };
          seed: { isSome: Bool; value: Field };
          startCheckpoint: { isSome: Bool; value: Field };
          lockCheckpoint: { isSome: Bool; value: Field };
          epochLength: {
            isSome: Bool;
            value: {
              lower: UInt32;
              upper: UInt32;
            };
          };
        };
      };
      account: {
        balance: {
          isSome: Bool;
          value: {
            lower: UInt64;
            upper: UInt64;
          };
        };
        nonce: {
          isSome: Bool;
          value: {
            lower: UInt32;
            upper: UInt32;
          };
        };
        receiptChainHash: { isSome: Bool; value: Field };
        delegate: { isSome: Bool; value: PublicKey };
        state: { isSome: Bool; value: Field }[];
        sequenceState: { isSome: Bool; value: Field };
        provedState: { isSome: Bool; value: Bool };
        isNew: { isSome: Bool; value: Bool };
      };
    };
    useFullCommitment: Bool;
    caller: TokenId;
    authorizationKind: AuthorizationKind;
  };
  authorization: {
    proof?: string;
    signature?: string;
  };
};

let AccountUpdate = provableFromLayout<AccountUpdate, Json.AccountUpdate>(
  jsLayout.AccountUpdate as any
);
