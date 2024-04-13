import { HashStorage } from './hash.js';
import { Mina, PrivateKey, AccountUpdate, Bytes } from 'o1js';

let txn;
let proofsEnabled = true;
// setup local ledger
let Local = Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

if (proofsEnabled) {
  console.log('Proofs enabled');
  await HashStorage.compile();
}

// test accounts that pays all the fees, and puts additional funds into the zkapp
const [feePayer] = Local.testAccounts;

// zkapp account
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new HashStorage(zkAppAddress);

// 0, 1, 2, 3, ..., 31
const hashData = Bytes.from(Array.from({ length: 32 }, (_, i) => i));

console.log('Deploying Hash Example....');
txn = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await zkAppInstance.deploy();
});
await txn.sign([feePayer.key, zkAppPrivateKey]).send();

const initialState =
  Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();

let currentState;
console.log('Initial State', initialState);

console.log(`Updating commitment from ${initialState} using SHA256 ...`);
txn = await Mina.transaction(feePayer, async () => {
  await zkAppInstance.SHA256(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);

console.log(`Updating commitment from ${initialState} using SHA384 ...`);
txn = await Mina.transaction(feePayer, async () => {
  await zkAppInstance.SHA384(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);

console.log(`Updating commitment from ${initialState} using SHA512 ...`);
txn = await Mina.transaction(feePayer, async () => {
  await zkAppInstance.SHA512(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);

console.log(`Updating commitment from ${initialState} using Keccak256...`);
txn = await Mina.transaction(feePayer, async () => {
  await zkAppInstance.Keccak256(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(zkAppAddress).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);
