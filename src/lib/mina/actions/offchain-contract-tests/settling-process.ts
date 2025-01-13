 import { Message } from './multi-thread-lightnet.js';
import { fetchAccount, Lightnet, Mina, UInt64 }  from 'o1js';
 import {LilypadState, OffchainStorageLilyPad} from "./LilyPadContract.js";



process.send?.(`Starting settling process: ${process.pid}`);
/**
 * Configure lightnet and retrieve signing keys
 * */
const network = Mina.Network({
  mina: 'http://localhost:8080/graphql',
  archive: 'http://127.0.0.1:8282',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(network);
const senderPrivateKey = (await Lightnet.acquireKeyPair()).privateKey;
const zkAppPrivateKey = (await Lightnet.acquireKeyPair()).privateKey;

const zkApp = new OffchainStorageLilyPad(zkAppPrivateKey.toPublicKey());
zkApp.offchainState.setContractInstance(zkApp);

await LilypadState.compile();
await OffchainStorageLilyPad.compile();

// notify main process that this process is ready to begin work
process.send?.({ type: 'READY' });

process.on('message', async (msg: Message) => {
  console.log(
    `Settling process received message from root: ${JSON.stringify(msg)}`
  );
  /**
   * Compile offchain state zkprogram and contract, deploy contract
   * */
  if (msg.type === 'DEPLOY') {
    const deployTx = await Mina.transaction(
      { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
      async () => {
        await zkApp.deploy();
      }
    );
    await deployTx.prove();
    const deployTxPromise = await deployTx
      .sign([senderPrivateKey, zkAppPrivateKey])
      .send();
    await deployTxPromise.wait();
    await logState();


    // let's add a state update since it seems like the map being empty is causing a new map to be loaded on all gets
    const accountCreationTx = Mina.transaction(
      { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
      async () => {
        await zkApp.visit( );
      }
    );
    await accountCreationTx.sign([senderPrivateKey]);
    await accountCreationTx.prove();
    await accountCreationTx.send().wait();
    process.send?.("Ran initial account update");

    process.send?.({
      type: 'DEPLOYED',
      address: zkApp.address.toBase58(),
      account: senderPrivateKey.toPublicKey().toBase58(),
    });
  } else if (msg.type === 'UPDATE_STATE') {
    /**
     * Modify zkapp offchain state by creating an account
     * Settle state
     * */
    const accountCreationTx = Mina.transaction(
      { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
      async () => {
        await zkApp.visit();
      }
    );
    await accountCreationTx.sign([senderPrivateKey]);
    await accountCreationTx.prove();
    await accountCreationTx.send().wait();
    process.send?.("Updated state without settling");
    // todo: verify state = 0
    await logState();

    process.send?.("Settling on chain state");
    const settlementProof = await zkApp.offchainState.createSettlementProof();
     // todo: logging the state here gives a root mismatch error because the internal state map is updated by createSettlementProof before the on chain value is changed
    const settleTx = await Mina.transaction(
      { fee: 1e9, sender: senderPrivateKey.toPublicKey() },
      async () => {
        // update the offchain state and on chain commitment
        await zkApp.settle(settlementProof);
      }
    );
    await settleTx.prove();
    const settleTxPromise = await settleTx.sign([senderPrivateKey]).send();
    await settleTxPromise.wait();
    // todo: verify state = 10000
    await logState();

    process.send?.({ type: 'STATE_UPDATED' });
  }
});

async function logState() {
  await fetchAccount({ publicKey: zkApp.address });
  const root = zkApp.offchainStateCommitments.get().root.toString();
  const currentOccupant = (await zkApp.offchainState.fields.currentOccupant.get()).value.toString();
  const message = `offchainState: (currentOccupant => ${currentOccupant}), (root => ${root})`;
  process.send?.(message);
}
