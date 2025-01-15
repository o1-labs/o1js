 import { Message } from './multi-thread-lightnet.js';
import { fetchAccount, Mina, PublicKey } from 'o1js';
 import {LilypadState, OffchainStorageLilyPad} from "./LilyPadContract.js";

process.send?.(`Starting fetch state process: ${process.pid}`);
/**
 * Configure lightnet and retrieve signing keys
 * */
const network = Mina.Network({
  mina: 'http://localhost:8080/graphql',
  archive: 'http://127.0.0.1:8282',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(network);
let zkApp: OffchainStorageLilyPad;

await LilypadState.compile();
await OffchainStorageLilyPad.compile();
// notify main process that this process is ready to begin work
process.send?.({ type: 'READY' });

process.on('message', async (msg: Message) => {
  console.log(
    `Fetch state process received message from root: ${JSON.stringify(msg)}`
  );

  /**
   * Compile offchain state zkprogram and contract, deploy contract
   * */
  if (msg.type === 'DEPLOYED') {
    // account = PublicKey.fromBase58(msg.account);
    zkApp = new OffchainStorageLilyPad(PublicKey.fromBase58(msg.address));
    zkApp.offchainState.setContractInstance(zkApp);
    await logState();
     process.send?.({ type: 'INSTANTIATED' });
  } else if (msg.type === 'FETCH_STATE') {
    // todo: expect root mismatch
    await logState();

    // todo: this is erroring on the other test
    await zkApp.offchainState.fetchInternalState();
     await logState();
  }
});

async function logState() {
  await fetchAccount({ publicKey: zkApp.address });
  const root = zkApp.offchainStateCommitments.get().root.toString();
  const currentOccupant = (
    await zkApp.offchainState.fields.currentOccupant.get()
  ).value.toString();
  const message = `offchainState: (currentOccupant => ${currentOccupant}),(root => ${root})`;
  process.send?.(message);
}
