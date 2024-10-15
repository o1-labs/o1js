import { AccountUpdate, GenericData } from './account-update.js';
import { AccountId, AccountTiming } from './account.js';
import { AccountUpdateAuthorizationKind } from './authorization.js';
import { testV1V2ClassEquivalence, testV1V2ValueEquivalence, testV2Encoding } from './bindings-test-utils.js';
import { TokenId, Update, MAX_ZKAPP_STATE_FIELDS } from './core.js';
import { Precondition } from './preconditions.js';
import { GenericStatePreconditions, GenericStateUpdates } from './state.js';
import { AccountUpdate as V1AccountUpdateImpl } from '../../mina/account-update.js';
import { VerificationKey } from '../../proof-system/zkprogram.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64, Int64, Sign } from '../../provable/int.js';
import { PublicKey, PrivateKey } from '../../provable/crypto/signature.js';
import {
  Actions as V1Actions,
  Events as V1Events,
  Sign as V1Sign,
  TokenSymbol as V1TokenSymbol,
  ZkappUri as V1ZkappUri
} from '../../../bindings/mina-transaction/transaction-leaves.js';
import * as TypesV1 from '../../../bindings/mina-transaction/gen/transaction.js';
import * as ValuesV1 from '../../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as JsonV1 from '../../../bindings/mina-transaction/gen/transaction-json.js';
import { jsLayout as layoutV1 } from '../../../bindings/mina-transaction/gen/js-layout.js';
import { expect } from 'expect';

function testHashEquality(v1: TypesV1.AccountUpdate, v2: AccountUpdate.Authorized) {
  expect(TypesV1.AccountUpdate.toInput(v1))
    .toEqual(v2.toInput());

  // HACK
  const v1Impl = {...v1} as V1AccountUpdateImpl;
  Object.setPrototypeOf(v1Impl, V1AccountUpdateImpl.prototype);

  expect(v1Impl.hash())
    .toEqual(v2.hash('testnet'));
}

const privateKey = PrivateKey.random();
const publicKey = privateKey.toPublicKey();

const zkappUri = "http://somewhere.com";
const tokenSymbol = "erdigo";
const verificationKey = new VerificationKey({data: "testing 123", hash: new Field(60)});
const events = [[new Field(10)], [new Field(20), new Field(30)]];
const actions = [[new Field(100), new Field(200)], [new Field(300)]];

const V1Auth = {
  Impossible: {
    constant: new Bool(true),
    signatureNecessary: new Bool(true),
    signatureSufficient: new Bool(false),
  },
  None: {
    constant: new Bool(true),
    signatureNecessary: new Bool(false),
    signatureSufficient: new Bool(true),
  },
  Proof: {
    constant: new Bool(false),
    signatureNecessary: new Bool(false),
    signatureSufficient: new Bool(false),
  },
  Signature: {
    constant: new Bool(false),
    signatureNecessary: new Bool(true),
    signatureSufficient: new Bool(true),
  },
  ProofOrSignature: {
    constant: new Bool(false),
    signatureNecessary: new Bool(false),
    signatureSufficient: new Bool(true),
  }
};

const V1AccountUpdate = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate,
  ValuesV1.AccountUpdate,
  JsonV1.AccountUpdate
>(layoutV1.AccountUpdate as any /* WOOPS */);

