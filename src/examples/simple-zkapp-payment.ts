import {
  isReady,
  method,
  Mina,
  Party,
  PrivateKey,
  SmartContract,
  PublicKey,
  UInt64,
  shutdown,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

await isReady;

class SendMINAExample extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
  }

  @method sendMINA(receiverAddress: PublicKey, amount: UInt64) {
    this.send({
      to: receiverAddress,
      amount,
    });
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

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
  Party.fundNewAccount(feePayer, { initialBalance });
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);

console.log('----------MINA sending----------');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  zkapp.sendMINA(account1Address, UInt64.from(1_000_000));
  zkapp.sign(zkappKey);
});
tx.send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);

console.log('----------MINA sending (with signed)----------');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  let party = Party.createSigned(zkappKey);
  party.send({ to: account2Address, amount: UInt64.from(1_000_000) });
  zkapp.sign(zkappKey);
  zkapp.account.nonce.assertEquals(zkapp.account.nonce.get().add(1));
});
tx.send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);
console.log(
  `account2Address balance: ${Mina.getBalance(account2Address)} MINA`
);

console.log('----------MINA sending (with unsigned)----------');
tx = await Local.transaction(feePayer, () => {
  let party = Party.createUnsigned(zkappAddress);
  party.signInPlace(zkappKey);
  party.send({ to: account2Address, amount: UInt64.from(1_000_000) });
  zkapp.sign(zkappKey);
  zkapp.account.nonce.assertEquals(zkapp.account.nonce.get().add(1));
});
tx.send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);
console.log(
  `account2Address balance: ${Mina.getBalance(account2Address)} MINA`
);

console.log('----------MINA sending (with proof)----------');
tx = await Local.transaction(feePayer, () => {
  let party = Party.createSigned(zkappKey);
  party.send({ to: account2Address, amount: UInt64.from(1_000_000) });
  zkapp.account.nonce.assertEquals(zkapp.account.nonce.get().add(1));
});
await tx.prove();
tx.send();

console.log(`zkApp balance: ${Mina.getBalance(zkappAddress)} MINA`);
console.log(
  `account1Address balance: ${Mina.getBalance(account1Address)} MINA`
);
console.log(
  `account2Address balance: ${Mina.getBalance(account2Address)} MINA`
);

shutdown();
