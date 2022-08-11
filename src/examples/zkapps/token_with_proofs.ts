import {
  Field,
  isReady,
  Ledger,
  method,
  Mina,
  Party,
  PrivateKey,
  SmartContract,
  state,
  State,
  PublicKey,
  UInt64,
  shutdown,
  Int64,
  Experimental,
  Permissions,
} from 'snarkyjs';

await isReady;

class TokenContract extends SmartContract {
  @state(Field) x = State<Field>();

  @method tokenDeploy(deployer: PrivateKey) {
    let address = deployer.toPublicKey();
    let deployParty = Experimental.createChildParty(this.self, address);
    deployParty.body.tokenId = this.experimental.token.id;
    deployParty.body.caller = this.experimental.token.id;
    Party.setValue(deployParty.update.permissions, Permissions.default());
    // TODO pass in verification key --> make it a circuit value --> make circuit values able to hold auxiliary data
    // Party.setValue(deployParty.update.verificationKey, verificationKey);
    deployParty.signInPlace(deployer, true);
  }

  @method update(y: Field) {
    this.x.assertEquals(this.x.get());
    this.x.set(y);
  }

  @method initialize() {
    this.x.set(Field.one);
  }

  @method mint(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000_000);
    this.experimental.token.mint({
      address: receiverAddress,
      amount,
    });
  }

  @method burn(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000);
    this.experimental.token.burn({
      address: receiverAddress,
      amount,
    });
  }

  @method sendTokens(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    callback: Experimental.Callback<any>
  ) {
    let senderParty = Experimental.partyFromCallback(this, callback);
    let amount = UInt64.from(1_000);
    let tokenId = this.experimental.token.id;
    // assert party is correct
    // TODO is there more?
    let negativeAmount = Int64.fromObject(senderParty.body.balanceChange);
    negativeAmount.assertEquals(Int64.from(amount).neg());
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
  @state(Field) x = State<Field>();

  @method update(y: Field) {
    this.x.assertEquals(this.x.get());
    this.x.set(y);
  }

  @method authorizeSend(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000);
    this.balance.subInPlace(amount);
  }
}

class C extends SmartContract {}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let tokenZkAppKey = PrivateKey.random();
let tokenZkAppAddress = tokenZkAppKey.toPublicKey();

let zkAppBKey = PrivateKey.random();
let zkAppBAddress = zkAppBKey.toPublicKey();

let tokenAccount1Key = Local.testAccounts[1].privateKey;
let tokenAccount1 = tokenAccount1Key.toPublicKey();

let tokenZkApp = new TokenContract(tokenZkAppAddress);
let tokenId = tokenZkApp.experimental.token.id;

let zkAppB = new ZkAppB(zkAppBAddress, tokenId);
let tx;

console.log('tokenZkAppAddress', tokenZkAppAddress.toBase58());
console.log('zkAppB', zkAppBAddress.toBase58());

console.log('compile (TokenContract)');
await TokenContract.compile(tokenZkAppAddress);
console.log('compile (ZkAppB)');
await ZkAppB.compile(zkAppBAddress);

console.log('deploy tokenZkApp');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  tokenZkApp.deploy({ zkappKey: tokenZkAppKey });
});
tx.send();

console.log('deploy zkAppB');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  tokenZkApp.tokenDeploy(zkAppBKey);
});
tx.sign([zkAppBKey]);
console.log('deploy zkAppB (proof)');
await tx.prove();
tx.send();

console.log('test');
console.log(Mina.getAccount(zkAppBAddress, tokenId).publicKey.toBase58());
console.log(
  Ledger.fieldToBase58(Mina.getAccount(zkAppBAddress, tokenId).tokenId)
);

console.log('authorize send');
tx = await Local.transaction(feePayer, () => {
  let authorizeSendingCallback = new Experimental.Callback(
    zkAppB,
    'authorizeSend',
    [zkAppBAddress, tokenAccount1]
  );
  // we call the token contract with the callback
  tokenZkApp.sendTokens(zkAppBAddress, tokenAccount1, authorizeSendingCallback);
});
tx.sign();
console.log('authorize send (proof)');
await tx.prove();

// We can't update the state without getting authorization from the token contract since the tokenId is set in the constructor
// console.log('update zkAppB');
// tx = await Local.transaction(feePayer, () => {
//   tokenZkApp.tokenDeploy(zkAppBKey);
//   zkAppB.update(Field.one);
//   // zkAppB.sign(zkAppBKey);
// });
// tx.sign([zkAppBKey]);
// console.log(JSON.stringify(partiesToJson(tx.transaction)));
// tx.send();

shutdown();
