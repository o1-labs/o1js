import {
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  PublicKey,
  UInt64,
  Int64,
  Permissions,
  DeployArgs,
  VerificationKey,
  TokenId,
  AccountUpdateTree,
  assert,
} from 'o1js';

class TokenContract extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.from(initialBalance));
  }

  @method tokenDeploy(deployer: PrivateKey, verificationKey: VerificationKey) {
    let address = deployer.toPublicKey();
    let deployUpdate = AccountUpdate.create(address, this.token.id);
    deployUpdate.account.permissions.set(Permissions.default());
    deployUpdate.account.verificationKey.set(verificationKey);
    deployUpdate.sign(deployer);
  }

  @method mint(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000_000);
    this.token.mint({ address: receiverAddress, amount });
  }

  @method burn(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000);
    this.token.burn({ address: receiverAddress, amount });
  }

  @method sendTokens(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    tree: AccountUpdateTree
  ) {
    // TODO use token contract methods for approve
    this.approve(tree);
    assert(tree.children.isEmpty());
    let senderAccountUpdate = tree.accountUpdate.unhash();
    let amount = UInt64.from(1_000);
    let negativeAmount = Int64.fromObject(
      senderAccountUpdate.body.balanceChange
    );
    negativeAmount.assertEquals(Int64.from(amount).neg());
    let tokenId = this.token.id;
    senderAccountUpdate.body.tokenId.assertEquals(tokenId);
    senderAccountUpdate.body.publicKey.assertEquals(senderAddress);
    let receiverAccountUpdate = AccountUpdate.create(receiverAddress, tokenId);
    receiverAccountUpdate.balance.addInPlace(amount);
  }
}

class ZkAppB extends SmartContract {
  @method approveSend() {
    let amount = UInt64.from(1_000);
    this.balance.subInPlace(amount);
  }
}

class ZkAppC extends SmartContract {
  @method approveSend() {
    let amount = UInt64.from(1_000);
    this.balance.subInPlace(amount);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [
  { publicKey: sender, privateKey: senderKey },
  { publicKey: tokenAccount1 },
] = Local.testAccounts;
let initialBalance = 10_000_000;

let tokenZkAppKey = PrivateKey.random();
let tokenZkAppAddress = tokenZkAppKey.toPublicKey();

let zkAppCKey = PrivateKey.random();
let zkAppCAddress = zkAppCKey.toPublicKey();

let zkAppBKey = PrivateKey.random();
let zkAppBAddress = zkAppBKey.toPublicKey();

let tokenZkApp = new TokenContract(tokenZkAppAddress);
let tokenId = tokenZkApp.token.id;

let zkAppB = new ZkAppB(zkAppBAddress, tokenId);
let zkAppC = new ZkAppC(zkAppCAddress, tokenId);
let tx;

console.log('tokenZkAppAddress', tokenZkAppAddress.toBase58());
console.log('zkAppB', zkAppBAddress.toBase58());
console.log('zkAppC', zkAppCAddress.toBase58());
console.log('receiverAddress', tokenAccount1.toBase58());
console.log('feePayer', sender.toBase58());
console.log('-------------------------------------------');

console.log('compile (TokenContract)');
await TokenContract.compile();
console.log('compile (ZkAppB)');
await ZkAppB.compile();
console.log('compile (ZkAppC)');
await ZkAppC.compile();

console.log('deploy tokenZkApp');
tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender).balance.subInPlace(initialBalance);
  tokenZkApp.deploy({ zkappKey: tokenZkAppKey });
});
await tx.sign([senderKey]).send();

console.log('deploy zkAppB');
tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  tokenZkApp.tokenDeploy(zkAppBKey, ZkAppB._verificationKey!);
});
console.log('deploy zkAppB (proof)');
await tx.prove();
await tx.sign([senderKey]).send();

console.log('deploy zkAppC');
tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  tokenZkApp.tokenDeploy(zkAppCKey, ZkAppC._verificationKey!);
});
console.log('deploy zkAppC (proof)');
await tx.prove();
await tx.sign([senderKey]).send();

console.log('mint token to zkAppB');
tx = await Mina.transaction(sender, () => {
  tokenZkApp.mint(zkAppBAddress);
});
await tx.prove();
await tx.sign([senderKey]).send();

console.log('approve send from zkAppB');
tx = await Mina.transaction(sender, () => {
  zkAppB.approveSend();
  let approveSendingTree = zkAppB.self.extractTree();

  // we call the token contract with the tree
  tokenZkApp.sendTokens(zkAppBAddress, zkAppCAddress, approveSendingTree);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([senderKey]).send();

console.log(
  `zkAppC's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
);

console.log('approve send from zkAppC');
tx = await Mina.transaction(sender, () => {
  // Pay for tokenAccount1's account creation
  AccountUpdate.fundNewAccount(sender);
  zkAppC.approveSend();
  let approveSendingTree = zkAppC.self.extractTree();

  // we call the token contract with the tree
  tokenZkApp.sendTokens(zkAppCAddress, tokenAccount1, approveSendingTree);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([senderKey]).send();

console.log(
  `tokenAccount1's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
);
