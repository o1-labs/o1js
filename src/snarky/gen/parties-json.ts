// @generated this file is auto-generated - don't edit it directly

import {
  PublicKey,
  Field,
  Bool,
  AuthRequired,
  UInt64,
  UInt32,
  TokenId,
  Sign,
} from '../parties-leaves-json';

export { Parties, Party };
export * from '../parties-leaves-json';

type Parties = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      update: {
        appState: (Field | null)[];
        delegate: PublicKey | null;
        verificationKey: {
          data: string;
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
          initialMinimumBalance: UInt64;
          cliffTime: UInt32;
          cliffAmount: UInt64;
          vestingPeriod: UInt32;
          vestingIncrement: UInt64;
        } | null;
        votingFor: Field | null;
      };
      fee: UInt64;
      events: Field[][];
      sequenceEvents: Field[][];
      protocolStatePrecondition: {
        snarkedLedgerHash: Field | null;
        timestamp: {
          lower: UInt64;
          upper: UInt64;
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
          lower: UInt64;
          upper: UInt64;
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
              lower: UInt64;
              upper: UInt64;
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
              lower: UInt64;
              upper: UInt64;
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
    authorization: string;
  };
  otherParties: {
    body: {
      publicKey: PublicKey;
      tokenId: TokenId;
      update: {
        appState: (Field | null)[];
        delegate: PublicKey | null;
        verificationKey: {
          data: string;
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
          initialMinimumBalance: UInt64;
          cliffTime: UInt32;
          cliffAmount: UInt64;
          vestingPeriod: UInt32;
          vestingIncrement: UInt64;
        } | null;
        votingFor: Field | null;
      };
      balanceChange: {
        magnitude: UInt64;
        sgn: Sign;
      };
      incrementNonce: Bool;
      events: Field[][];
      sequenceEvents: Field[][];
      callData: Field;
      callDepth: number;
      protocolStatePrecondition: {
        snarkedLedgerHash: Field | null;
        timestamp: {
          lower: UInt64;
          upper: UInt64;
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
          lower: UInt64;
          upper: UInt64;
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
              lower: UInt64;
              upper: UInt64;
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
              lower: UInt64;
              upper: UInt64;
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
          lower: UInt64;
          upper: UInt64;
        } | null;
        nonce: {
          lower: UInt32;
          upper: UInt32;
        } | null;
        receiptChainHash: Field | null;
        delegate: PublicKey | null;
        state: (Field | null)[];
        sequenceState: Field | null;
        provedState: Bool | null;
      };
      useFullCommitment: Bool;
      caller: TokenId;
    };
    authorization: {
      proof: string | null;
      signature: string | null;
    };
  }[];
  memo: string;
};

type Party = {
  body: {
    publicKey: PublicKey;
    tokenId: TokenId;
    update: {
      appState: (Field | null)[];
      delegate: PublicKey | null;
      verificationKey: {
        data: string;
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
        initialMinimumBalance: UInt64;
        cliffTime: UInt32;
        cliffAmount: UInt64;
        vestingPeriod: UInt32;
        vestingIncrement: UInt64;
      } | null;
      votingFor: Field | null;
    };
    balanceChange: {
      magnitude: UInt64;
      sgn: Sign;
    };
    incrementNonce: Bool;
    events: Field[][];
    sequenceEvents: Field[][];
    callData: Field;
    callDepth: number;
    protocolStatePrecondition: {
      snarkedLedgerHash: Field | null;
      timestamp: {
        lower: UInt64;
        upper: UInt64;
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
        lower: UInt64;
        upper: UInt64;
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
            lower: UInt64;
            upper: UInt64;
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
            lower: UInt64;
            upper: UInt64;
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
        lower: UInt64;
        upper: UInt64;
      } | null;
      nonce: {
        lower: UInt32;
        upper: UInt32;
      } | null;
      receiptChainHash: Field | null;
      delegate: PublicKey | null;
      state: (Field | null)[];
      sequenceState: Field | null;
      provedState: Bool | null;
    };
    useFullCommitment: Bool;
    caller: TokenId;
  };
  authorization: {
    proof: string | null;
    signature: string | null;
  };
};
