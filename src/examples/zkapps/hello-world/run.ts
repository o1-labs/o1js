import { AccountUpdate, Field, Mina, PrivateKey } from 'o1js';
import { getProfiler } from '../../utils/profiler.js';
import { HelloWorld, adminPrivateKey } from './hello-world.js';

const HelloWorldProfier = getProfiler('Hello World');
HelloWorldProfier.start('Hello World test flow');

let txn, txn2, txn3, txn4;
// setup local ledger
let Local = Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

// test accounts that pays all the fees, and puts additional funds into the zkapp
const feePayer1 = Local.testAccounts[0];
const feePayer2 = Local.testAccounts[1];
const feePayer3 = Local.testAccounts[2];
const feePayer4 = Local.testAccounts[3];

// zkapp account
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new HelloWorld(zkAppAddress);

console.log('Deploying Hello World ....');

txn = await Mina.transaction(feePayer1.publicKey, async () => {
  AccountUpdate.fundNewAccount(feePayer1.publicKey);
  zkAppInstance.deploy();
});
await txn.sign([feePayer1.privateKey, zkAppPrivateKey]).send();

const initialState =
  Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();

let currentState;

console.log('Initial State', initialState);

// update state with value that satisfies preconditions and correct admin private key
console.log(
  `Updating state from ${initialState} to 4 with Admin Private Key ...`
);

txn = await Mina.transaction(feePayer1.publicKey, async () => {
  zkAppInstance.update(Field(4), adminPrivateKey);
});
await txn.prove();
await txn.sign([feePayer1.privateKey]).send();

currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();

if (currentState !== '4') {
  throw Error(
    `Current state of ${currentState} does not match 4 after calling update with 4`
  );
}

console.log(`Current state successfully updated to ${currentState}`);

const wrongAdminPrivateKey = PrivateKey.random();
// attempt to update state with value that satisfies preconditions and incorrect admin private key
console.log(
  `Attempting to update state from ${currentState} to 16 with incorrect Admin Private Key ...`
);

let correctlyFails = false;

try {
  txn = await Mina.transaction(feePayer1.publicKey, async () => {
    zkAppInstance.update(Field(16), wrongAdminPrivateKey);
  });
  await txn.prove();
  await txn.sign([feePayer1.privateKey]).send();
} catch (err: any) {
  handleError(err, 'Account_delegate_precondition_unsatisfied');
}

if (!correctlyFails) {
  throw Error('We could update the state with the wrong admin key');
}

// attempt to update state with value that fails precondition x.square().assertEquals(squared).
correctlyFails = false;

try {
  console.log(
    `Attempting to update state from ${currentState} to the value that fails precondition of 30 ...`
  );

  txn = await Mina.transaction(feePayer1.publicKey, async () => {
    zkAppInstance.update(Field(30), adminPrivateKey);
  });
  await txn.prove();
  await txn.sign([feePayer1.privateKey]).send();
} catch (err: any) {
  handleError(err, 'assertEquals');
}

if (!correctlyFails) {
  throw Error(
    'We could update the state to a value that violates the precondition'
  );
}

// attempt simultaneous “Update” method invocation by different users
correctlyFails = false;

try {
  console.log(
    `Attempting to simultaneously update the current state of ${currentState} from multiple users ...`
  );

  // expected to fail and current state stays at 4
  txn = await Mina.transaction(
    { sender: feePayer1.publicKey, fee: '10' },
    async () => {
      zkAppInstance.update(Field(256), adminPrivateKey);
    }
  );
  await txn.prove();
  await txn.sign([feePayer1.privateKey]).send();
} catch (err: any) {
  handleError(err, 'assertEquals');
}

if (!correctlyFails) {
  throw Error(
    'We could update the state with input that fails the precondition'
  );
}

// expected to succeed and update state to 16
txn2 = await Mina.transaction(
  { sender: feePayer2.publicKey, fee: '2' },
  async () => {
    zkAppInstance.update(Field(16), adminPrivateKey);
  }
);
await txn2.prove();
await txn2.sign([feePayer2.privateKey]).send();

currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();

if (currentState !== '16') {
  throw Error(
    `Current state of ${currentState} does not match 16 after calling update with 16`
  );
}

console.log(`Update successful. Current state is ${currentState}.`);

// expected to succeed and update state to 256
txn3 = await Mina.transaction(
  { sender: feePayer3.publicKey, fee: '1' },
  async () => {
    zkAppInstance.update(Field(256), adminPrivateKey);
  }
);
await txn3.prove();
await txn3.sign([feePayer3.privateKey]).send();

currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();

if (currentState !== '256') {
  throw Error(
    `Current state of ${currentState} does not match 256 after calling update with 256`
  );
}

console.log(`Update successful. Current state is ${currentState}.`);

correctlyFails = false;

try {
  // expected to fail and current state remains 256
  txn4 = await Mina.transaction(
    { sender: feePayer4.publicKey, fee: '1' },
    async () => {
      zkAppInstance.update(Field(16), adminPrivateKey);
    }
  );
  await txn4.prove();
  await txn4.sign([feePayer4.privateKey]).send();
} catch (err: any) {
  handleError(err, 'assertEquals');
}

if (!correctlyFails) {
  throw Error(
    'We could update the state with input that fails the precondition'
  );
}

/**
 * Test for expected failure case. Original error thrown if not expected failure case.
 * @param {any} error  The error thrown in the catch block.
 * @param {string} errorMessage  The expected error message.
 */

function handleError(error: any, errorMessage: string) {
  currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();

  if (error.message.includes(errorMessage)) {
    correctlyFails = true;
    console.log(
      `Update correctly rejected with failing precondition. Current state is still ${currentState}.`
    );
  } else {
    throw Error(error);
  }
}

HelloWorldProfier.stop().store();
