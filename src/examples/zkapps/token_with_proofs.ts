import {
  Ledger,
  isReady,
  method,
  Mina,
  Party,
  PrivateKey,
  SmartContract,
  PublicKey,
  UInt64,
  shutdown,
  Int64,
  Experimental,
  Permissions,
  DeployArgs,
} from 'snarkyjs';

await isReady;

class TokenContract extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      send: Permissions.proof(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
  }

  @method tokenDeploy(deployer: PrivateKey) {
    let address = deployer.toPublicKey();
    let deployParty = Experimental.createChildParty(this.self, address);
    deployParty.body.tokenId = this.experimental.token.id;
    deployParty.body.caller = this.experimental.token.id;
    Party.setValue(deployParty.update.permissions, {
      ...Permissions.default(),
      send: Permissions.proof(),
    });
    // TODO pass in verification key --> make it a circuit value --> make circuit values able to hold auxiliary data
    // Party.setValue(deployParty.update.verificationKey, verificationKey);
    // deployParty.balance.addInPlace(initialBalance);
    deployParty.signInPlace(deployer, true);
  }

  @method mint(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000_000);
    this.experimental.token.mint({ address: receiverAddress, amount });
  }

  @method burn(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000);
    this.experimental.token.burn({ address: receiverAddress, amount });
  }

  @method sendTokens(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    callback: Experimental.Callback<any>
  ) {
    let senderParty = Experimental.partyFromCallback(this, callback, true);
    let amount = UInt64.from(1_000);
    let negativeAmount = Int64.fromObject(senderParty.body.balanceChange);
    negativeAmount.assertEquals(Int64.from(amount).neg());
    let tokenId = this.experimental.token.id;
    senderParty.body.tokenId.assertEquals(tokenId);
    senderParty.body.publicKey.assertEquals(senderAddress);
    let receiverParty = Experimental.createChildParty(
      this.self,
      receiverAddress,
      { caller: tokenId, tokenId }
    );
    receiverParty.balance.addInPlace(amount);
  }
}

class ZkAppB extends SmartContract {
  @method authorizeSend() {
    let amount = UInt64.from(1_000);
    this.balance.subInPlace(amount);
  }
}

class ZkAppC extends SmartContract {
  @method authorizeSend() {
    let amount = UInt64.from(1_000);
    this.balance.subInPlace(amount);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let feePayer = Local.testAccounts[0].privateKey;
let initialBalance = 10_000_000;

let tokenZkAppKey = PrivateKey.random();
let tokenZkAppAddress = tokenZkAppKey.toPublicKey();

let zkAppCKey = PrivateKey.random();
let zkAppCAddress = zkAppCKey.toPublicKey();

let zkAppBKey = PrivateKey.random();
let zkAppBAddress = zkAppBKey.toPublicKey();

let tokenAccount1Key = Local.testAccounts[1].privateKey;
let tokenAccount1 = tokenAccount1Key.toPublicKey();

let tokenZkApp = new TokenContract(tokenZkAppAddress);
let tokenId = tokenZkApp.experimental.token.id;

let zkAppB = new ZkAppB(zkAppBAddress, tokenId);
let zkAppC = new ZkAppC(zkAppCAddress, tokenId);
let tx;

console.log('tokenZkAppAddress', tokenZkAppAddress.toBase58());
console.log('zkAppB', zkAppBAddress.toBase58());
console.log('zkAppC', zkAppCAddress.toBase58());
console.log('receiverAddress', tokenAccount1.toBase58());
console.log('feePayer', feePayer.toPublicKey().toBase58());
console.log('-------------------------------------------');

console.log('compile (TokenContract)');
await TokenContract.compile(tokenZkAppAddress);
console.log('compile (ZkAppB)');
await ZkAppB.compile(zkAppBAddress, tokenId);
console.log('compile (ZkAppC)');
await ZkAppC.compile(zkAppCAddress, tokenId);

console.log('deploy tokenZkApp');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer, { initialBalance });
  tokenZkApp.deploy({ zkappKey: tokenZkAppKey });
});
tx.send();

console.log('deploy zkAppB');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  tokenZkApp.tokenDeploy(zkAppBKey);
});
console.log('deploy zkAppB (proof)');
await tx.prove();
tx.send();

console.log('deploy zkAppC');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  tokenZkApp.tokenDeploy(zkAppCKey);
});
console.log('deploy zkAppC (proof)');
await tx.prove();
tx.send();

console.log('mint token to zkAppB');
tx = await Local.transaction(feePayer, () => {
  tokenZkApp.mint(zkAppBAddress);
});
await tx.prove();
tx.send();

console.log('authorize send from zkAppB');
tx = await Local.transaction(feePayer, () => {
  let authorizeSendingCallback = new Experimental.Callback(
    zkAppB,
    'authorizeSend',
    []
  );
  // we call the token contract with the callback
  tokenZkApp.sendTokens(zkAppBAddress, zkAppCAddress, authorizeSendingCallback);
});
console.log('authorize send (proof)');
await tx.prove();
console.log('send (proof)');
tx.send();

console.log(
  `zkAppC's balance for tokenId: ${Ledger.fieldToBase58(tokenId)}`,
  Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
);

console.log('authorize send from zkAppC');
tx = await Local.transaction(feePayer, () => {
  // Pay for tokenAccount1's account creation
  Party.fundNewAccount(feePayer);
  let authorizeSendingCallback = new Experimental.Callback(
    zkAppC,
    'authorizeSend',
    []
  );
  // we call the token contract with the callback
  tokenZkApp.sendTokens(zkAppCAddress, tokenAccount1, authorizeSendingCallback);
});
console.log('authorize send (proof)');
await tx.prove();
console.log('send (proof)');
tx.send();
// console.log(tx.toJSON());

console.log(
  `tokenAccount1's balance for tokenId: ${Ledger.fieldToBase58(tokenId)}`,
  Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
);

shutdown();
