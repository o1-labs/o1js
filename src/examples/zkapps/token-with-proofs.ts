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

class ContractB extends SmartContract {
  @method async approveSend() {
    this.balance.subInPlace(1_000);
  }
}

class ContractC extends SmartContract {
  @method async approveSend() {
    this.balance.subInPlace(1_000);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [sender, tokenAccount1] = Local.testAccounts;
let initialBalance = 10_000_000;

const [tokenContractAccount, addressC, accountC] = Mina.TestAccount.random(3);

let tokenContract = new Token(tokenContractAccount);
let tokenId = tokenContract.deriveTokenId();

let contractB = new ContractB(accountC, tokenId);
let contractC = new ContractC(addressC, tokenId);
let tx;

console.log('tokenContractAccount', tokenContractAccount.toBase58());
console.log('accountC', accountC.toBase58());
console.log('addressC', addressC.toBase58());
console.log('receiverAddress', tokenAccount1.toBase58());
console.log('feePayer', sender.toBase58());
console.log('-------------------------------------------');

console.log('compile (TokenContract)');
await Token.compile();
console.log('compile (ZkAppB)');
await ContractB.compile();
console.log('compile (ZkAppC)');
await ContractC.compile();

console.log('deploy tokenZkApp');
tx = await Mina.transaction(sender, async () => {
  await tokenContract.deploy();
  AccountUpdate.fundNewAccount(sender).send({
    to: tokenContract.self,
    amount: initialBalance,
  });
});
await tx.sign([sender.key, tokenContractAccount.key]).send();

console.log('deploy zkAppB and zkAppC');
tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender, 2);
  await contractC.deploy();
  await contractB.deploy();
  await tokenContract.approveAccountUpdates([contractC.self, contractB.self]);
});
console.log('deploy zkAppB and zkAppC (proof)');
await tx.prove();
await tx.sign([sender.key, accountC.key, addressC.key]).send();

console.log('mint token to zkAppB');
tx = await Mina.transaction(sender, async () => {
  await tokenContract.mint(accountC);
});
await tx.prove();
await tx.sign([sender.key]).send();

console.log('approve send from zkAppB');
tx = await Mina.transaction(sender, async () => {
  await contractB.approveSend();
  // we call the token contract with the self update
  await tokenContract.transfer(contractB.self, addressC, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([sender.key]).send();

console.log(
  `contractC's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(addressC, tokenId).value.toBigInt()
);

console.log('approve send from zkAppC');
tx = await Mina.transaction(sender, async () => {
  // Pay for tokenAccount1's account creation
  AccountUpdate.fundNewAccount(sender);
  await contractC.approveSend();

  // we call the token contract with the tree
  await tokenContract.transfer(contractC.self, tokenAccount1, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([sender.key]).send();

console.log(
  `tokenAccount1's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
);
