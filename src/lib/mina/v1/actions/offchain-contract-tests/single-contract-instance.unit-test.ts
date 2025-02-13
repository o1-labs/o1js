import { UInt64 } from '../../../../../index.js';
import * as Mina from '../../mina.js';
import assert from 'assert';

import { ExampleContract, offchainState as exampleOffchainState } from './ExampleContract.js';
import { settle, transfer } from './utils.js';

const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

const [sender, receiver, contractAccount] = Local.testAccounts;

const contract = new ExampleContract(contractAccount);
contract.offchainState.setContractInstance(contract);

console.time('compile offchain state program');
await exampleOffchainState.compile();
console.timeEnd('compile offchain state program');

console.time('compile contract');
await ExampleContract.compile();
console.timeEnd('compile contract');

console.time('deploy contract');
const deployTx = Mina.transaction(sender, async () => {
  await contract.deploy();
});
await deployTx.sign([sender.key, contractAccount.key]);
await deployTx.prove();
await deployTx.send().wait();
console.timeEnd('deploy contract');

console.time('create accounts');
const accountCreationTx = Mina.transaction(sender, async () => {
  await contract.createAccount(sender, UInt64.from(1000));
});
await accountCreationTx.sign([sender.key]);
await accountCreationTx.prove();
await accountCreationTx.send().wait();
console.timeEnd('create accounts');

console.time('settle');
await settle(contract, sender);
console.timeEnd('settle');

assert((await contract.getSupply()).toBigInt() == 1000n);
assert((await contract.getBalance(sender)).toBigInt() == 1000n);

console.time('transfer');
await transfer(contract, sender, receiver, UInt64.from(100));
console.timeEnd('transfer');

console.time('settle');
await settle(contract, sender);
console.timeEnd('settle');

assert((await contract.getSupply()).toBigInt() == 1000n);
assert((await contract.getBalance(sender)).toBigInt() == 900n);
assert((await contract.getBalance(receiver)).toBigInt() == 100n);
