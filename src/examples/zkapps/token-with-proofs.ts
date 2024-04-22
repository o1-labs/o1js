import {
  method,
  Mina,
  AccountUpdate,
  SmartContract,
  PublicKey,
  TokenId,
  TokenContract,
  AccountUpdateForest,
} from 'o1js';

class Token extends TokenContract {
  @method
  async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method async mint(receiverAddress: PublicKey) {
    let amount = 1_000_000;
    this.internal.mint({ address: receiverAddress, amount });
  }

  @method async burn(receiverAddress: PublicKey) {
    let amount = 1_000;
    this.internal.burn({ address: receiverAddress, amount });
  }
}

class B extends SmartContract {
  @method async approveSend() {
    this.balance.subInPlace(1_000);
  }
}

class C extends SmartContract {
  @method async approveSend() {
    this.balance.subInPlace(1_000);
  }
}

let Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [sender, tokenAccount1] = Local.testAccounts;
let initialBalance = 10_000_000;

const [tokenAccount, cAccount, bAccount] = Mina.TestPublicKey.random(3);

let token = new Token(tokenAccount);
let tokenId = token.deriveTokenId();

let b = new B(bAccount, tokenId);
let c = new C(cAccount, tokenId);
let tx;

console.log('tokenContractAccount', tokenAccount.toBase58());
console.log('accountC', bAccount.toBase58());
console.log('addressC', cAccount.toBase58());
console.log('receiverAddress', tokenAccount1.toBase58());
console.log('feePayer', sender.toBase58());
console.log('-------------------------------------------');

await Token.compile();
await B.compile();
await C.compile();

console.log('deploy tokenZkApp');
tx = await Mina.transaction(sender, async () => {
  await token.deploy();
  AccountUpdate.fundNewAccount(sender).send({
    to: token.self,
    amount: initialBalance,
  });
});
await tx.sign([sender.key, tokenAccount.key]).send();

console.log('deploy zkAppB and zkAppC');
tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender, 2);
  await c.deploy();
  await b.deploy();
  await token.approveAccountUpdates([c.self, b.self]);
});
console.log('deploy zkAppB and zkAppC (proof)');
await tx.prove();
await tx.sign([sender.key, bAccount.key, cAccount.key]).send();

console.log('mint token to zkAppB');
tx = await Mina.transaction(sender, async () => {
  await token.mint(bAccount);
});
await tx.prove();
await tx.sign([sender.key]).send();

console.log('approve send from zkAppB');
tx = await Mina.transaction(sender, async () => {
  await b.approveSend();
  // we call the token contract with the self update
  await token.transfer(b.self, cAccount, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([sender.key]).send();

console.log(
  `contractC's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(cAccount, tokenId).value.toBigInt()
);

console.log('approve send from zkAppC');
tx = await Mina.transaction(sender, async () => {
  // Pay for tokenAccount1's account creation
  AccountUpdate.fundNewAccount(sender);
  await c.approveSend();

  // we call the token contract with the tree
  await token.transfer(c.self, tokenAccount1, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([sender.key]).send();

console.log(
  `tokenAccount1's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
);