const v1AccountUpdate: TypesV1.AccountUpdate = {
  authorization: {
    proof: "proof",
    signature: "signature"
  },
  body: {
    publicKey,
    tokenId: TokenId.MINA.value,
    callData: new Field(1000),
    callDepth: 2,
    balanceChange: Int64.create(new UInt64(100), V1Sign.minusOne),
    incrementNonce: new Bool(false),
    useFullCommitment: new Bool(true),
    implicitAccountCreationFee: new Bool(true),
    mayUseToken: {
      parentsOwnToken: new Bool(false),
      inheritFromParent: new Bool(true),
    },
    authorizationKind: {
      isSigned: new Bool(true),
      isProved: new Bool(false),
      verificationKeyHash: verificationKey.hash
    },
    preconditions: {
      network: {
        snarkedLedgerHash: {
          isSome: new Bool(true),
          value: new Field(111)
        },
        blockchainLength: {
          isSome: new Bool(true),
          value: {
            lower: new UInt32(222),
            upper: new UInt32(333)
          }
        },
        minWindowDensity: {
          isSome: new Bool(true),
          value: {
            lower: new UInt32(444),
            upper: new UInt32(555)
          }
        },
        totalCurrency: {
          isSome: new Bool(true),
          value: {
            lower: new UInt64(666),
            upper: new UInt64(777)
          }
        },
        globalSlotSinceGenesis: {
          isSome: new Bool(true),
          value: {
            lower: new UInt32(888),
            upper: new UInt32(999)
          }
        },
        stakingEpochData: {
          ledger: {
            hash: {
              isSome: new Bool(true),
              value: new Field(1111)
            },
            totalCurrency: {
              isSome: new Bool(true),
              value: {
                lower: new UInt64(2222),
                upper: new UInt64(3333)
              }
            }
          },
          seed: {
            isSome: new Bool(true),
            value: new Field(4444),
          },
          startCheckpoint: {
            isSome: new Bool(true),
            value: new Field(5555),
          },
          lockCheckpoint: {
            isSome: new Bool(true),
            value: new Field(6666),
          },
          epochLength: {
            isSome: new Bool(true),
            value: {
              lower: new UInt32(7777),
              upper: new UInt32(8888)
            }
          },
        },
        nextEpochData: {
          ledger: {
            hash: {
              isSome: new Bool(true),
              value: new Field(9999)
            },
            totalCurrency: {
              isSome: new Bool(true),
              value: {
                lower: new UInt64(11111),
                upper: new UInt64(22222)
              }
            }
          },
          seed: {
            isSome: new Bool(true),
            value: new Field(33333),
          },
          startCheckpoint: {
            isSome: new Bool(true),
            value: new Field(44444),
          },
          lockCheckpoint: {
            isSome: new Bool(true),
            value: new Field(55555),
          },
          epochLength: {
            isSome: new Bool(true),
            value: {
              lower: new UInt32(66666),
              upper: new UInt32(77777)
            }
          },
        }
      },
      account: {
        balance: {
          isSome: new Bool(true),
          value: {
            lower: new UInt64(88888),
            upper: new UInt64(99999)
          }
        },
        nonce: {
          isSome: new Bool(true),
          value: {
            lower: new UInt32(111111),
            upper: new UInt32(222222)
          }
        },
        receiptChainHash: {
          isSome: new Bool(true),
          value: new Field(333333)
        },
        delegate: {
          isSome: new Bool(true),
          value: publicKey
        },
        state: new Array(MAX_ZKAPP_STATE_FIELDS).fill({
          isSome: new Bool(true),
          value: new Field(444444)
        }),
        actionState: {
          isSome: new Bool(true),
          value: new Field(555555)
        },
        provedState: {
          isSome: new Bool(true),
          value: new Bool(true)
        },
        isNew: {
          isSome: new Bool(true),
          value: new Bool(true)
        }
      },
      validWhile: {
        isSome: new Bool(true),
        value: {
          lower: new UInt32(666666),
          upper: new UInt32(777777)
        }
      }
    },
    events: V1Events.fromList(events),
    actions: V1Actions.fromList(actions),
    update: {
      appState: new Array(MAX_ZKAPP_STATE_FIELDS).fill({ isSome: new Bool(true), value: new Field(8) }),
      delegate: { isSome: new Bool(true), value: publicKey },
      verificationKey: {
        isSome: new Bool(true),
        value: {...verificationKey}
      },
      permissions: {
        isSome: new Bool(true),
        value: {
          editState: V1Auth.Proof,
          access: V1Auth.None,
          send: V1Auth.Impossible,
          receive: V1Auth.Signature,
          setDelegate: V1Auth.Proof,
          setPermissions: V1Auth.Proof,
          setVerificationKey: {
            auth: V1Auth.Signature,
            txnVersion: new UInt32(3)
          },
          setZkappUri: V1Auth.Signature,
          editActionState: V1Auth.Proof,
          setTokenSymbol: V1Auth.ProofOrSignature,
          incrementNonce: V1Auth.None,
          setVotingFor: V1Auth.Proof,
          setTiming: V1Auth.Signature
        }
      },
      zkappUri: {
        isSome: new Bool(true),
        value: V1ZkappUri.fromJSON(zkappUri)
      },
      tokenSymbol: {
        isSome: new Bool(true),
        value: V1TokenSymbol.fromJSON(tokenSymbol),
      },
      timing: {
        isSome: new Bool(true),
        value: {
          initialMinimumBalance: new UInt64(20),
          cliffTime: new UInt32(5),
          cliffAmount: new UInt64(1),
          vestingPeriod: new UInt32(15),
          vestingIncrement: new UInt64(1)
        }
      },
      votingFor: {
        isSome: new Bool(true),
        value: new Field(500)
      }
    }
  },
};

