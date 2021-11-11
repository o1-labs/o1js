import { CircuitValue, prop } from "../lib/circuit_value";
import { PrivateKey, PublicKey, Signature } from "../lib/signature";
import { Proof, Field, Circuit, Bool } from "../snarky"
import { HTTPSAttestation } from "./exchange_lib";
import { AccumulatorI, AccumulatorMembershipProof, Index, IndexedAccumulator, IndexedAccumulatorI, KeyedAccumulator, MerkleAccumulator, MerkleProof } from '../lib/merkle_proof';
import { MerkleStack } from '../lib/merkle_stack';
import { SignedAmount, State, Party, Body, Permissions, Perm, Amount } from '../lib/party';
import { SmartContract, state, method, init } from '../lib/snapp';
import { proofSystem, branch, ProofWithInput } from '../lib/proof_system';
import * as DataStore from '../lib/data_store';
import * as Mina from '../lib/mina';
import { UInt32, UInt64 } from '../lib/uint';

type AccountDb = KeyedAccumulator<PublicKey, RollupAccount>;

class RollupAccount extends CircuitValue {
  @prop balance: UInt64;
  @prop nonce: UInt32;
  @prop publicKey: PublicKey;
  
  constructor(balance: Field, nonce: Field, publicKey: PublicKey) {
    super();
    this.balance = balance;
    this.nonce = nonce;
    this.publicKey = publicKey;
  }
}

class RollupTransaction extends CircuitValue {
  @prop amount: UInt64;
  @prop nonce: UInt32;
  @prop sender: PublicKey;
  @prop receiver: PublicKey;

  constructor(amount: UInt64, nonce: UInt32, sender: PublicKey, receiver: PublicKey) {
    super();
    this.amount = amount;
    this.nonce = nonce;
    this.sender = sender;
    this.receiver = receiver;
  }
}

class RollupDeposit extends CircuitValue {
  @prop publicKey: PublicKey;
  @prop amount: UInt64;
  constructor(publicKey: PublicKey, amount: UInt64) {
    super();
    this.publicKey = publicKey;
    this.amount = amount;
  }
}

class RollupState extends CircuitValue {
  @prop pendingDepositsCommitment: Field;
  @prop accountDbCommitment: Field;
  constructor(p: Field, c: Field) {
    super();
    this.pendingDepositsCommitment = p;
    this.accountDbCommitment = c;
  }
}

class RollupStateTransition extends CircuitValue {
  @prop source: RollupState;
  @prop target: RollupState;
  constructor(source: RollupState, target: RollupState) {
    super();
    this.source = source;
    this.target = target;
  }
}

@proofSystem
class RollupProof extends ProofWithInput<RollupStateTransition> {
  @branch static processDeposit(
    pending: MerkleStack<RollupDeposit>,
    accountDb: AccountDb): RollupProof {
    let before = new RollupState(pending.commitment, accountDb.commitment());
    let deposit = pending.pop();
    
    let after = new RollupState(pending.commitment, accountDb.commitment());

    return new RollupProof(new RollupStateTransition(before, after));
  }

  @branch static transaction(
    t: RollupTransaction,
    s: Signature,
    pending: MerkleStack<RollupDeposit>,
    accountDb: AccountDb,
    ): RollupProof {
    s.verify(t.sender, t.toFieldElements()).assertEquals(true);
    let stateBefore = new RollupState(pending.commitment, accountDb.commitment());

    let senderAccount = accountDb.get(t.sender);
    senderAccount.isSome.assertEquals(true);
    senderAccount.value.nonce.assertEquals(t.nonce);

    let receiverAccount = accountDb.get(t.receiver);
    senderAccount.value.balance = senderAccount.value.balance.sub(t.amount);
    accountDb.set(t.sender, senderAccount.value);
    receiverAccount.value.balance = receiverAccount.value.balance.add(t.amount);
    accountDb.set(t.receiver, receiverAccount.value);

    let stateAfter = new RollupState(pending.commitment, accountDb.commitment());
    return new RollupProof(new RollupStateTransition(stateBefore, stateAfter));
  }

  @branch static merge(p1: RollupProof, p2: RollupProof): RollupProof {
    p1.publicInput.target.assertEquals(
      p2.publicInput.source
    );
    return new RollupProof(
      new RollupStateTransition(
        p1.publicInput.source,
        p2.publicInput.target));
  }
}

type OperatorsDb = AccumulatorI<PublicKey, AccumulatorMembershipProof>;

class RollupSnapp extends SmartContract {
  @state operatorsCommitment: State<Field>;
  @state rollupState: State<RollupState>;

  // The 5 slot period during which this was last updated
  @state lastUpdatedPeriod: State<UInt32>;

  constructor(address: PublicKey) {
    super(address);
    this.operatorsCommitment = new State();
    this.rollupState = new State();
    this.lastUpdatedPeriod = new State();
  }

  static periodLength = 5;
  static newOperatorGapSlots = 20;
  static newOperatorGapPeriods = RollupSnapp.newOperatorGapSlots / RollupSnapp.periodLength;

  @init init() {
    let perms = Permissions.default();
    // Force users to use the deposit method to send to this account
    perms.receive = Perm.proof();
    perms.editState = Perm.proof();
    this.self.update.permissions.set(perms)
  }

