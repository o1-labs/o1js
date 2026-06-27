import {
  Bool,
  Cache,
  Field,
  Permissions,
  Poseidon,
  Provable,
  PublicKey,
  SelfProof,
  SmartContract,
  State,
  Struct,
  UInt64,
  ZkProgram,
  method,
  state,
} from 'o1js';

const BATCH_SIZE = 54;

class PairInput extends Struct({
  start: Field,
  end: Field,
}) {}

const TwoProofProgram = ZkProgram({
  name: 'mesa-minimal-large-method-two-proof-program',
  publicInput: PairInput,
  publicOutput: Field,
  methods: {
    base: {
      privateInputs: [],
      async method(input: PairInput) {
        input.end.assertEquals(input.start.add(1));
        return { publicOutput: Field(1) };
      },
    },
    merge: {
      privateInputs: [SelfProof, SelfProof],
      async method(
        input: PairInput,
        left: SelfProof<PairInput, Field>,
        right: SelfProof<PairInput, Field>
      ) {
        left.verify();
        right.verify();
        input.start.assertEquals(left.publicInput.start);
        left.publicInput.end.assertEquals(right.publicInput.start);
        input.end.assertEquals(right.publicInput.end);
        return { publicOutput: left.publicOutput.add(right.publicOutput) };
      },
    },
  },
});

const OneProofProgram = ZkProgram({
  name: 'mesa-minimal-large-method-one-proof-program',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    base: {
      privateInputs: [],
      async method(input: Field) {
        return { publicOutput: input.add(1) };
      },
    },
    step: {
      privateInputs: [SelfProof],
      async method(input: Field, previous: SelfProof<Field, Field>) {
        previous.verify();
        input.assertEquals(previous.publicOutput);
        return { publicOutput: input.add(1) };
      },
    },
  },
});

const PlainProgram = ZkProgram({
  name: 'mesa-minimal-large-method-plain-program',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    check: {
      privateInputs: [],
      async method(input: Field) {
        return { publicOutput: input.add(1) };
      },
    },
  },
});

class TwoProof extends TwoProofProgram.Proof {}
class OneProof extends OneProofProgram.Proof {}
class PlainProof extends PlainProgram.Proof {}

function prefixToField(prefix: string) {
  const bytes = [...new TextEncoder().encode(prefix)];
  const size = (Field as any).sizeInBytes ?? 32;
  return (Field as any).fromBytes(bytes.concat(Array(size - bytes.length).fill(0)));
}

function emptyHashWithPrefix(prefix: string) {
  return Poseidon.update(Poseidon.initialState(), [prefixToField(prefix)])[0];
}

const emptyActionListHash = emptyHashWithPrefix('MinaZkappActionsEmpty');
function merkleActionsAdd(hash: Field, actionListHash: Field) {
  return Poseidon.hashWithPrefix('MinaZkappSeqEvents**', [hash, actionListHash]);
}

class SimpleAction extends Struct({
  kind: Field,
  account: PublicKey,
  amount: Field,
  cosmosAddress: Field,
  sigR: Field,
  sigS: Field,
}) {
  actionListHash() {
    return Poseidon.hashWithPrefix('MinaZkappEvent******', [
      this.kind,
      ...this.account.toFields(),
      this.amount,
      this.cosmosAddress,
      this.sigR,
      this.sigS,
    ]);
  }

  depositHash(previous: Field) {
    return Poseidon.hash([
      previous,
      ...this.account.toFields(),
      this.amount,
      this.cosmosAddress,
      this.sigR,
      this.sigS,
    ]);
  }

  withdrawalHash(previous: Field) {
    return Poseidon.hash([previous, ...this.account.toFields(), this.amount]);
  }
}

class Batch extends Struct({
  actions: Provable.Array(SimpleAction, BATCH_SIZE),
}) {}

class Mask extends Struct({
  list: Provable.Array(Bool, BATCH_SIZE),
}) {
  toField() {
    let packed = Field(0);
    for (let i = 0; i < BATCH_SIZE; i++) {
      packed = packed.add(this.list[i].toField().mul(1n << BigInt(i)));
    }
    return packed;
  }
}

class MinimalMesaVkUpdateRepro extends SmartContract {
  @state(Field) actionState = State<Field>();
  @state(Field) depositHash = State<Field>();
  @state(Field) withdrawalHash = State<Field>();

  async deploy() {
    await super.deploy();
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proof(),
    });
  }

  @method
  async touchTwoProof(_proof: TwoProof) {
    this.actionState.set(Field(0));
  }

  @method
  async touchOneProof(_proof: OneProof) {
    this.depositHash.set(Field(0));
  }

  @method
  async reduce(batch: Batch, mask: Mask, _one: OneProof, _plain: PlainProof) {
    let actionState = this.actionState.getAndRequireEquals();
    let depositHash = this.depositHash.getAndRequireEquals();
    let withdrawalHash = this.withdrawalHash.getAndRequireEquals();

    for (let i = 0; i < BATCH_SIZE; i++) {
      const action = batch.actions[i];
      const actionHash = action.actionListHash();
      actionState = Provable.if(
        mask.list[i],
        merkleActionsAdd(
          actionState,
          Poseidon.hashWithPrefix('MinaZkappSeqEvents**', [
            emptyActionListHash,
            actionHash,
          ])
        ),
        actionState
      );
      depositHash = Provable.if(
        mask.list[i].and(action.kind.equals(Field(1))),
        action.depositHash(depositHash),
        depositHash
      );
      withdrawalHash = Provable.if(
        mask.list[i].and(action.kind.equals(Field(2))),
        action.withdrawalHash(withdrawalHash),
        withdrawalHash
      );

      const to = Provable.if(mask.list[i], action.account, PublicKey.empty());
      const amount = Provable.if(
        mask.list[i],
        UInt64.Unsafe.fromField(action.amount),
        UInt64.zero
      );
      this.send({ to, amount });
    }

    this.actionState.set(actionState);
    this.depositHash.set(depositHash);
    this.withdrawalHash.set(withdrawalHash);
    mask.toField().assertEquals(mask.toField());
  }
}

const cache = Cache.None;

console.log('compiling proof programs');
await TwoProofProgram.compile({ cache });
await OneProofProgram.compile({ cache });
await PlainProgram.compile({ cache });

console.log('compiling MinimalMesaVkUpdateRepro');
await MinimalMesaVkUpdateRepro.compile({ cache });
