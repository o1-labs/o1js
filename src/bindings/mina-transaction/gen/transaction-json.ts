// @generated this file is auto-generated - don't edit it directly

import {
  PublicKey,
  UInt64,
  UInt32,
  TokenId,
  Field,
  AuthRequired,
  BalanceChange,
  Sign,
  Bool,
} from '../transaction-leaves-json.js';

export { ZkappCommand, AccountUpdate, Account };
export * from '../transaction-leaves-json.js';
export { TypeMap };

type TypeMap = {
  PublicKey: PublicKey;
  UInt64: UInt64;
  UInt32: UInt32;
  TokenId: TokenId;
  Field: Field;
  AuthRequired: AuthRequired;
  BalanceChange: BalanceChange;
  Sign: Sign;
  Bool: Bool;
};

type ZkappCommand = {
  feePayer: {
    body: {
      publicKey: PublicKey;
      fee: UInt64;
      validUntil: UInt32 | null;
      nonce: UInt32;
    };
    authorization: string;
  };
  accountUpdates: {
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
          access: AuthRequired;
          send: AuthRequired;
          receive: AuthRequired;
          setDelegate: AuthRequired;
          setPermissions: AuthRequired;
          setVerificationKey: {
            auth: AuthRequired;
            txnVersion: UInt32;
          };
          setZkappUri: AuthRequired;
          editActionState: AuthRequired;
          setTokenSymbol: AuthRequired;
          incrementNonce: AuthRequired;
          setVotingFor: AuthRequired;
          setTiming: AuthRequired;
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
      actions: Field[][];
      callData: Field;
      callDepth: number;
      preconditions: {
        network: {
          snarkedLedgerHash: Field | null;
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
        account: {
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
          actionState: Field | null;
          provedState: Bool | null;
          isNew: Bool | null;
        };
        validWhile: {
          lower: UInt32;
          upper: UInt32;
        } | null;
      };
      useFullCommitment: Bool;
      implicitAccountCreationFee: Bool;
      mayUseToken: {
        parentsOwnToken: Bool;
        inheritFromParent: Bool;
      };
      authorizationKind: {
        isSigned: Bool;
        isProved: Bool;
        verificationKeyHash: Field;
      };
    };
    authorization: {
      proof: string | null;
      signature: string | null;
    };
  }[];
  memo: string;
};

type AccountUpdate = {
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
        access: AuthRequired;
        send: AuthRequired;
        receive: AuthRequired;
        setDelegate: AuthRequired;
        setPermissions: AuthRequired;
        setVerificationKey: {
          auth: AuthRequired;
          txnVersion: UInt32;
        };
        setZkappUri: AuthRequired;
        editActionState: AuthRequired;
        setTokenSymbol: AuthRequired;
        incrementNonce: AuthRequired;
        setVotingFor: AuthRequired;
        setTiming: AuthRequired;
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
    actions: Field[][];
    callData: Field;
    callDepth: number;
    preconditions: {
      network: {
        snarkedLedgerHash: Field | null;
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
      account: {
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
        actionState: Field | null;
        provedState: Bool | null;
        isNew: Bool | null;
      };
      validWhile: {
        lower: UInt32;
        upper: UInt32;
      } | null;
    };
    useFullCommitment: Bool;
    implicitAccountCreationFee: Bool;
    mayUseToken: {
      parentsOwnToken: Bool;
      inheritFromParent: Bool;
    };
    authorizationKind: {
      isSigned: Bool;
      isProved: Bool;
      verificationKeyHash: Field;
    };
  };
  authorization: {
    proof: string | null;
    signature: string | null;
  };
};

type Account = {
  publicKey: PublicKey;
  tokenId: TokenId;
  tokenSymbol: string;
  balance: UInt64;
  nonce: UInt32;
  receiptChainHash: Field;
  delegate: PublicKey | null;
  votingFor: Field;
  timing: {
    isTimed: Bool;
    initialMinimumBalance: UInt64;
    cliffTime: UInt32;
    cliffAmount: UInt64;
    vestingPeriod: UInt32;
    vestingIncrement: UInt64;
  };
  permissions: {
    editState: AuthRequired;
    access: AuthRequired;
    send: AuthRequired;
    receive: AuthRequired;
    setDelegate: AuthRequired;
    setPermissions: AuthRequired;
    setVerificationKey: {
      auth: AuthRequired;
      txnVersion: UInt32;
    };
    setZkappUri: AuthRequired;
    editActionState: AuthRequired;
    setTokenSymbol: AuthRequired;
    incrementNonce: AuthRequired;
    setVotingFor: AuthRequired;
    setTiming: AuthRequired;
  };
  zkapp: {
    appState: Field[];
    verificationKey: {
      data: string;
      hash: Field;
    } | null;
    zkappVersion: UInt32;
    actionState: Field[];
    lastActionSlot: UInt32;
    provedState: Bool;
    zkappUri: string;
  } | null;
};
