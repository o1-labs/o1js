import { ProvablePure, Circuit, Field, Poseidon, CircuitValue } from 'snarkyjs';

// TODO: Implement ProvablePure
export class MerkleStack<A extends CircuitValue> {
  commitment: Field;
  eltTyp: ProvablePure<A>;
  values:
    | { computed: true; value: Array<[A, Field]> }
    | { computed: false; f: () => Array<[A, Field]> };

  static pushCommitment<B extends CircuitValue>(x: B, comm: Field): Field {
    return Poseidon.hash([comm].concat(x.toFields()));
  }

  constructor(eltTyp: ProvablePure<A>, f: () => Array<[A, Field]>) {
    this.values = { computed: false, f };
    this.eltTyp = eltTyp;
    // TODO
    this.commitment = Field(0);
  }

  getValues(): Array<[A, Field]> {
    if (this.values.computed === true) {
      return this.values.value;
    } else {
      let v = this.values.f();
      this.values = { computed: true, value: v };
      return v;
    }
  }

  pop(): A {
    this.commitment.isZero().assertEquals(false);
    let tail = Circuit.witness(Field, () => {
      let xs = this.getValues();
      let [_, tl] = xs[xs.length - 1];
      return tl;
    });
    let value = Circuit.witness(this.eltTyp, () => {
      let xs = this.getValues();
      let last = xs.pop();
      if (last === undefined) {
        throw new Error('pop from empty list');
      }
      return last[0];
    });
    this.commitment.assertEquals(MerkleStack.pushCommitment<A>(value, tail));
    this.commitment = tail;
    return value;
  }
}
