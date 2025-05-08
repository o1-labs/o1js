import { HashStorage } from './hash.js';
import { Mina, AccountUpdate, Bytes } from 'o1js';

let txn;
let proofsEnabled = true;
// setup local ledger
let Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

if (proofsEnabled) {
  console.log('Proofs enabled');
  await HashStorage.compile();
}

// test accounts that pays all the fees, and puts additional funds into the zkapp
const [feePayer] = Local.testAccounts;

// zkapp account
const contractAccount = Mina.TestPublicKey.random();
const contract = new HashStorage(contractAccount);

// 0, 1, 2, 3, ..., 31
const hashData = Bytes.from(Array.from({ length: 32 }, (_, i) => i));

console.log('Deploying Hash Example....');
txn = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await contract.deploy();
});
await txn.sign([feePayer.key, contractAccount.key]).send();

const initialState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();

let currentState;
console.log('Initial State', initialState);

console.log(`Updating commitment from ${initialState} using SHA3-256 ...`);
txn = await Mina.transaction(feePayer, async () => {
  await contract.SHA3_256(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);

console.log(`Updating commitment from ${initialState} using SHA3-384 ...`);
txn = await Mina.transaction(feePayer, async () => {
  await contract.SHA3_384(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);

console.log(`Updating commitment from ${initialState} using SHA3-512 ...`);
txn = await Mina.transaction(feePayer, async () => {
  await contract.SHA3_512(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);

console.log(`Updating commitment from ${initialState} using Keccak256...`);
txn = await Mina.transaction(feePayer, async () => {
  await contract.Keccak256(hashData);
});
await txn.prove();
await txn.sign([feePayer.key]).send();
currentState = Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
console.log(`Current state successfully updated to ${currentState}`);
