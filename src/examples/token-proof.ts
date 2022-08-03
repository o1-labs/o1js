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
  DeployArgs,
  Permissions,
} from 'snarkyjs';

await isReady;

class TokenContract extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
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
    this.token().mint({
      address: receiverAddress,
      amount,
    });
  }

  @method burn(receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000);
    this.token().burn({
      address: receiverAddress,
      amount,
    });
  }

  @method sendTokens(senderAddress: PublicKey, receiverAddress: PublicKey) {
    let amount = UInt64.from(1_000);
    this.token().send({
      from: senderAddress,
      to: receiverAddress,
      amount,
    });
  }
}

class ZkAppB extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
    console.log('zkAppB tokenId', Ledger.fieldToBase58(this.tokenId));
  }

  @method update(y: Field) {
    this.x.assertEquals(this.x.get());
    this.x.set(y);
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

let zkAppCKey = PrivateKey.random();
let zkAppCAddress = zkAppCKey.toPublicKey();

let tokenAccount1Key = Local.testAccounts[1].privateKey;
let tokenAccount1 = tokenAccount1Key.toPublicKey();

let tokenAccount2Key = Local.testAccounts[2].privateKey;
let tokenAccount2 = tokenAccount2Key.toPublicKey();

let tokenZkApp = new TokenContract(tokenZkAppAddress);
let zkAppB = new ZkAppB(zkAppBAddress, tokenZkApp.token().id);
let zkAppC = new C(zkAppCAddress);
let tx;

const tokenId = tokenZkApp.token().id;

console.log(
  'tokenZkApp',
  tokenZkAppAddress.toBase58(),
  Ledger.fieldToBase58(tokenId)
);
console.log(
  'zkAppB',
  zkAppBAddress.toBase58(),
  Ledger.fieldToBase58(zkAppB.nativeToken)
);

console.log('deploy tokenZkApp');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  tokenZkApp.deploy({ zkappKey: tokenZkAppKey });
});

tx.send();

console.log('deploy zkAppB');
tx = await Local.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  Party.createSigned(tokenZkAppKey).sign(tokenZkAppKey);
  zkAppB.deploy({ zkappKey: zkAppBKey });
});

tx.transaction.otherParties[2].body.callDepth = 1; // This is being reset somewhere, just manually set it for now
tx.send();

shutdown();
