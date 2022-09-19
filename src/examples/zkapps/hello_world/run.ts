import { HelloWorld, adminPrivateKey } from './hello_world.js';
import { Mina, PrivateKey, AccountUpdate, Field } from 'snarkyjs';

let txn, txn2, txn3, txn4;
// setup local ledger
let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// test accounts that pays all the fees, and puts additional funds into the zkapp
const feePayer1 = Local.testAccounts[0].privateKey;
const feePayer2 = Local.testAccounts[1].privateKey;
const feePayer3 = Local.testAccounts[2].privateKey;
const feePayer4 = Local.testAccounts[3].privateKey;

// zkapp account
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new HelloWorld(zkAppAddress);

console.log('Deploying Hello World ....');

txn = await Mina.transaction(feePayer1, () => {
  AccountUpdate.fundNewAccount(feePayer1);
  zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
});

txn.send();

const initialState = Mina.getAccount(zkAppAddress).appState?.[0].toString();

let currentState;

console.log('Initial State', initialState);

// update state with value that satisfies preconditions and correct admin private key
console.log(
  `Updating state from ${initialState} to 4 with Admin Private Key ...`
);

txn = await Mina.transaction(feePayer1, () => {
  zkAppInstance.update(Field(4), adminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

txn.send();

currentState = Mina.getAccount(zkAppAddress).appState?.[0].toString();

if (currentState !== '4') {
  throw Error(
    `Current state of ${currentState} does not match 4 after calling update with 4`
  );
}

console.log(`Current state succesfully updated to ${currentState}`);

const wrongAdminPrivateKey = PrivateKey.random();
// attempt to update state with value that satisfies preconditions and incorrect admin private key
console.log(
  `Attempting to update state from ${currentState} to 16 with incorrect Admin Private Key ...`
);

let correctlyFails = false;

try {
  txn = await Mina.transaction(feePayer1, () => {
    zkAppInstance.update(Field(16), wrongAdminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn.send();
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

  txn = await Mina.transaction(feePayer1, () => {
    zkAppInstance.update(Field(30), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn.send();
} catch (err: any) {
  handleError(err, 'assert_equal');
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
  txn = await Mina.transaction({ feePayerKey: feePayer1, fee: '10' }, () => {
    zkAppInstance.update(Field(256), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn.send();
} catch (err: any) {
  handleError(err, 'assert_equal');
}

if (!correctlyFails) {
  throw Error(
    'We could update the state with input that fails the precondition'
  );
}

// expected to succeed and update state to 16
txn2 = await Mina.transaction({ feePayerKey: feePayer2, fee: '2' }, () => {
  zkAppInstance.update(Field(16), adminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

txn2.send();

currentState = Mina.getAccount(zkAppAddress).appState?.[0].toString();

if (currentState !== '16') {
  throw Error(
    `Current state of ${currentState} does not match 16 after calling update with 16`
  );
}

console.log(`Update successful. Current state is ${currentState}.`);

// expected to succeed and update state to 256
txn3 = await Mina.transaction({ feePayerKey: feePayer3, fee: '1' }, () => {
  zkAppInstance.update(Field(256), adminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

txn3.send();

currentState = Mina.getAccount(zkAppAddress).appState?.[0].toString();

if (currentState !== '256') {
  throw Error(
    `Current state of ${currentState} does not match 256 after calling update with 256`
  );
}

console.log(`Update successful. Current state is ${currentState}.`);

correctlyFails = false;

try {
  // expected to fail and current state remains 256
  txn4 = await Mina.transaction({ feePayerKey: feePayer4, fee: '1' }, () => {
    zkAppInstance.update(Field(16), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn4.send();
} catch (err: any) {
  handleError(err, 'assert_equal');
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
  currentState = Mina.getAccount(zkAppAddress).appState?.[0].toString();

  if (error.message.includes(errorMessage)) {
    correctlyFails = true;
    console.log(
      `Update correctly rejected with failing precondition. Current state is still ${currentState}.`
    );
  } else {
    throw Error(error);
  }
}
