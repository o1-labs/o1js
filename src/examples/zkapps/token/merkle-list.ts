import { Field, Poseidon, Provable, Struct, Unconstrained } from 'o1js';

export { MerkleList };

class Element extends Struct({ previousHash: Field, element: Field }) {}

type WithHash<T> = { previousHash: Field; element: T };
function WithHash<T>(type: ProvableHashable<T>): Provable<WithHash<T>> {
  return Struct({ previousHash: Field, element: type });
}

const emptyHash = Field(0);

class MerkleList<T> {
  hash: Field;
  value: Unconstrained<WithHash<T>[]>;
  provable: ProvableHashable<T>;
  nextHash: (hash: Field, t: T) => Field;

  private constructor(
    hash: Field,
    value: WithHash<T>[],
    provable: ProvableHashable<T>,
    nextHash: (hash: Field, t: T) => Field
  ) {
    this.hash = hash;
    this.value = Unconstrained.from(value);
    this.provable = provable;
    this.nextHash = nextHash;
  }

  isEmpty() {
    return this.hash.equals(emptyHash);
  }

  static create<T>(
    provable: ProvableHashable<T>,
    nextHash: (hash: Field, t: T) => Field
  ): MerkleList<T> {
    return new MerkleList(emptyHash, [], provable, nextHash);
  }

  push(element: T) {
    let previousHash = this.hash;
    this.hash = this.nextHash(previousHash, element);
    Provable.asProver(() => {
      this.value.set([...this.value.get(), { previousHash, element }]);
    });
  }

  private popWitness() {
    return Provable.witness(WithHash(this.provable), () => {
      let value = this.value.get();
      let head = value.at(-1) ?? {
        previousHash: emptyHash,
        element: this.provable.empty(),
      };
      this.value.set(value.slice(0, -1));
      return head;
    });
  }

  pop(): T {
    let { previousHash, element } = this.popWitness();

    let requiredHash = this.nextHash(previousHash, element);
    this.hash.assertEquals(requiredHash);

    this.hash = previousHash;
    return element;
  }

  popOrDummy(): T {
    let { previousHash, element } = this.popWitness();

    let isEmpty = this.isEmpty();
    let correctHash = this.nextHash(previousHash, element);
    let requiredHash = Provable.if(isEmpty, emptyHash, correctHash);
    this.hash.assertEquals(requiredHash);

    this.hash = Provable.if(isEmpty, emptyHash, previousHash);
    return Provable.if(isEmpty, this.provable, this.provable.empty(), element);
  }
}

type HashInput = { fields?: Field[]; packed?: [Field, number][] };
type ProvableHashable<T> = Provable<T> & {
  toInput: (x: T) => HashInput;
  empty: () => T;
};
