// live Berkeley integration test
import {
  Field,
  PrivateKey,
  Mina,
  AccountUpdate,
  isReady,
  shutdown,
  fetchAccount,
  PublicKey,
} from 'snarkyjs';
import { adminPrivateKey, HelloWorld } from './hello_world.js';
await isReady;

let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
Mina.setActiveInstance(Berkeley);

let senderKey = PrivateKey.random();
let sender = senderKey.toPublicKey();

console.log(
  `Funding fee payer ${senderKey
    .toPublicKey()
    .toBase58()} and waiting for inclusion in a block..`
);

await Mina.faucet(sender);

let { nonce, balance } = Berkeley.getAccount(sender);
console.log(
  `Using fee payer ${sender.toBase58()} with nonce ${nonce}, balance ${balance}`
);

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let transactionFee = 100_000_000;

console.log('Compiling smart contract..');
let { verificationKey } = await HelloWorld.compile();

let zkapp = new HelloWorld(zkappAddress);

console.log(`Deploying zkapp for public key ${zkappAddress.toBase58()}.`);

let transaction = await Mina.transaction(
  { sender, fee: transactionFee },
  () => {
    AccountUpdate.fundNewAccount(sender);
    zkapp.deploy({ verificationKey });
  }
);
transaction.sign([senderKey, zkappKey]);

console.log('Sending the transaction..');
await (
  await transaction.send()
).wait({
  maxAttempts: 90,
});

console.log('Fetching updated accounts..');
await fetchAccount({ publicKey: senderKey.toPublicKey() });
await fetchAccount({ publicKey: zkappAddress });

console.log('Trying to update deployed zkApp..');

transaction = await Mina.transaction({ sender, fee: transactionFee }, () => {
  zkapp.update(Field(4), adminPrivateKey);
});
await transaction.sign([senderKey]).prove();

console.log('Sending the transaction..');
await (
  await transaction.send()
).wait({
  maxAttempts: 90,
});

console.log('Checking if the update was valid..');

try {
  (await zkapp.x.fetch())?.assertEquals(Field(4));
} catch (error) {
  throw new Error(
    `On-chain zkApp account doesn't match the expected state. ${error}`
  );
}
console.log('Success!');

shutdown();
