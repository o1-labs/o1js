import { method, Mina, AccountUpdate, SmartContract, UInt64, Permissions } from 'o1js';

class PaymentContainer extends SmartContract {
  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
  }

  @method async withdraw(amount: UInt64) {
    // unconstrained because we don't care where the user wants to withdraw to
    let to = this.sender.getUnconstrained();
    this.send({ to, amount });
  }

  @method async deposit(amount: UInt64) {
    let sender = this.sender.getUnconstrained(); // unconstrained because we're already requiring a signature in the next line
    let senderUpdate = AccountUpdate.createSigned(sender);
    senderUpdate.send({ to: this, amount });
  }
}

let proofsEnabled = false;
if (proofsEnabled) await PaymentContainer.compile();

let Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
const [feePayer] = Local.testAccounts;
const [contractAccount, account1, account2] = Mina.TestPublicKey.random(3);

function printBalances() {
  console.log(`zkApp balance:    ${Mina.getBalance(contractAccount).div(1e9)} MINA`);
  console.log(`account1 balance: ${Mina.getBalance(account1).div(1e9)} MINA`);
  console.log(`account2 balance: ${Mina.getBalance(account2).div(1e9)} MINA\n`);
}

let zkapp = new PaymentContainer(contractAccount);
let tx;

console.log('deploy and fund user accounts');
tx = await Mina.transaction(feePayer, async () => {
  let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer, 3);
  feePayerUpdate.send({ to: account1, amount: 2e9 });
  feePayerUpdate.send({ to: account2, amount: 0 }); // just touch account #2, so it's created
  await zkapp.deploy();
});
await tx.sign([feePayer.key, contractAccount.key]).send();
printBalances();

console.log('---------- deposit MINA into zkApp (with proof) ----------');
tx = await Mina.transaction(account1, async () => {
  await zkapp.deposit(UInt64.from(1e9));
});
await tx.prove();
await tx.sign([account1.key]).send();
printBalances();

console.log('---------- send MINA from zkApp (with proof) ----------');
tx = await Mina.transaction(account1, async () => {
  await zkapp.withdraw(UInt64.from(1e9));
});
await tx.prove();
await tx.sign([account1.key]).send();
printBalances();

console.log('---------- send MINA between accounts (with signature) ----------');
tx = await Mina.transaction(account1, async () => {
  let account1Update = AccountUpdate.createSigned(account1);
  account1Update.send({ to: account2, amount: 1e9 });
});
await tx.sign([account1.key]).send();
printBalances();
