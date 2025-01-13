// offchain state object, this is where the data is actually exposed
import {
  AccountUpdate,
  fetchAccount,
  Lightnet,
  Mina,
  PrivateKey,
  PublicKey,
} from 'o1js';
 import {LilypadState, OffchainStorageLilyPad} from "./LilyPadContract.js";

/**
* Set this address before running the fetch state process
 * */
let deployedZkAppAddress = '';

// configure lightnet and retrieve keys
Mina.setActiveInstance(
  Mina.Network({
    mina: 'http://127.0.0.1:8080/graphql',
    archive: 'http://127.0.0.1:8282',
    lightnetAccountManager: 'http://127.0.0.1:8181',
  })
);
const senderPrivateKey = (await Lightnet.acquireKeyPair()).privateKey;

// compile zkprograms
await LilypadState.compile();
await OffchainStorageLilyPad.compile();

let zkApp: OffchainStorageLilyPad;
if (!deployedZkAppAddress) {
  // deploy OffchainStorageLilyPad if it is not already deployed
  const zkAppPrivateKey: PrivateKey = PrivateKey.random();
  zkApp = new OffchainStorageLilyPad(zkAppPrivateKey.toPublicKey());
  const deployTx = await Mina.transaction(
    { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
    async () => {
      AccountUpdate.fundNewAccount(senderPrivateKey.toPublicKey());
      await zkApp.deploy();
    }
  );
  await deployTx.prove();
  const deployTxPromise = await deployTx
    .sign([senderPrivateKey, zkAppPrivateKey])
    .send();
  await deployTxPromise.wait();
  console.log(
    `Deployed OffchainStorageLilyPad to address ${zkAppPrivateKey
      .toPublicKey()
      .toBase58()}`
  );
} else {
  // init OffchainStorageLilyPad at deployedZkAppAddress
  zkApp = new OffchainStorageLilyPad(
    PublicKey.fromBase58(deployedZkAppAddress)
  );
  await fetchAccount({ publicKey: zkApp.address });
  console.log(
    `Interacting with deployed OffchainStorageLilyPad at address ${deployedZkAppAddress}`
  );
}

zkApp.offchainState.setContractInstance(zkApp);
console.log(
  'fetchAccount',
  (
    await fetchAccount({ publicKey: zkApp.address })
  )?.account?.publicKey.toBase58()
);
console.log('OffchainStorageLilyPad starting state:');
await logAppState();
// stop settle process here, copy address from logs into deployedZkAppAddress, trigger fetch process and allow to run up to this point
// after fetch process hits this point, execute settle process to run state updates and settlement
// after state updates and settlement, execute fetch process
await zkApp.offchainState.fetchInternalState();
await logAppState();

// call visit on the contract which will dispatch state updates but will not directly update the OffchainStateInstance
await (await visit(senderPrivateKey)).wait();
console.log('Executed visits, app state should be unchanged: ');

// Create a settlement proof
console.log('\nSettling visits on chain');
const settlementProof = await zkApp.offchainState.createSettlementProof();
// await logAppState(); // todo: logging the state here gives a root mismatch error because the internal state map is updated by createSettlementProof before the on chain value is changed
const settleTx = await Mina.transaction(
  { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
  async () => {
    await zkApp.settle(settlementProof);
  }
);
await settleTx.prove();
const settleTxPromise = await settleTx.sign([senderPrivateKey]).send();
await settleTxPromise.wait();

console.log(
  'Executed OffchainStorageLilyPad.settle(), on chain state has been updated with the effects of the dispatched visits: '
);

// must call fetchAccount after executing settle transaction in order to retrieve the most up to date on chain commitments
await logAppState();


/**************************************************************************
 * Helpers
 ***************************************************************************/
async function visit(sender: PrivateKey) {
  const tx = await Mina.transaction(
    { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
    async () => {
      await zkApp.visit();
    }
  );
  await tx.prove();
  const txPromise = await tx.sign([sender]).send();

  console.log(
    `${sender.toPublicKey().toBase58()} called OffchainStorageLilyPad.visit()`
  );
  return txPromise;
}

async function logAppState() {
  await fetchAccount({ publicKey: zkApp.address });
  const onchainStateCommitment = zkApp.offchainStateCommitments.get();

  console.log(
    `${process.pid} onchainStateCommitment.root=${onchainStateCommitment.root.toString()} `
  );

  const currentOccupant =
    await zkApp.offchainState.fields.currentOccupant.get();
  console.log(`currentOccupant: ${currentOccupant.value.toBase58()}`);
}
