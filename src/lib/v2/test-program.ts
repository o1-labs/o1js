import { MinaProgram, MinaProgramEnv } from './dsl/mina-program.js';
import { AccountUpdate, GenericData } from './mina/account-update.js';
import { Account } from './mina/account.js';
import { ZkappCommandAuthorizationEnvironment } from './mina/authorization.js';
import { AccountId, TokenId } from './mina/core.js';
import { State, StateDefinition } from './mina/state.js';
import { ZkappCommand, ZkappFeePayment } from './mina/transaction.js';
import { Bool } from '../provable/bool.js';
import { Field } from '../provable/field.js';
import { Int64, Sign, UInt32, UInt64 } from '../provable/int.js';
import { PrivateKey, PublicKey } from '../provable/crypto/signature.js';
import { mocks } from '../../bindings/crypto/constants.js';

import { readKeypair } from './tmp-helpers.js';

type TestState = {
  x: typeof Field
};
const TestState: StateDefinition<TestState> = State({
  x: Field
});

const TestProgram = MinaProgram({
  name: 'TestProgram',
  State: TestState,
  Event: GenericData,
  Action: GenericData,

  methods: {
    init: {
      privateInputs: [Field],

      async method(_env: MinaProgramEnv<TestState>, value: Field) {
        return {
          precondition: {
            isProved: new Bool(false),
          },
          setState: {
            x: value
          }
        }
      }
    }
  }
});

const compiledTestProgram = await TestProgram.compile();

const {privateKey: feePayerKey, publicKey: feePayerAddress} = await readKeypair(
  '/home/nathan/.mina-network/mina-local-network-1-0-0/online_whale_keys/online_whale_account_0',
  'naughty blue worm'
);
const appKey = PrivateKey.random();
const appAddress = appKey.toPublicKey();
const testAccount = new Account(
  new AccountId(appAddress, TokenId.MINA),
  new Field(mocks.dummyVerificationKeyHash)
);

const authEnv: ZkappCommandAuthorizationEnvironment = {
  networkId: 'testnet',
  async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
    if(pk === feePayerAddress) return feePayerKey;
    if(pk === appAddress) return appKey;
    throw new Error();
  }
};

const testTransaction = await new ZkappCommand({
  feePayment: new ZkappFeePayment({
    publicKey: feePayerAddress,
    fee: new UInt64(10**9),
    nonce: new UInt32(0)
  }),
  accountUpdates: [
    AccountUpdate.create({
      accountId: new AccountId(feePayerAddress, TokenId.MINA),
      authorizationKind: 'Signature',
      balanceChange: Int64.create(new UInt64(10**9), Sign.minusOne)
    }),
    AccountUpdate.create({
      accountId: new AccountId(appAddress, TokenId.MINA),
      authorizationKind: 'Signature',
      implicitAccountCreationFee: new Bool(true),
      setVerificationKey: compiledTestProgram.verificationKey
    }),
    await TestProgram.init(testAccount, new Field(42))
  ],
}).authorize(authEnv);;

console.log(JSON.stringify(testTransaction));
