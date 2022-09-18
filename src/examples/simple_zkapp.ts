import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  isReady,
  Permissions,
  DeployArgs,
  Bool,
  PublicKey,
  Circuit,
  Proof,
  verify,
  ZkappPublicInput,
  partyToPublicInput,
} from 'snarkyjs';

const doProofs = true;

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  events = {
    update: Field,
    payout: UInt64,
    payoutReceiver: PublicKey,
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
    this.x.set(initialState);
  }

  @method update(y: Field) {
    this.emitEvent('update', y);
    let x = this.x.get();
    this.x.assertEquals(x);
    this.x.set(x.add(y));
  }

  /**
   * This method allows a certain privileged account to claim half of the zkapp balance, but only once
   * @param caller the privileged account
   */
  @method payout(caller: PrivateKey) {
    // check that caller is the privileged account
    let callerAddress = caller.toPublicKey();
    callerAddress.assertEquals(privilegedAddress);

    // assert that the caller account is new - this way, payout can only happen once
    let callerParty = AccountUpdate.defaultParty(callerAddress);
    callerParty.account.isNew.assertEquals(Bool(true));

    // pay out half of the zkapp balance to the caller
    let balance = this.account.balance.get();
    this.account.balance.assertEquals(balance);
    // FIXME UInt64.div() doesn't work on variables
    let halfBalance = Circuit.witness(UInt64, () =>
      balance.toConstant().div(2)
    );
    this.send({ to: callerParty, amount: halfBalance });

    // emit some events
    this.emitEvent('payoutReceiver', callerAddress);
    this.emitEvent('payout', halfBalance);
  }
}

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// a special account that is allowed to pull out half of the zkapp balance, once
let privilegedKey = PrivateKey.random();
let privilegedAddress = privilegedKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

let { verificationKey } = await SimpleZkapp.compile(zkappAddress);

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer, { initialBalance });
  zkapp.deploy({ zkappKey });
});
tx.send();

console.log('update');
tx = await Mina.transaction(feePayer, () => {
  zkapp.update(Field(3));
  if (!doProofs) zkapp.sign(zkappKey);
});
let [p] = await tx.prove();

class zkAppProof extends Proof<ZkappPublicInput> {
  static publicInputType = ZkappPublicInput;
  static tag = () => self;
}

let publicInput = partyToPublicInput(tx.transaction.otherParties[0]);
let publicInputFields = ZkappPublicInput.toFields(publicInput);
/* console.log(p?.toJSON().proof);
console.log(p?.toJSON().proof.length);
console.log(tx.transaction.otherParties[0].authorization.proof?.length); */
const proof = zkAppProof.fromJSON({
  maxProofsVerified: 2,
  proof: tx.transaction.otherParties[0].authorization.proof!,
  publicInput: publicInputFields.map((f) => f.toString()),
});

let isValidProof = await verify(proof, verificationKey.data);
console.log('isValid ', isValidProof);

tx.send();
