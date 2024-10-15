import {
  MinaProgram,
  MinaProgramEnv,
  MinaProgramMethodReturn,
} from './dsl/mina-program.js';
import { AccountUpdate, GenericData } from './mina/account-update.js';
import { Account, AccountId } from './mina/account.js';
import { ZkappCommandAuthorizationEnvironment } from './mina/authorization.js';
import { TokenId } from './mina/core.js';
import { State, StateDefinition } from './mina/state.js';
import { createZkappCommand } from './mina/transaction.js';
import { LocalLedger } from './mina/views.js';
import { Bool } from '../provable/bool.js';
import { Field } from '../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../provable/int.js';
import { PrivateKey, PublicKey } from '../provable/crypto/signature.js';

import { readKeypair } from './tmp-helpers.js';

type TestState = {
  x: typeof Field;
};
const TestState: StateDefinition<TestState> = State({
  x: Field,
});

const TestProgram = MinaProgram({
  name: 'TestProgram',
  State: TestState,
  Event: GenericData,
  Action: GenericData,

  // deployConfig: {
  //   permissions: {
  //     editState: 'Proof',
  //     send: 'Impossible',
  //     receive: 'Impossible',
  //     setDelegate: 'Impossible',
  //     setPermissions: 'Impossible',
  //     setVerificationKey: 'Impossible',
  //     setZkappUri: 'Impossible',
  //     editActionState: 'Impossible',
  //     setTokenSymbol: 'Impossible',
  //     incrementNonce: 'Proof',
  //     setVotingFor: 'Impossible',
  //     setTiming: 'Impossible',
  //     access: 'None'
  //   },
  //   initMethod: 'init'
  // },

  methods: {
    init: {
      privateInputs: [Field],

      async method(
        _env: MinaProgramEnv<TestState>,
        value: Field
      ): Promise<MinaProgramMethodReturn<TestState>> {
        return {
          incrementNonce: new Bool(true),
          preconditions: {
            account: {
              isProven: new Bool(false),
              nonce: new UInt32(0),
            },
          },
          setState: {
            x: value,
          },
        };
      },
    },
  },
});

const compiledTestProgram = await TestProgram.compile();

const { privateKey: feePayerKey, publicKey: feePayerAddress } =
  await readKeypair(
    '/home/nathan/.mina-network/mina-local-network-1-0-0/online_whale_keys/online_whale_account_0',
    'naughty blue worm'
  );
const feePayer = Account.empty(new AccountId(feePayerAddress, TokenId.MINA));
feePayer.nonce = new UInt32(4);
feePayer.balance = new UInt64(100 * 10 ** 9);

const appKey = PrivateKey.random();
const app = Account.empty(new AccountId(appKey.toPublicKey(), TokenId.MINA));

console.log(
  `feePayer = ${JSON.stringify(feePayerAddress)}, app = ${JSON.stringify(
    app.accountId.publicKey
  )}`
);

const testLedger = new LocalLedger([feePayer]);

const authEnv: ZkappCommandAuthorizationEnvironment = {
  networkId: 'testnet',
  async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
    if (pk === feePayerAddress) return feePayerKey;
    if (pk === app.accountId.publicKey) return appKey;
    throw new Error();
  },
};

/*
const testTransaction = await new ZkappCommand({
  feePayment: new ZkappFeePayment({
    publicKey: feePayerAddress,
    fee: new UInt64(10**9),
    nonce: new UInt32(4)
  }),
  accountUpdates: [
    AccountUpdate.create({
      accountId: new AccountId(feePayerAddress, TokenId.MINA),
      authorizationKind: 'Signature',
      incrementNonce: new Bool(true),
      balanceChange: Int64.create(new UInt64(10**9), Sign.minusOne),
      preconditions: {
        account: {
          nonce: new UInt32(5)
        }
      }
    }),
    AccountUpdate.create({
      accountId: new AccountId(appAddress, TokenId.MINA),
      authorizationKind: 'Signature',
      useFullCommitment: new Bool(true),
      implicitAccountCreationFee: new Bool(true),
      balanceChange: Int64.create(new UInt64(10**9), Sign.one),
      setVerificationKey: compiledTestProgram.verificationKey,
      setPermissions: {
        editState: 'Proof',
        send: 'Impossible',
        receive: 'Impossible',
        setDelegate: 'Impossible',
        setPermissions: 'Impossible',
        setVerificationKey: 'Impossible',
        setZkappUri: 'Impossible',
        editActionState: 'Impossible',
        setTokenSymbol: 'Impossible',
        incrementNonce: 'Proof',
        setVotingFor: 'Impossible',
        setTiming: 'Impossible',
        access: 'None'
      }
    }),
    await TestProgram.init(testAccount, new Field(42))
  ],
}).authorize(authEnv);;
*/

const testTransaction = await createZkappCommand(
  testLedger,
  authEnv,
  {
    feePayer: feePayerAddress,
    fee: new UInt64(10 ** 9),
  },
  async (ctx) => {
    ctx.add(
      AccountUpdate.create({
        accountId: feePayer.accountId,
        authorizationKind: 'Signature',
        incrementNonce: new Bool(true),
        balanceChange: Int64.create(new UInt64(10 ** 9), Sign.minusOne),
        preconditions: {
          account: {
            nonce:
              ctx.ledger.getAccount(feePayer.accountId)?.nonce ?? UInt32.zero,
          },
        },
      })
    );

    ctx.add(
      AccountUpdate.create({
        accountId: app.accountId,
        authorizationKind: 'Signature',
        useFullCommitment: new Bool(true),
        implicitAccountCreationFee: new Bool(true),
        balanceChange: Int64.create(new UInt64(10 ** 9), Sign.one),
        setVerificationKey: compiledTestProgram.verificationKey,
        setPermissions: {
          editState: 'Proof',
          send: 'Impossible',
          receive: 'Impossible',
          setDelegate: 'Impossible',
          setPermissions: 'Impossible',
          setVerificationKey: 'Impossible',
          setZkappUri: 'Impossible',
          editActionState: 'Impossible',
          setTokenSymbol: 'Impossible',
          incrementNonce: 'Proof',
          setVotingFor: 'Impossible',
          setTiming: 'Impossible',
          access: 'None',
        },
      })
    );

    await TestProgram.init(ctx, app.accountId, new Field(42));
  }
);

console.log(JSON.stringify(testTransaction));