const v2AccountUpdate: AccountUpdate.Authorized = new AccountUpdate.Authorized(
  {
    proof: "proof",
    signature: "signature"
  },
  new AccountUpdate<'GenericState', Field[], Field[]>(
    'GenericState',
    GenericData,
    GenericData,
    {
      accountId: new AccountId(publicKey, TokenId.MINA),
      verificationKeyHash: verificationKey.hash,
      callData: new Field(1000),
      balanceChange: Int64.create(new UInt64(100), Sign.minusOne),
      incrementNonce: new Bool(false),
      useFullCommitment: new Bool(true),
      implicitAccountCreationFee: new Bool(true),
      mayUseToken: {
        parentsOwnToken: new Bool(false),
        inheritFromParent: new Bool(true)
      },
      authorizationKind: AccountUpdateAuthorizationKind.Signature(),
      preconditions: {
        network: {
          snarkedLedgerHash: new Field(111),
          blockchainLength: Precondition.InRange.betweenInclusive(new UInt32(222), new UInt32(333)),
          minWindowDensity: Precondition.InRange.betweenInclusive(new UInt32(444), new UInt32(555)),
          totalCurrency: Precondition.InRange.betweenInclusive(new UInt64(666), new UInt64(777)),
          globalSlotSinceGenesis: Precondition.InRange.betweenInclusive(new UInt32(888), new UInt32(999)),
          stakingEpochData: {
            ledger: {
              hash: new Field(1111),
              totalCurrency: Precondition.InRange.betweenInclusive(new UInt64(2222), new UInt64(3333)),
            },
            seed: new Field(4444),
            startCheckpoint: new Field(5555),
            lockCheckpoint: new Field(6666),
            epochLength: Precondition.InRange.betweenInclusive(new UInt32(7777), new UInt32(8888)),
          },
          nextEpochData: {
            ledger: {
              hash: new Field(9999),
              totalCurrency: Precondition.InRange.betweenInclusive(new UInt64(11111), new UInt64(22222)),
            },
            seed: new Field(33333),
            startCheckpoint: new Field(44444),
            lockCheckpoint: new Field(55555),
            epochLength: Precondition.InRange.betweenInclusive(new UInt32(66666), new UInt32(77777)),
          }
        },
        account: {
          balance: Precondition.InRange.betweenInclusive(new UInt64(88888), new UInt64(99999)),
          nonce: Precondition.InRange.betweenInclusive(new UInt32(111111), new UInt32(222222)),
          receiptChainHash: new Field(333333),
          delegate: publicKey,
          state: new GenericStatePreconditions(new Array(MAX_ZKAPP_STATE_FIELDS).fill(Precondition.Equals.equals(new Field(444444)))),
          actionState: new Field(555555),
          isProven: new Bool(true),
          isNew: new Bool(true)
        },
        validWhile: Precondition.InRange.betweenInclusive(new UInt32(666666), new UInt32(777777))
      },
      pushEvents: events,
      pushActions: actions,
      setState: new GenericStateUpdates(new Array(MAX_ZKAPP_STATE_FIELDS).fill(Update.set(new Field(8)))),
      setDelegate: publicKey,
      setVerificationKey: verificationKey,
      setPermissions: {
        editState: 'Proof',
        access: 'None',
        send: 'Impossible',
        receive: 'Signature',
        setDelegate: 'Proof',
        setPermissions: 'Proof',
        setVerificationKey: 'Signature',
        setZkappUri: 'Signature',
        editActionState: 'Proof',
        setTokenSymbol: 'Either',
        incrementNonce: 'None',
        setVotingFor: 'Proof',
        setTiming: 'Signature'
      },
      setZkappUri: zkappUri,
      setTokenSymbol: tokenSymbol,
      setTiming: new AccountTiming({
        // TODO: a proper timing api to construct these
        initialMinimumBalance: new UInt64(20),
        cliffTime: new UInt32(5),
        cliffAmount: new UInt64(1),
        vestingPeriod: new UInt32(15),
        vestingIncrement: new UInt64(1)
      }),
      setVotingFor: new Field(500),
    }
  )
);

// encoding tests
{
  // TODO: the fact that all these extra type-annotation are required means we didn't encode this
  //       type well for typescript's poor type inference
  testV2Encoding<AccountUpdate.Authorized>(AccountUpdate.Authorized, v2AccountUpdate);
  testV1V2ClassEquivalence<number, TypesV1.AccountUpdate, AccountUpdate.Authorized>(V1AccountUpdate, AccountUpdate.Authorized, 0);
  testHashEquality(
    V1AccountUpdate.empty(),
    AccountUpdate.Authorized.empty()
  );
  testV1V2ValueEquivalence<number, TypesV1.AccountUpdate, AccountUpdate.Authorized>(
    V1AccountUpdate,
    AccountUpdate.Authorized,
    v1AccountUpdate,
    v2AccountUpdate,
    2
  );
  testHashEquality(
    v1AccountUpdate,
    v2AccountUpdate
  );
}

// signature test
{
  const v2Update = v2AccountUpdate.toAccountUpdate();

  const v2UpdateSigned = await v2Update.authorize({
    networkId: 'testnet',
    async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
      if(pk !== publicKey) throw new Error();
      return privateKey;
    },
    accountUpdateForestCommitment: BigInt(0),
    fullTransactionCommitment: BigInt(0)
  });

  // TODO: We need to actually ensure the signatures match the old implementation, but the old
  //       interface makes this test annoying to implement, so skipping for right now.
  console.log(`signature = ${JSON.stringify(v2UpdateSigned.authorization.signature)}`);

  /*
  // HACK
  const v1Update = {...v2AccountUpdate} as unknown as V1AccountUpdateImpl;
  Object.setPrototypeOf(v1Update, V1AccountUpdateImpl.prototype);

  expect(v2UpdateSigned.authorization.signature)
    .toEqual(v1Update.authorization.signature);
  */
}

console.log("\n:)");
