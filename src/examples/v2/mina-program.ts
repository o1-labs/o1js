import {
  Bool,
  Experimental,
  Field,
  Int64,
  PrivateKey,
  PublicKey,
  Sign,
  UInt32,
  UInt64,
} from 'o1js';

const V2 = Experimental.V2;

type MinaProgramEnv<S extends Experimental.V2.StateLayout> = Experimental.V2.MinaProgramEnv<S>;

type TestState = {
  x: typeof Field;
};

const TestState: Experimental.V2.StateDefinition<TestState> = V2.State({
  x: Field,
});

const TestProgram = V2.MinaProgram({
  name: 'TestProgram',
  State: TestState,
  Event: V2.GenericData,
  Action: V2.GenericData,

  methods: {
    init: {
      privateInputs: [Field],

      async method(
        _env: MinaProgramEnv<TestState>,
        value: Field
      ): Promise<Experimental.V2.MinaProgramMethodReturn<TestState>> {
        return {
          incrementNonce: new Bool(true),
          preconditions: {
            account: {
              isProven: new Bool(false),
              nonce: new UInt32(0),
            },
          },
          setState: V2.StateUpdates.empty(TestState),
        };
      },
    },
  },
});

const compiledTestProgram = await TestProgram.compile();

const feePayerKey = PrivateKey.random();
const feePayerAddress = feePayerKey.toPublicKey();

const feePayer = V2.Account.empty(new V2.AccountId(feePayerAddress, V2.TokenId.MINA));
feePayer.nonce = new UInt32(4);
feePayer.balance = new UInt64(100 * 10 ** 9);

const appKey = PrivateKey.random();
const app = V2.Account.empty(new V2.AccountId(appKey.toPublicKey(), V2.TokenId.MINA));

console.log(
  `feePayer = ${JSON.stringify(feePayerAddress)}, app = ${JSON.stringify(app.accountId.publicKey)}`
);

const testLedger = new V2.LocalLedger([feePayer]);

const authEnv: Experimental.V2.ZkappCommandAuthorizationEnvironment = {
  networkId: 'testnet',
  async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
    if (pk === feePayerAddress) return feePayerKey;
    if (pk === app.accountId.publicKey) return appKey;
    throw new Error();
  },
};

const testTransaction = await V2.createZkappCommand(
  testLedger,
  V2.LocalChain.initial(),
  authEnv,
  {
    feePayer: feePayerAddress,
    fee: new UInt64(10 ** 9),
  },
  async (ctx) => {
    ctx.add(
      V2.AccountUpdate.create({
        accountId: feePayer.accountId,
        authorizationKind: 'Signature',
        incrementNonce: new Bool(true),
        balanceChange: Int64.create(new UInt64(10 ** 9), Sign.minusOne),
        preconditions: {
          account: {
            nonce: ctx.ledger.getAccount(feePayer.accountId)?.nonce ?? UInt32.zero,
          },
        },
      })
    );

    ctx.add(
      V2.AccountUpdate.create({
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

    await TestProgram.init(ctx, app.accountId, Field(42) as never);
  }
);

console.log(JSON.stringify(testTransaction));
