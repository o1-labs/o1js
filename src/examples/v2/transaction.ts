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

// Generate a random keypair for the fee payer
const feePayerKey = PrivateKey.random();
const feePayerAddress = feePayerKey.toPublicKey();

// Use the same keypair for the app
const appKey = feePayerKey;
const appAddress = feePayerAddress;

// Create a transaction through the new transaction construction API
// a transaction consists of a feepayer and a list of account updates
const command = await new ZkappCommand({
  feePayment: new ZkappFeePayment({
    publicKey: feePayerAddress,
    fee: new UInt64(10 * 10 ** 9),
    nonce: new UInt32(0),
  }),
  accountUpdates: [
    new AccountUpdateTree(
      // this account update describes a generic state update that is signed by the app key
      // it updates the verification key of the app account to the dummy verification key
      // and pushes an event with value 42
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
  // this transaction will be authorized for the testnet network
  networkId: 'testnet',
  // we provide a function that returns the private key for the authorization
  async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
    if (pk === feePayerAddress) return feePayerKey;
    if (pk === appAddress) return appKey;
    throw new Error("Don't have the private key for this public key");
  },
});

console.log(JSON.stringify(command.toJSON(), null, 2));