  // Only allowed to update every so often
  @method addOperator(
    submittedSlot: UInt32,
    operatorsDb: OperatorsDb,
    pk: PublicKey,
    s: Signature)
  {
    let period = submittedSlot.div(RollupSnapp.periodLength);
    let startSlot = period.mul(RollupSnapp.periodLength);

    this.protocolState.globalSlotSinceGenesis.assertBetween(
      startSlot, startSlot.add(RollupSnapp.periodLength));

    // Check it has been a while since the last addition of a new
    // operator
    period.assertGt(
      this.lastUpdatedPeriod.get()
      .add(RollupSnapp.newOperatorGapPeriods)
    );
    this.lastUpdatedPeriod.set(period);

    this.operatorsCommitment.assertEquals(operatorsDb.commitment());

    const self = this.self;

    // verify signature on
    // message = [ submittedSlot, operatorPubKey ]
    let message = submittedSlot.toFieldElements().concat(pk.toFieldElements());
    s.verify(self.publicKey, message).assertEquals(true);

    operatorsDb.add(pk);
    this.operatorsCommitment.set(operatorsDb.commitment());
  }

  @method depositFunds(
    depositor: Body,
    depositAmount: UInt64) {
    const self = this.self;

    let delta = SignedAmount.ofUnsigned(depositAmount);
    self.delta = delta;

    depositor.delta = delta.neg();

    let deposit = new RollupDeposit(depositor.publicKey, depositAmount);
    this.emitEvent(deposit);
    const rollupState = this.rollupState.get();
    rollupState.pendingDepositsCommitment = MerkleStack.pushCommitment(
      deposit, rollupState.pendingDepositsCommitment
    );
    this.rollupState.set(rollupState);
  }

  @method updateRollupState(
    rollupProof: RollupProof,
    operatorMembership: AccumulatorMembershipProof,
    // Operator signs the new rollup state
    operator: PublicKey,
    operatorSignature: Signature)
  {
    operatorMembership.verify(this.operatorsCommitment.get(), operator)
    .assertEquals(true);

    operatorSignature.verify(operator, rollupProof.publicInput.target.toFieldElements())
    .assertEquals(true);

    this.rollupState.assertEquals(rollupProof.publicInput.source);
    this.rollupState.set(rollupProof.publicInput.target);
  }
}

function main() {
  // TODO: Put real value
  let snappOwnerKey = PrivateKey.random();
  let snappPubkey = snappOwnerKey.toPublicKey();

  let depositorPrivkey = PrivateKey.random();
  let depositorPubkey = depositorPrivkey.toPublicKey();

  // Private state. Lives on disk.
  let operatorsDbStore = DataStore.Disk<PublicKey>(PublicKey, '/home/izzy/operators');
  let operatorsDb = MerkleAccumulator(operatorsDbStore);

  let RollupInstance = new RollupSnapp(snappPubkey);

  // Add a new rollup operator
  let newOperatorPrivkey = PrivateKey.random();
  let newOperatorPubkey = newOperatorPrivkey.toPublicKey();
  let currentSlot = Mina.currentSlot();
  let message = currentSlot.toFieldElements().concat(newOperatorPubkey.toFieldElements());
  let signature = Signature.create(snappOwnerKey, message);

  // Public state, the state of accounts on the rollup.
  let accountDbStore =
    DataStore.IPFS<RollupAccount>(
      RollupAccount,
      '/ipns/QmSrPmbaUKA3ZodhzPWZnpFgcPMFWF4QsxXbkWfEptTBJd');
  let accountDb: AccountDb = new KeyedAccumulator((v: RollupAccount) => v.publicKey, accountDbStore);

  let pendingDeposits = new MerkleStack<RollupDeposit>(RollupDeposit, () => []); // todo: storage

  // Executes a snapp method, broadcasts the transaction to chain.
  Mina.transaction(() => {
    RollupInstance.addOperator(
      Mina.currentSlot(), operatorsDb, newOperatorPubkey, signature);
  }).send().wait().then(() => {
    let depositorBalance = Mina.getBalance(depositorPubkey);
    let depositor = Party.createSigned(depositorPrivkey);

    return Mina.transaction(() => {
      // Deposit some funds into the rollup
      RollupInstance.depositFunds(depositor, depositorBalance.div(2));
    }).send().wait()
  }).then(() => {
    let rollupAmount = UInt64.fromNumber(10);
    let rollupNonce = UInt32.fromNumber(0);
    let rollupSender = depositorPubkey;
    let rollupReceiver = depositorPubkey;
    let rollupTransaction = new RollupTransaction(
      rollupAmount, rollupNonce, rollupSender, rollupReceiver
    );

    let rollupProof =
      RollupProof.merge(
        RollupProof.processDeposit(pendingDeposits, accountDb),
        RollupProof.transaction(
          rollupTransaction,
          Signature.create(depositorPrivkey, rollupTransaction.toFieldElements()),
          pendingDeposits,
          accountDb));
    
    Mina.transaction(() => {
      let membershipProof = operatorsDb.getMembershipProof(newOperatorPubkey);
      if (membershipProof === null) { throw 'not an operator' };
      RollupInstance.updateRollupState(
        rollupProof,
        membershipProof,
        newOperatorPubkey,
        Signature.create(
          newOperatorPrivkey,
          rollupProof.publicInput.target.toFieldElements())
      )
    })
  })
}