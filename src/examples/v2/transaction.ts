import { Experimental, Field, PrivateKey, PublicKey, UInt32, UInt64, VerificationKey } from 'o1js';

const {
  ZkappCommand,
  ZkappFeePayment,
  AccountUpdateTree,
  AccountUpdate,
  AccountUpdateAuthorizationKind,
  GenericData,
  AccountId,
  TokenId,
} = Experimental.V2;

const feePayerKey = PrivateKey.random();
const feePayerAddress = feePayerKey.toPublicKey();
const appKey = feePayerKey;
const appAddress = feePayerAddress;

const command = await new ZkappCommand({
  feePayment: new ZkappFeePayment({
    publicKey: feePayerAddress,
    fee: new UInt64(10 * 10 ** 9),
    nonce: new UInt32(0),
  }),
  accountUpdates: [
    new AccountUpdateTree(
      new AccountUpdate('GenericState', GenericData, GenericData, {
        authorizationKind: AccountUpdateAuthorizationKind.Signature(),
        accountId: new AccountId(appAddress, TokenId.MINA),
        // TODO: probably make this (explicitly) nullable, providing this value as the default
        verificationKeyHash: VerificationKey.dummySync().hash,
        callData: new Field(0),
        pushEvents: [[new Field(42)]],
      }),
      []
    ),
  ],
}).authorize({
  networkId: 'testnet',
  async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
    if (pk === feePayerAddress) return feePayerKey;
    if (pk === appAddress) return appKey;
    throw new Error();
  },
});

console.log(JSON.stringify(command.toJSON()));
