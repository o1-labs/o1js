import {
  isReady,
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  PublicKey,
  UInt64,
  shutdown,
  Permissions,
} from 'snarkyjs';

await isReady;

class SendMINAExample extends SmartContract {
  init() {
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
  }

  @method sendMINA(receiverAddress: PublicKey, amount: UInt64) {
    this.send({ to: receiverAddress, amount });
  }
}

let Local = Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let account1Key = PrivateKey.random();
let account1Address = account1Key.toPublicKey();

let account2Key = PrivateKey.random();
let account2Address = account2Key.toPublicKey();

let zkapp = new SendMINAExample(zkappAddress);
let initialBalance = 10_000_000_000;
let tx;

console.log('deploy');
tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer).send({
    to: zkappAddress,
    amount: initialBalance,
  });
  zkapp.deploy();
});
await tx.sign([feePayerKey, zkappKey]).send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);

console.log('----------MINA sending (with proof) ----------');
tx = await Local.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.sendMINA(account1Address, UInt64.from(1_000_000));
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);

console.log('----------MINA sending (with createSigned)----------');
tx = await Local.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  let accountUpdate = AccountUpdate.createSigned(zkappAddress);
  accountUpdate.send({ to: account2Address, amount: UInt64.from(1_000_000) });
});
await tx.sign([zkappKey, feePayerKey]).send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);
console.log(
  `account2Address balance: ${Mina.getBalance(account2Address)} MINA`
);

console.log('----------MINA sending (with create)----------');
tx = await Local.transaction(feePayer, () => {
  let accountUpdate = AccountUpdate.create(zkappAddress);
  accountUpdate.requireSignature();
  accountUpdate.send({ to: account2Address, amount: UInt64.from(1_000_000) });
});
await tx.sign([zkappKey, feePayerKey]).send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);
console.log(
  `account2Address balance: ${Mina.getBalance(account2Address)} MINA`
);

shutdown();
