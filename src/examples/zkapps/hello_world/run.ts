import { HelloWorld } from './hello_world';
import { isReady, Mina, PrivateKey, Party } from '../../../../dist/server';

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
