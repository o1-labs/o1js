// Live integration test against real Mina network.
import { AccountUpdate, Field, Mina, PrivateKey, fetchAccount } from 'o1js';
import { HelloWorld, adminPrivateKey } from './hello_world.js';

const useLocalNetwork = process.env.USE_LOCAL_NETWORK === 'true';
const senderKey = useLocalNetwork
  ? PrivateKey.fromBase58(
      'EKEnVLUhYHDJvgmgQu5SzaV8MWKNfhAXYSkLBRk5KEfudWZRbs4P'
    )
  : PrivateKey.random();
const sender = senderKey.toPublicKey();
const zkAppKey = PrivateKey.random();
const zkAppAddress = zkAppKey.toPublicKey();
const transactionFee = 100_000_000;

// Network configuration
const network = Mina.Network(
  useLocalNetwork
    ? 'http://localhost:8080/graphql'
    : 'https://proxy.berkeley.minaexplorer.com/graphql'
);
Mina.setActiveInstance(network);

// Fee payer setup
if (!useLocalNetwork) {
  console.log(`Funding the fee payer account.`);
  await Mina.faucet(sender);
}
console.log(`Fetching the fee payer account information.`);
const accountDetails = (await fetchAccount({ publicKey: sender })).account;
console.log(
  `Using the fee payer account ${sender.toBase58()} with nonce: ${
    accountDetails?.nonce
  } and balance: ${accountDetails?.balance}.`
);
console.log('');

// zkApp compilation
console.log('Compiling the smart contract.');
const { verificationKey } = await HelloWorld.compile();
const zkApp = new HelloWorld(zkAppAddress);
console.log('');

// zkApp deployment
console.log(`Deploying zkApp for public key ${zkAppAddress.toBase58()}.`);
let transaction = await Mina.transaction(
  { sender, fee: transactionFee },
  () => {
    AccountUpdate.fundNewAccount(sender);
    zkApp.deploy({ verificationKey });
  }
);
transaction.sign([senderKey, zkAppKey]);
console.log('Sending the transaction.');
let pendingTx = await transaction.send();
if (pendingTx.hash() !== undefined) {
  console.log(`Success! Deploy transaction sent.
Your smart contract will be deployed
as soon as the transaction is included in a block.
Txn hash: ${pendingTx.hash()}`);
}
console.log('Waiting for transaction inclusion in a block.');
await pendingTx.wait({ maxAttempts: 90 });
console.log('');

// zkApp state update
console.log('Trying to update deployed zkApp state.');
transaction = await Mina.transaction({ sender, fee: transactionFee }, () => {
  zkApp.update(Field(4), adminPrivateKey);
});
await transaction.sign([senderKey]).prove();
console.log('Sending the transaction.');
pendingTx = await transaction.send();
if (pendingTx.hash() !== undefined) {
  console.log(`Success! Update transaction sent.
Your smart contract state will be updated
as soon as the transaction is included in a block.
Txn hash: ${pendingTx.hash()}`);
}
console.log('Waiting for transaction inclusion in a block.');
await pendingTx.wait({ maxAttempts: 90 });
console.log('');

// zkApp state check
console.log('Validating zkApp state update.');
try {
  (await zkApp.x.fetch())?.assertEquals(Field(4));
} catch (error) {
  throw new Error(
    `On-chain zkApp account state doesn't match the expected state. ${error}`
  );
}
console.log('Success!');
