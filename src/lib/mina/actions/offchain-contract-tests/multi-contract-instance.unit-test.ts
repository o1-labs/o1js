import {
  SmartContract,
  method,
  state,
  PublicKey,
  UInt64,
} from '../../../../index.js';
import * as Mina from '../../mina.js';
import assert from 'assert';
import { ExampleContract } from './ExampleContract.js';
import { settle, transfer } from './utils.js';

const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

const [
  sender,
  receiver1,
  receiver2,
  receiver3,
  contractAccountA,
  contractAccountB,
] = Local.testAccounts;

const contractA = new ExampleContract(contractAccountA);
const contractB = new ExampleContract(contractAccountB);
contractA.offchainState.setContractInstance(contractA);
contractB.offchainState.setContractInstance(contractB);

console.time('deploy contract');
const deployTx = Mina.transaction(sender, async () => {
  await contractA.deploy();
  await contractB.deploy();
});
await deployTx.sign([sender.key, contractAccountA.key, contractAccountB.key]);
await deployTx.prove();
await deployTx.send().wait();
console.timeEnd('deploy contract');

console.time('create accounts');
const accountCreationTx = Mina.transaction(sender, async () => {
  await contractA.createAccount(sender, UInt64.from(1000));
  await contractA.createAccount(receiver2, UInt64.from(1000));
  await contractB.createAccount(sender, UInt64.from(1500));
});
await accountCreationTx.sign([sender.key]);
await accountCreationTx.prove();
await accountCreationTx.send().wait();
console.timeEnd('create accounts');

console.time('settle');
await settle(contractA, sender);
await settle(contractB, sender);
console.timeEnd('settle');

assert((await contractA.getSupply()).toBigInt() == 1000n);
assert((await contractB.getSupply()).toBigInt() == 1500n);

console.log('Initial balances:');
console.log(
  'Contract A, Sender: ',
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract B, Sender: ',
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
assert((await contractA.getBalance(sender)).toBigInt() == 1000n);
assert((await contractB.getBalance(sender)).toBigInt() == 1500n);

console.time('transfer');
await transfer(contractA, sender, receiver1, UInt64.from(100));
await settle(contractA, sender);
await transfer(contractA, sender, receiver2, UInt64.from(200));
await settle(contractA, sender);
await transfer(contractA, sender, receiver3, UInt64.from(300));
await transfer(contractB, sender, receiver1, UInt64.from(200));
console.timeEnd('transfer');

console.time('settle');
await settle(contractA, sender);
await settle(contractB, sender);
console.timeEnd('settle');

console.log('After Settlement balances:');
console.log(
  'Contract A, Sender: ',
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract A, Receiver 1: ',
  (
    await contractA.offchainState.fields.accounts.get(receiver1)
  ).value.toBigInt()
);
console.log(
  'Contract A, Receiver 2: ',
  (
    await contractA.offchainState.fields.accounts.get(receiver2)
  ).value.toBigInt()
);
console.log(
  'Contract A, Receiver 3: ',
  (
    await contractA.offchainState.fields.accounts.get(receiver3)
  ).value.toBigInt()
);

console.log(
  'Contract B, Sender: ',
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract B, Receiver 1: ',
  (
    await contractB.offchainState.fields.accounts.get(receiver1)
  ).value.toBigInt()
);
assert((await contractA.getBalance(sender)).toBigInt() == 400n);
assert((await contractA.getBalance(receiver1)).toBigInt() == 100n);
assert((await contractA.getBalance(receiver2)).toBigInt() == 200n);
assert((await contractA.getBalance(receiver3)).toBigInt() == 300n);

assert((await contractB.getBalance(sender)).toBigInt() == 1300n);
assert((await contractB.getBalance(receiver1)).toBigInt() == 200n);

console.time('advance contract A state but leave B unsettled');
await transfer(contractA, sender, receiver1, UInt64.from(150)); // 250, 250, 200, 300
await transfer(contractA, receiver2, receiver3, UInt64.from(20)); // 250, 250, 180, 320
await settle(contractA, sender);

await transfer(contractA, receiver1, receiver2, UInt64.from(50)); // 250, 200, 230, 320
await transfer(contractA, receiver3, sender, UInt64.from(50)); // 300, 200, 230, 270
await settle(contractA, sender);

await transfer(contractB, sender, receiver1, UInt64.from(5));
console.timeEnd('advance contract A state but leave B unsettled');

assert((await contractA.getSupply()).toBigInt() == 1000n);
assert((await contractB.getSupply()).toBigInt() == 1500n);

console.log('Final balances:');
console.log(
  'Contract A, Sender: ',
  (await contractA.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract A, Receiver 1: ',
  (
    await contractA.offchainState.fields.accounts.get(receiver1)
  ).value.toBigInt()
);
console.log(
  'Contract A, Receiver 2: ',
  (
    await contractA.offchainState.fields.accounts.get(receiver2)
  ).value.toBigInt()
);
console.log(
  'Contract A, Receiver 3: ',
  (
    await contractA.offchainState.fields.accounts.get(receiver3)
  ).value.toBigInt()
);

console.log(
  'Contract B, Sender: ',
  (await contractB.offchainState.fields.accounts.get(sender)).value.toBigInt()
);
console.log(
  'Contract B, Receiver: ',
  (
    await contractB.offchainState.fields.accounts.get(receiver1)
  ).value.toBigInt()
);

assert((await contractA.getBalance(sender)).toBigInt() == 300n);
assert((await contractA.getBalance(receiver1)).toBigInt() == 200n);
assert((await contractA.getBalance(receiver2)).toBigInt() == 230n);
assert((await contractA.getBalance(receiver3)).toBigInt() == 270n);

// The 5 token transfer has not been settled
assert((await contractB.getBalance(sender)).toBigInt() == 1300n);
assert((await contractB.getBalance(receiver1)).toBigInt() == 200n);
