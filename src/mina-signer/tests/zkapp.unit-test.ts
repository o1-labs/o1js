import { ZkappCommand } from '../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as TransactionJson from '../../bindings/mina-transaction/gen/transaction-json.js';
import Client from '../mina-signer.js';
import { accountUpdateExample } from '../src/test-vectors/accountUpdate.js';
import { expect } from 'expect';
import { Transaction } from '../../lib/mina/mina.js';
import { PrivateKey } from '../../lib/provable/crypto/signature.js';
import { Signature } from '../src/signature.js';
import { mocks } from '../../bindings/crypto/constants.js';

const client = new Client({ network: 'testnet' });
let { publicKey, privateKey } = client.genKeys();

let dummy = ZkappCommand.toJSON(ZkappCommand.empty());
let dummySignature = Signature.toBase58(Signature.dummy());

// we construct a transaction which needs signing of the fee payer and another account update
let accountUpdateExample2: TransactionJson.AccountUpdate = {
  ...accountUpdateExample,
  body: {
    ...accountUpdateExample.body,
    publicKey,
    authorizationKind: {
      isSigned: true,
      isProved: false,
      verificationKeyHash: mocks.dummyVerificationKeyHash,
    },
  },
  authorization: { proof: null, signature: dummySignature },
};

let exampleZkappCommand: TransactionJson.ZkappCommand = {
  ...dummy,
  accountUpdates: [accountUpdateExample, accountUpdateExample2],
  memo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
};

let exampleFeePayer = {
  feePayer: publicKey,
  fee: '100000000',
  nonce: '1',
  memo: 'test memo',
};

// generates and verifies a signed zkapp command
let zkappCommand = client.signZkappCommand(
  { zkappCommand: exampleZkappCommand, feePayer: exampleFeePayer },
  privateKey
);
expect(zkappCommand.data).toBeDefined();
expect(zkappCommand.signature).toBeDefined();
expect(client.verifyZkappCommand(zkappCommand)).toEqual(true);
expect(client.verifyTransaction(zkappCommand)).toEqual(true);

// generates and verifies a signed zkapp command by using signTransaction
zkappCommand = client.signTransaction(
  { zkappCommand: exampleZkappCommand, feePayer: exampleFeePayer },
  privateKey
);
expect(zkappCommand.data).toBeDefined();
expect(zkappCommand.signature).toBeDefined();
expect(client.verifyZkappCommand(zkappCommand)).toEqual(true);
expect(client.verifyTransaction(zkappCommand)).toEqual(true);

// does not verify a signed zkapp command from `mainnet`
const mainnetClient = new Client({ network: 'mainnet' });
expect(mainnetClient.verifyZkappCommand(zkappCommand)).toEqual(false);
expect(mainnetClient.verifyTransaction(zkappCommand)).toEqual(false);

// should throw an error if no fee is passed to the fee payer
expect(() => {
  client.signZkappCommand(
    {
      zkappCommand: exampleZkappCommand,
      // @ts-ignore - fee is not defined
      feePayer: { feePayer: publicKey, nonce: '0', memo: 'test memo' },
    },
    privateKey
  );
}).toThrow('Missing fee in fee payer');

// should calculate a correct minimum fee
expect(
  client.getAccountUpdateMinimumFee(exampleZkappCommand.accountUpdates)
).toBe(0.002);

// same transaction signed with o1js (OCaml implementation) gives the same result

let transactionJson = {
  ...exampleZkappCommand,
  feePayer: {
    body: {
      publicKey: exampleFeePayer.feePayer,
      fee: exampleFeePayer.fee,
      nonce: exampleFeePayer.nonce,
      validUntil: null,
    },
    authorization: dummySignature,
  },
  memo: zkappCommand.data.zkappCommand.memo,
};

let tx = Transaction.fromJSON(transactionJson);
tx.transaction.feePayer.lazyAuthorization = { kind: 'lazy-signature' };
tx.transaction.accountUpdates[1].lazyAuthorization = { kind: 'lazy-signature' };
tx.sign([PrivateKey.fromBase58(privateKey)]);

expect(zkappCommand.data.zkappCommand.feePayer.authorization).toEqual(
  tx.transaction.feePayer.authorization
);
expect(
  zkappCommand.data.zkappCommand.accountUpdates[1].authorization.signature
).toEqual(tx.transaction.accountUpdates[1].authorization.signature);
expect(JSON.stringify(zkappCommand.data.zkappCommand)).toEqual(tx.toJSON());
