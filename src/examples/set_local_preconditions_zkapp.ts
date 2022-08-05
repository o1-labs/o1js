/*
Description: 

This example described how developers can manipulate the network state of the local blockchain instance.
Changing preconditions might be useful for integration tests, when you want to test your smart contracts behavior in different situations.
For example, you only want your smart contract to initiate a pay out when the `blockchainLength` is at a special height. (lock up period)
*/

import {
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Permissions,
  DeployArgs,
  UInt32,
} from 'snarkyjs';

const doProofs = false;

await isReady;

class SimpleZkapp extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
  }

  @method blockheightEquals(y: UInt32) {
    let length = this.network.blockchainLength.get();
    this.network.blockchainLength.assertEquals(length);

    length.assertEquals(y);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let initialBalance = 10_000_000_000;
let zkapp = new SimpleZkapp(zkappAddress);

if (doProofs) {
  console.log('compile');
  await SimpleZkapp.compile(zkappAddress);
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer, { initialBalance });
  zkapp.deploy({ zkappKey });
});
tx.send();

let blockHeight = 0;

console.log('assert block height 0');
tx = await Mina.transaction(feePayer, () => {
  // block height starts at 0
  zkapp.blockheightEquals(UInt32.from(blockHeight));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

blockHeight = 500;
Local.setBlockHeight(blockHeight);

console.log('assert block height 500');
tx = await Mina.transaction(feePayer, () => {
  zkapp.blockheightEquals(UInt32.from(blockHeight));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

blockHeight = 300;
Local.setBlockHeight(5);
console.log('invalid block height precondition');
try {
  tx = await Mina.transaction(feePayer, () => {
    zkapp.blockheightEquals(UInt32.from(blockHeight));
    if (!doProofs) zkapp.sign(zkappKey);
  });
  if (doProofs) await tx.prove();
  tx.send();
} catch (error) {
  console.log(
    `Expected to fail! block height is ${Local.getNetworkState().blockchainLength.toString()}, but trying to assert ${blockHeight}`
  );
  console.log(error);
}
