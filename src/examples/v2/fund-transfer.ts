import { Bool, Experimental, Int64, PrivateKey, PublicKey, sendZkapp, UInt32, UInt64 } from 'o1js';

const {
  ZkappCommand,
  ZkappFeePayment,
  AccountUpdate,
  AccountUpdateAuthorizationKind,
  GenericData,
  AccountId,
  TokenId,
} = Experimental.V2;

// Generate a random keypair for the fee payer
const feePayerKey = PrivateKey.fromBase58('EKEDzWYFqRrF8sKxeD3ibLy2rcxCe4UoREgKxrKNUvNbh1d8dtt2'); // WARNING: This is a hardcoded private key, do not use in production
const feePayerAddress = feePayerKey.toPublicKey(); // B62qjTDdVdxkkRNRbkpdq6D9RUvX2C7RUaW3voHMAjtmk6WLxuXHfS9

const receiverAddress = PrivateKey.random().toPublicKey();

const amount = 11000000n;
const fee = 10n * 10n ** 9n;

const accountCreationFee = 1000000000n;

const totalAmount = amount + fee;

// build a manual zkapp command that transfers funds from the fee payer to the receiver address
const paymentCommand = await new ZkappCommand({
  feePayment: new ZkappFeePayment({
    publicKey: feePayerAddress,
    fee: new UInt64(fee),
    nonce: new UInt32(4),
  }),
  accountUpdates: [
    new AccountUpdate('GenericState', GenericData, GenericData, {
      authorizationKind: AccountUpdateAuthorizationKind.Signature(),
      accountId: new AccountId(feePayerAddress, TokenId.MINA),
      balanceChange: Int64.from(totalAmount + accountCreationFee).neg(),
      incrementNonce: Bool(true),
    }),
    new AccountUpdate('GenericState', GenericData, GenericData, {
      authorizationKind: AccountUpdateAuthorizationKind.None(),
      accountId: new AccountId(receiverAddress, TokenId.MINA),
      balanceChange: Int64.from(amount),
    }),
  ],
}).authorize({
  networkId: 'testnet',
  async getPrivateKey(pk: PublicKey): Promise<PrivateKey> {
    if (pk === feePayerAddress) return feePayerKey;
    throw new Error("Don't have the private key for this public key");
  },
});

let response = await sendZkapp(
  JSON.stringify(paymentCommand.toJSON()),
  'https://api.minascan.io/node/devnet/v1/graphql'
);
console.log('response', JSON.stringify(response, null, 2));
