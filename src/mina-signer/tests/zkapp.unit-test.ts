import { ZkappCommand } from '../../provable/gen/transaction-bigint.js';
import * as TransactionJson from '../../provable/gen/transaction-json.js';
import Client from '../MinaSigner.js';
import { accountUpdateExample } from '../src/test-vectors/accountUpdate.js';
import { expect } from 'expect';

let dummy = ZkappCommand.toJSON(ZkappCommand.emptyValue());

let exampleZkappCommand: TransactionJson.ZkappCommand = {
  ...dummy,
  accountUpdates: [accountUpdateExample],
  memo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
};

let client = new Client({ network: 'mainnet' });
const keypair = client.genKeys();
let exampleFeePayer = {
  feePayer: keypair.publicKey,
  fee: '1',
  nonce: '0',
  memo: 'test memo',
};

// generates and verifies a signed zkapp command
let zkappCommand = client.signZkappCommand(
  { zkappCommand: exampleZkappCommand, feePayer: exampleFeePayer },
  keypair.privateKey
);
expect(zkappCommand.data).toBeDefined();
expect(zkappCommand.signature).toBeDefined();
expect(client.verifyZkappCommand(zkappCommand)).toEqual(true);
expect(client.verifyTransaction(zkappCommand)).toEqual(true);

// generates and verifies a signed zkapp command by using signTransaction
zkappCommand = client.signTransaction(
  { zkappCommand: exampleZkappCommand, feePayer: exampleFeePayer },
  keypair.privateKey
);
expect(zkappCommand.data).toBeDefined();
expect(zkappCommand.signature).toBeDefined();
expect(client.verifyZkappCommand(zkappCommand)).toEqual(true);
expect(client.verifyTransaction(zkappCommand)).toEqual(true);

// does not verify a signed zkapp command from `testnet`
const testnetClient = new Client({ network: 'testnet' });
expect(testnetClient.verifyZkappCommand(zkappCommand)).toEqual(false);
expect(testnetClient.verifyTransaction(zkappCommand)).toEqual(false);

// should throw an error if no fee is passed to the fee payer
expect(() => {
  client.signZkappCommand(
    {
      zkappCommand: exampleZkappCommand,
      // @ts-ignore - fee is not defined
      feePayer: { feePayer: keypair.publicKey, nonce: '0', memo: 'test memo' },
    },
    keypair.privateKey
  );
}).toThrow('Fee must be greater than 0.001');

// should calculate a correct minimum fee
expect(
  client.getAccountUpdateMinimumFee(exampleZkappCommand.accountUpdates, 1)
).toBe(1);
