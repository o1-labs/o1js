import { HelloWorld, adminPrivateKey } from './hello_world';
import { isReady, Mina, PrivateKey, Party, Field, shutdown } from 'snarkyjs';
import { toJson } from 'dist/server/snarky/parties-leaves';

let txn2, txn3, txn4;
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
let txn = await Mina.transaction(feePayer1, () => {
  Party.fundNewAccount(feePayer1);
  zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
});

try {
  txn.send().wait();
} catch (err: any) {
  throw new Error(`Deployment failed with error ${err.message}`);
}

const initialState = await Mina.getAccount(
  zkAppAddress
).zkapp?.appState[0].toString();
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

try {
  txn.send().wait();
  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  if (currentState !== '4') {
    throw new Error(
      `Current state of ${currentState} does not match 4 after calling update with 4`
    );
  } else {
    console.log(`Current state succesfully updated to ${currentState}`);
  }
} catch (err: any) {
  throw new Error(`
    Updating from ${initialState} to 4 failed with error ${err.message}`);
}

const wrongAdminPrivateKey = PrivateKey.random();
// attempt to update state with value that satisfies preconditions and incorrect admin private key
console.log(
  `Attempting to update state from ${currentState} to 16 with incorrect Admin Private Key ...`
);
txn = await Mina.transaction(feePayer1, () => {
  zkAppInstance.update(Field(16), wrongAdminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

try {
  txn.send().wait();
  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  if (currentState !== '16') {
    throw new Error(
      `The current state of ${currentState} does not match 16 after calling update with 16`
    );
  }
} catch (err: any) {
  console.log(
    `State correctly was not updated with wrong Admin Private Key. Current state is still ${currentState}`
  );
}

// attempt to update state with value that fails precondition x.square().assertEquals(squared).
try {
  console.log(
    `Attempting to update state from ${currentState} to the value that fails precondition of 30 ...`
  );

  txn = await Mina.transaction(feePayer1, () => {
    zkAppInstance.update(Field(30), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn.send().wait();

  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  if (currentState !== '4') {
    throw new Error(
      `State was updated from 4 to ${currentState} which fails the precondition x.square().assertEquals(squared);`
    );
  }
} catch (err: any) {
  console.log(
    `State correctly was not updated when fails the precondition x.square().assertEquals(squared). Current state is still ${currentState}`
  );
}

// attempt simultaneous “Update” method invocation by different users
try {
  console.log(
    `Attempting to simultaneous update the current state of ${currentState} from multiple users ...`
  );

  // expected to fail and current state stays at 4
  txn = await Mina.transaction({ feePayerKey: feePayer1, fee: '10' }, () => {
    zkAppInstance.update(Field(256), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn.send();

  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  if (currentState !== '4') {
    throw new Error(
      `State was updated from 4 to ${currentState} which fails the precondition x.square().assertEquals(squared);`
    );
  }
} catch (err: any) {
  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  console.log(
    `Update correctly rejected with error ${err.message}  current state is still ${currentState}.`
  );
}

try {
  // expected to succeed and update state to 16
  txn2 = await Mina.transaction({ feePayerKey: feePayer1, fee: '2' }, () => {
    zkAppInstance.update(Field(16), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn2.send();

  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  console.log(`Update successful. Current state is ${currentState}.`);
} catch (err: any) {
  throw new Error(
    `State was updated to ${currentState} with error ${err.message}`
  );
}

try {
  // expected to succeed and update state to 256
  txn3 = await Mina.transaction({ feePayerKey: feePayer1, fee: '1' }, () => {
    zkAppInstance.update(Field(256), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn3.send();
  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();

  console.log(`Update successful. Current state is ${currentState}.`);
} catch (err: any) {
  throw new Error(
    `State was updated to ${currentState} with error ${err.message}`
  );
}

try {
  // expected to fail and current state remains 256
  txn4 = await Mina.transaction({ feePayerKey: feePayer1, fee: '1' }, () => {
    zkAppInstance.update(Field(16), adminPrivateKey);
    zkAppInstance.sign(zkAppPrivateKey);
  });

  txn4.send().wait();
  throw new Error(`State was incorrectly updated to ${currentState}`);
} catch (err: any) {
  currentState = await Mina.getAccount(
    zkAppAddress
  ).zkapp?.appState[0].toString();
  console.log(
    `Update correctly rejected with error ${err.message}  current state is still ${currentState}.`
  );
}
