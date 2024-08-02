import {
  AccountUpdate,
  Lightnet,
  Mina,
  PrivateKey,
} from '../../../../dist/node/index.js';
import { randomAccounts } from '../../utils/randomAccounts.js';
import { tic, toc } from '../../utils/tic-toc.node.js';
import { MerkleListReducing } from './actions-as-merkle-list.js';

const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';

if (!useCustomLocalNetwork) {
  throw 'Only Lightnet is currently supported';
}

tic('Run reducer examples against real network.');
console.log();
const network = Mina.Network({
  mina: useCustomLocalNetwork
    ? 'http://localhost:8080/graphql'
    : 'https://berkeley.minascan.io/graphql',
  archive: useCustomLocalNetwork
    ? 'http://localhost:8282'
    : 'https://api.minascan.io/archive/berkeley/v1/graphql',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(network);

let { keys, addresses } = randomAccounts('contract', 'user1', 'user2');

let tx, pendingTx: Mina.PendingTransaction, balances, oldBalances;

// compile contracts & wait for fee payer to be funded
const senderKey = useCustomLocalNetwork
  ? (await Lightnet.acquireKeyPair()).privateKey
  : PrivateKey.random();
const sender = senderKey.toPublicKey();

const sender2Key = useCustomLocalNetwork
  ? (await Lightnet.acquireKeyPair()).privateKey
  : PrivateKey.random();
const sender2 = sender2Key.toPublicKey();

tic('Compiling Merkle List Reducer Smart Contract');
await MerkleListReducing.compile();
toc();
const merkleListReducerContract = new MerkleListReducing(addresses.contract);

let senderSpec = { sender, fee: 1000000000n };
let sender2Spec = { sender: sender2, fee: 1000000000n };

tic('deploy contracts');
let deployTx = await Mina.transaction(senderSpec, async () => {
  AccountUpdate.createSigned(sender).balance.subInPlace(
    Mina.getNetworkConstants().accountCreationFee
  );
  await merkleListReducerContract.deploy();
});
pendingTx = await deployTx.sign([senderKey, keys.contract]).send();

await pendingTx.wait();
toc('deploy contracts');
console.log('working so far');
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
toc('dispatch transactions');

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
toc('proving inclusion');

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
toc('building');

tic('sending');
const txPromises = [];
for (let i = 0; i < txs.length; i++) {
  txPromises.push(txs[i].tx.sign([txs[i].privateKey]).send());
}
await Promise.all(txPromises);
toc('sending');

tic('waiting');
await new Promise((_r) => setTimeout(_r, 20_000));
toc('waiting');

toc('dispatch transactions (multi-transaction)');

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
toc('proving inclusion (multi-transaction)');

// ----
toc();
