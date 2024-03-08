import {
  isReady,
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  UInt64,
  shutdown,
  Permissions,
} from 'o1js';

await isReady;

class SendMINAExample extends SmartContract {
  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
  }

  @method withdraw(amount: UInt64) {
    this.send({ to: this.sender, amount });
  }

  @method deposit(amount: UInt64) {
    let senderUpdate = AccountUpdate.createSigned(this.sender);
    senderUpdate.send({ to: this, amount });
  }
}

let proofsEnabled = false;
if (proofsEnabled) await SendMINAExample.compile();

let Local = Mina.LocalBlockchain({ proofsEnabled });
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

function printBalances() {
  console.log(
    `zkApp balance:    ${Mina.getBalance(zkappAddress).div(1e9)} MINA`
  );
  console.log(
    `account1 balance: ${Mina.getBalance(account1Address).div(1e9)} MINA`
  );
  console.log(
    `account2 balance: ${Mina.getBalance(account2Address).div(1e9)} MINA\n`
  );
}

let zkapp = new SendMINAExample(zkappAddress);
let tx;

console.log('deploy and fund user accounts');
tx = await Mina.transaction(feePayer, async () => {
  let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer, 3);
  feePayerUpdate.send({ to: account1Address, amount: 2e9 });
  feePayerUpdate.send({ to: account2Address, amount: 0 }); // just touch account #2, so it's created
  zkapp.deploy();
});
await tx.sign([feePayerKey, zkappKey]).send();
printBalances();

console.log('---------- deposit MINA into zkApp (with proof) ----------');
tx = await Mina.transaction(account1Address, async () => {
  zkapp.deposit(UInt64.from(1e9));
});
await tx.prove();
await tx.sign([account1Key]).send();
printBalances();

console.log('---------- send MINA from zkApp (with proof) ----------');
tx = await Mina.transaction(account1Address, async () => {
  zkapp.withdraw(UInt64.from(1e9));
});
await tx.prove();
await tx.sign([account1Key]).send();
printBalances();

console.log(
  '---------- send MINA between accounts (with signature) ----------'
);
tx = await Mina.transaction(account1Address, async () => {
  let account1Update = AccountUpdate.createSigned(account1Address);
  account1Update.send({ to: account2Address, amount: 1e9 });
});
await tx.sign([account1Key]).send();
printBalances();

shutdown();
