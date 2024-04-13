/*
Description: 

This example described how developers can manipulate the network state of the local blockchain instance.
Changing preconditions might be useful for integration tests, when you want to test your smart contracts behavior in different situations.
For example, you only want your smart contract to initiate a pay out when the `blockchainLength` is at a special height. (lock up period)
*/

import { method, SmartContract, Mina, AccountUpdate, UInt32 } from 'o1js';

const doProofs = false;

class Contract extends SmartContract {
  @method async blockheightEquals(y: UInt32) {
    let length = this.network.blockchainLength.get();
    this.network.blockchainLength.requireEquals(length);

    length.assertEquals(y);
  }
}

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

const [feePayer] = Local.testAccounts;

let contractAccount = Mina.TestAccount.random();

let contract = new Contract(contractAccount);

if (doProofs) {
  console.log('compile');
  await Contract.compile();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await contract.deploy();
});
await tx.sign([feePayer.key, contractAccount.key]).send();

let blockHeight: UInt32 = UInt32.zero;

console.log('assert block height 0');
tx = await Mina.transaction(feePayer, async () => {
  // block height starts at 0
  await contract.blockheightEquals(UInt32.from(blockHeight));
});
await tx.prove();
await tx.sign([feePayer.key]).send();

blockHeight = UInt32.from(500);
Local.setBlockchainLength(blockHeight);

console.log('assert block height 500');
tx = await Mina.transaction(feePayer, async () => {
  await contract.blockheightEquals(UInt32.from(blockHeight));
});
await tx.prove();
await tx.sign([feePayer.key]).send();

blockHeight = UInt32.from(300);
Local.setBlockchainLength(UInt32.from(5));
console.log('invalid block height precondition');
try {
  tx = await Mina.transaction(feePayer, async () => {
    await contract.blockheightEquals(UInt32.from(blockHeight));
  });
  await tx.prove();
  await tx.sign([feePayer.key]).send();
} catch (error) {
  console.log(
    `Expected to fail! block height is ${Local.getNetworkState().blockchainLength.toString()}, but trying to assert ${blockHeight.toString()}`
  );
}
