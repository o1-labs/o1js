import { HelloWorld, adminPrivateKey } from './hello_world';
import {
  isReady,
  Mina,
  PrivateKey,
  Party,
  Field,
} from '../../../../dist/server';

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
  console.log('Deployment failed with error', err.message);
}

const initialState = zkAppInstance.x.get();

txn = await Mina.transaction(deployerAccount, () => {
  zkAppInstance.update(Field(9), adminPrivateKey);
  zkAppInstance.sign(zkAppPrivateKey);
});

try {
  txn.send().wait();
} catch (err: any) {
  console.log(
    `Updating from ${initialState} to 9 failed with error`,
    err.message
  );
}
