import { AccountUpdate, Field, Mina, PrivateKey } from 'o1js';
import { getProfiler } from '../../utils/profiler.js';
import { HelloWorld, adminPrivateKey } from './hello-world.js';

const HelloWorldProfier = getProfiler('Hello World');
HelloWorldProfier.start('Hello World test flow');

let txn, txn2, txn3, txn4;
// setup local ledger
let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

// test accounts that pays all the fees, and puts additional funds into the contract
const [feePayer1, feePayer2, feePayer3, feePayer4] = Local.testAccounts;

// contract account
const contractAccount = Mina.TestPublicKey.random();
const contract = new HelloWorld(contractAccount);

console.log('Deploying Hello World ....');

txn = await Mina.transaction(feePayer1, async () => {
  AccountUpdate.fundNewAccount(feePayer1);
  await contract.deploy();
});
await txn.sign([feePayer1.key, contractAccount.key]).send();

const initialState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();

let currentState;

console.log('Initial State', initialState);

// update state with value that satisfies preconditions and correct admin private key
console.log(`Updating state from ${initialState} to 4 with Admin Private Key ...`);

txn = await Mina.transaction(feePayer1, async () => {
  await contract.update(Field(4), adminPrivateKey);
});
await txn.prove();
await txn.sign([feePayer1.key]).send();

currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();

if (currentState !== '4') {
  throw Error(`Current state of ${currentState} does not match 4 after calling update with 4`);
}

console.log(`Current state successfully updated to ${currentState}`);

const wrongAdminPrivateKey = PrivateKey.random();
// attempt to update state with value that satisfies preconditions and incorrect admin private key
console.log(
  `Attempting to update state from ${currentState} to 16 with incorrect Admin Private Key ...`
);

let correctlyFails = false;

try {
  txn = await Mina.transaction(feePayer1, async () => {
    await contract.update(Field(16), wrongAdminPrivateKey);
  });
  await txn.prove();
  await txn.sign([feePayer1.key]).send();
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

  txn = await Mina.transaction(feePayer1, async () => {
    await contract.update(Field(30), adminPrivateKey);
  });
  await txn.prove();
  await txn.sign([feePayer1.key]).send();
} catch (err: any) {
  handleError(err, 'assertEquals');
}

if (!correctlyFails) {
  throw Error('We could update the state to a value that violates the precondition');
}

// attempt simultaneous “Update” method invocation by different users
correctlyFails = false;

try {
  console.log(
    `Attempting to simultaneously update the current state of ${currentState} from multiple users ...`
  );

  // expected to fail and current state stays at 4
  txn = await Mina.transaction({ sender: feePayer1, fee: '10' }, async () => {
    await contract.update(Field(256), adminPrivateKey);
  });
  await txn.prove();
  await txn.sign([feePayer1.key]).send();
} catch (err: any) {
  handleError(err, 'assertEquals');
}

if (!correctlyFails) {
  throw Error('We could update the state with input that fails the precondition');
}

// expected to succeed and update state to 16
txn2 = await Mina.transaction({ sender: feePayer2, fee: '2' }, async () => {
  await contract.update(Field(16), adminPrivateKey);
});
await txn2.prove();
await txn2.sign([feePayer2.key]).send();

currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();

if (currentState !== '16') {
  throw Error(`Current state of ${currentState} does not match 16 after calling update with 16`);
}

console.log(`Update successful. Current state is ${currentState}.`);

// expected to succeed and update state to 256
txn3 = await Mina.transaction({ sender: feePayer3, fee: '1' }, async () => {
  await contract.update(Field(256), adminPrivateKey);
});
await txn3.prove();
await txn3.sign([feePayer3.key]).send();

currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();

if (currentState !== '256') {
  throw Error(`Current state of ${currentState} does not match 256 after calling update with 256`);
}

console.log(`Update successful. Current state is ${currentState}.`);

correctlyFails = false;

try {
  // expected to fail and current state remains 256
  txn4 = await Mina.transaction({ sender: feePayer4, fee: '1' }, async () => {
    await contract.update(Field(16), adminPrivateKey);
  });
  await txn4.prove();
  await txn4.sign([feePayer4.key]).send();
} catch (err: any) {
  handleError(err, 'assertEquals');
}

if (!correctlyFails) {
  throw Error('We could update the state with input that fails the precondition');
}

/**
 * Test for expected failure case. Original error thrown if not expected failure case.
 * @param {any} error  The error thrown in the catch block.
 * @param {string} errorMessage  The expected error message.
 */

function handleError(error: any, errorMessage: string) {
  currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();

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
