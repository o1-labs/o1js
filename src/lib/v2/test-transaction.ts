import {
  AccountUpdate,
  AccountUpdateTree,
  GenericData,
} from './mina/account-update.js';
import { AccountId } from './mina/account.js';
import { AccountUpdateAuthorizationKind } from './mina/authorization.js';
import { TokenId } from './mina/core.js';
import { ZkappCommand, ZkappFeePayment } from './mina/transaction.js';
import { Field } from '../provable/field.js';
import { UInt32, UInt64 } from '../provable/int.js';
import { PrivateKey, PublicKey } from '../provable/crypto/signature.js';
import { mocks } from '../../bindings/crypto/constants.js';

import { readKeypair } from './tmp-helpers.js';

const { privateKey: feePayerKey, publicKey: feePayerAddress } =
  await readKeypair(
    '/home/nathan/.mina-network/mina-local-network-1-0-0/online_whale_keys/online_whale_account_0',
    'naughty blue worm'
  );
const appKey = feePayerKey;
const appAddress = feePayerAddress;

// const feePayerKey = PrivateKey.random();
// const feePayerAddress = feePayerKey.toPublicKey();
// const appKey = PrivateKey.random();
// const appAddress = appKey.toPublicKey();

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
        verificationKeyHash: new Field(mocks.dummyVerificationKeyHash),
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
