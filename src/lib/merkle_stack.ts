import { AsFieldElements, Circuit, Field, Poseidon } from '../snarky';
import { CircuitValue } from './circuit_value';
import { Optional } from './optional';
import { MerkleList } from './party';

// TODO: Implement AsFieldElements
export class MerkleStack<A extends CircuitValue> {
  commitment: Field;
  eltTyp: AsFieldElements<A>;
  values:
    | { computed: true; value: Array<[A, Field]> }
    | { computed: false; f: () => Array<[A, Field]> };

  static pushCommitment<B extends CircuitValue>(x: B, comm: Field): Field {
    return Poseidon.hash([comm].concat(x.toFields()));
  }

  constructor(eltTyp: AsFieldElements<A>, f: () => Array<[A, Field]>) {
    this.values = { computed: false, f };
    this.eltTyp = eltTyp;
    // TODO
    this.commitment = Field.zero;
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
