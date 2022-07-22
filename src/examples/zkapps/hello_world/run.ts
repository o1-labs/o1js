import { HelloWorld, adminPrivateKey } from './hello_world';
import { isReady, Mina, PrivateKey, Party, Field, shutdown } from 'snarkyjs';

// setup local ledger
let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
const deployerAccount = Local.testAccounts[0].privateKey;

// zkapp account
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new HelloWorld(zkAppAddress);

console.log('Deploying Hello World ....');
let txn = await Mina.transaction(deployerAccount, () => {
  Party.fundNewAccount(deployerAccount);
  zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
});

try {
  txn.send().wait();
} catch (err: any) {
  shutdown();
  console.error('Deployment failed with error', err.message);
}

const initialState = zkAppInstance.x.get().toString();
let currentState;

console.log(`Updating state from ${initialState} to 9 with Admin Private Key`);

txn = await Mina.transaction(deployerAccount, () => {
  zkAppInstance.update(Field(9), adminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

try {
  txn.send().wait();
  currentState = zkAppInstance.x.get().toString();
  if (currentState !== '9') {
    console.error(
      `Current state of ${currentState} does not match 9 after calling update with 9`
    );
  } else {
    console.log(`Current state succesfully updated to ${currentState}`);
  }
} catch (err: any) {
  console.error(`Updating from ${initialState} to 9 failed with error`, err);
}

const wrongAdminPrivateKey = PrivateKey.random();

console.log(
  `Attempting to update state from ${currentState} to 81 with incorrect Admin Private Key`
);
txn = await Mina.transaction(deployerAccount, () => {
  zkAppInstance.update(Field(81), wrongAdminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

try {
  txn.send().wait();
  currentState = zkAppInstance.x.get().toString();
  if (currentState !== '9') {
    console.error(
      `State was updated from 9 to ${currentState} does not match 9 after calling update with 9`
    );
  }
} catch (err: any) {
  console.log(
    `State correctly was not updated with wrong Admin Private Key. Current state is still ${currentState}`
  );
}
