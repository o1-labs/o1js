import {fork} from 'child_process';

/**
 * Multi process offchain state synchronization test
 *
 * Launch two processes - a settling process and a fetch state process
 * Settling process deploys the contract
 * Offchain state process instantiates the contract at the deployed address
 * Settling process updates the state and calls settle
 * Offchain state process reads the state and gets a root mismatch error
 * Offchain state process calls fetchInternalState, reads the state, and sees the updated state
 * */

export type Message =
  | { type: 'READY' }
  | { type: 'DEPLOY' }
  | { type: 'DEPLOYED'; address: string; account: string }
  | { type: 'INSTANTIATED' }
  | { type: 'UPDATE_STATE' }
  | { type: 'STATE_UPDATED' }
  | { type: 'FETCH_STATE' };

let settlingReady = false;
let fetchStateReady = false;

// Launch the processes
const settlingProcess = fork(
  'dist/node/lib/mina/actions/offchain-contract-tests/settling-process.js'
);
const fetchStateProcess = fork(
  'dist/node/lib/mina/actions/offchain-contract-tests/fetch-state-process.js'
);

// Listen for messages from the child processes
settlingProcess.on('message', (msg: Message) => {
  console.log(
    `Settling process dispatched message to root: ${JSON.stringify(msg)}`
  );

  if (msg.type === 'READY') {
    settlingReady = true;
    // both processes are ready, dispatch DEPLOY to settling process to deploy contract
    if (settlingReady && fetchStateReady) {
      console.log('Both processes are ready. Starting the test...');
      settlingProcess.send({ type: 'DEPLOY' });
    }
  } else if (msg.type === 'DEPLOYED') {
    // settling process finished deploying contract, tell fetchState process to instantiate the contract and offchain state
    fetchStateProcess.send({
      type: 'DEPLOYED',
      address: msg.address,
      account: msg.account,
    });
  } else if (msg.type === 'STATE_UPDATED') {
    // settle state process has updated and settled state, tell fetch state process to try to retrieve the new state which lets us test synchronization
    fetchStateProcess.send({ type: 'FETCH_STATE' });
  }
});
fetchStateProcess.on('message', (msg: Message) => {
  console.log(
    `Fetch state process dispatched message to root: ${JSON.stringify(msg)}`
  );

  if (msg.type === 'READY') {
    fetchStateReady = true;
    // both processes are ready, dispatch DEPLOY to settling process to deploy contract
    if (settlingReady && fetchStateReady) {
      console.log('Both processes are ready. Starting the test...');
      settlingProcess.send({ type: 'DEPLOY' });
    }
  } else if (msg.type === 'INSTANTIATED') {
    // fetch state process instantiated contract, tell settle state process to update the state and settle it
    settlingProcess.send({ type: 'UPDATE_STATE' });
  }
});

function cleanup() {
  settlingProcess.kill();
  fetchStateProcess.kill();
  console.log('Child processes terminated.');
}

function handleProcessEvents(processName: string, processInstance: any) {
  processInstance.on('error', (err: Error) => {
    console.error(`${processName} threw an error: ${err.message}`);
  });

  processInstance.on('exit', (code: number) => {
    if (code !== 0) {
      console.error(`${processName} exited with code ${code}`);
    } else {
      console.log(`${processName} exited successfully.`);
    }
  });
}

handleProcessEvents('Settling process', settlingProcess);
handleProcessEvents('Fetch state process', fetchStateProcess);
