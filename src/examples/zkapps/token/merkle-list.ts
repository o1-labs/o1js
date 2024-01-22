import { Field, Provable, ProvableExtended, Struct, Unconstrained } from 'o1js';

export { MerkleList, WithHash, WithStackHash, emptyHash };

type WithHash<T> = { previousHash: Field; element: T };
function WithHash<T>(type: ProvableHashable<T>): Provable<WithHash<T>> {
  return Struct({ previousHash: Field, element: type });
}

type WithStackHash<T> = {
  hash: Field;
  stack: Unconstrained<WithHash<T>[]>;
};
function WithStackHash<T>(): ProvableExtended<WithStackHash<T>> {
  return Struct({ hash: Field, stack: Unconstrained.provable });
}

const emptyHash = Field(0);

class MerkleList<T> {
  hash: Field;
  stack: Unconstrained<WithHash<T>[]>;
  provable: ProvableHashable<T>;
  nextHash: (hash: Field, t: T) => Field;

  private constructor(
    hash: Field,
    value: WithHash<T>[],
    provable: ProvableHashable<T>,
    nextHash: (hash: Field, t: T) => Field
  ) {
    this.hash = hash;
    this.stack = Unconstrained.from(value);
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
      this.stack.set([...this.stack.get(), { previousHash, element }]);
    });
  }

  private popWitness() {
    return Provable.witness(WithHash(this.provable), () => {
      let value = this.stack.get();
      let head = value.at(-1) ?? {
        previousHash: emptyHash,
        element: this.provable.empty(),
      };
      this.stack.set(value.slice(0, -1));
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
