import {
  AccountUpdate,
  Lightnet,
  Mina,
  PrivateKey,
} from 'o1js';
import { DEFAULT_LIGHTNET_CONFIG } from '../../utils/network-configuration.js';
import { randomAccounts } from '../../utils/random-accounts.js';
import { tic, toc } from '../../utils/tic-toc.node.js';
import { MerkleListReducing } from './actions-as-merkle-list.js';

tic('Run reducer examples against real network.');
console.log();
const network = Mina.Network(DEFAULT_LIGHTNET_CONFIG);
Mina.setActiveInstance(network);

let { keys, addresses } = randomAccounts('contract', 'user1', 'user2');

let pendingTx: Mina.PendingTransaction;

// compile contracts & wait for fee payer to be funded
const senderKey = (await Lightnet.acquireKeyPair()).privateKey
const sender = senderKey.toPublicKey();

const sender2Key = (await Lightnet.acquireKeyPair()).privateKey
const sender2 = sender2Key.toPublicKey();

tic('Compiling Merkle List Reducer Smart Contract');
await MerkleListReducing.compile();
toc();
const merkleListReducerContract = new MerkleListReducing(addresses.contract);

let senderSpec = { sender, fee: 1000000000 };
let sender2Spec = { sender: sender2, fee: 1000000000 };

tic('deploy contracts');
let deployTx = await Mina.transaction(senderSpec, async () => {
  AccountUpdate.createSigned(sender).balance.subInPlace(
    Mina.getNetworkConstants().accountCreationFee
  );
  await merkleListReducerContract.deploy();
});
pendingTx = await deployTx.sign([senderKey, keys.contract]).send();

await pendingTx.wait();
toc();
// push some actions

tic('dispatch transactions');
let dispatchTx = await Mina.transaction(senderSpec, async () => {
  await merkleListReducerContract.postAddress(addresses.user1);
  await merkleListReducerContract.postAddress(addresses.contract);
  await merkleListReducerContract.postTwoAddresses(addresses.user2, sender);
  await merkleListReducerContract.postAddress(addresses.user2);
  await merkleListReducerContract.postTwoAddresses(
    addresses.contract,
    addresses.user1
  );
});
await dispatchTx.prove();
pendingTx = await dispatchTx.sign([senderKey]).send();
await pendingTx.wait();
toc();

tic('proving inclusion');
// check if the actions contain the `sender` address
let containsTx = await Mina.transaction(senderSpec, async () => {
  await merkleListReducerContract.assertContainsAddress(sender);
  await merkleListReducerContract.assertContainsAddress(addresses.user1);
  await merkleListReducerContract.assertContainsAddress(addresses.user2);
  await merkleListReducerContract.assertContainsAddress(addresses.contract);
});
await containsTx.prove();
pendingTx = await containsTx.sign([senderKey]).send();
await pendingTx.wait();
toc();

tic('dispatch transactions (multi-transaction)');

tic('building');
const txs = [];
let dispatchTx1 = await Mina.transaction(senderSpec, async () => {
  await merkleListReducerContract.postAddress(addresses.user1);
});
await dispatchTx1.prove();
txs.push({ tx: dispatchTx1, privateKey: senderKey });

let dispatchTx2 = await Mina.transaction(sender2Spec, async () => {
  await merkleListReducerContract.postTwoAddresses(
    addresses.user2,
    addresses.contract
  );
});
await dispatchTx2.prove();
txs.push({ tx: dispatchTx2, privateKey: sender2Key });
toc();

tic('sending');
const txPromises = [];
for (let i = 0; i < txs.length; i++) {
  txPromises.push(txs[i].tx.sign([txs[i].privateKey]).send());
}
await txPromises[0].wait();
await txPromises[1].wait();
toc();

tic('waiting');
await new Promise((_r) => setTimeout(_r, 60_000));
toc();

toc();

tic('proving inclusion (multi-transaction)');
// check if the actions contain the `sender` address
let containsTx2 = await Mina.transaction(senderSpec, async () => {
  await merkleListReducerContract.assertContainsAddress(addresses.user1);
  await merkleListReducerContract.assertContainsAddress(addresses.user2);
  await merkleListReducerContract.assertContainsAddress(addresses.contract);
});
await containsTx2.prove();
pendingTx = await containsTx2.sign([senderKey]).send();
await pendingTx.wait();
toc();

// ----
toc();

console.log('Success!');

// Tear down
const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
  publicKey: sender.toBase58(),
});
if (keyPairReleaseMessage) console.info(keyPairReleaseMessage);

const keyPairReleaseMessage2 = await Lightnet.releaseKeyPair({
  publicKey: sender2.toBase58(),
});
if (keyPairReleaseMessage2) console.info(keyPairReleaseMessage2);
