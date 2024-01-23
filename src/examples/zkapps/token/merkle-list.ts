import {
  Field,
  Provable,
  ProvableExtended,
  Struct,
  Unconstrained,
  assert,
} from 'o1js';
import { provableFromClass } from 'src/bindings/lib/provable-snarky.js';

export { MerkleList, WithHash, WithStackHash, emptyHash, ProvableHashable };

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

  constructor(hash: Field, value: WithHash<T>[]) {
    this.hash = hash;
    this.stack = Unconstrained.from(value);
  }

  isEmpty() {
    return this.hash.equals(emptyHash);
  }

  static empty(): MerkleList<any> {
    return new this(emptyHash, []);
  }

  push(element: T) {
    let previousHash = this.hash;
    this.hash = this.nextHash(previousHash, element);
    Provable.asProver(() => {
      this.stack.set([...this.stack.get(), { previousHash, element }]);
    });
  }

  private popWitness() {
    return Provable.witness(WithHash(this.innerProvable), () => {
      let value = this.stack.get();
      let head = value.at(-1) ?? {
        previousHash: emptyHash,
        element: this.innerProvable.empty(),
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
    let provable = this.innerProvable;
    return Provable.if(isEmpty, provable, provable.empty(), element);
  }

  /**
   * Create a Merkle list type
   */
  static create<T>(
    type: ProvableHashable<T>,
    nextHash: (hash: Field, t: T) => Field
  ): typeof MerkleList<T> {
    return class MerkleList_ extends MerkleList<T> {
      static _innerProvable = type;

      static _provable = provableFromClass(MerkleList_, {
        hash: Field,
        stack: Unconstrained.provable,
      }) as ProvableHashable<MerkleList<T>>;

      static _nextHash = nextHash;
    };
  }

  // dynamic subclassing infra
  static _nextHash: ((hash: Field, t: any) => Field) | undefined;

  static _provable: ProvableHashable<MerkleList<any>> | undefined;
  static _innerProvable: ProvableHashable<any> | undefined;

  get Constructor() {
    return this.constructor as typeof MerkleList;
  }

  nextHash(hash: Field, t: T): Field {
    assert(
      this.Constructor._nextHash !== undefined,
      'MerkleList not initialized'
    );
    return this.Constructor._nextHash(hash, t);
  }

  static get provable(): ProvableHashable<MerkleList<any>> {
    assert(this._provable !== undefined, 'MerkleList not initialized');
    return this._provable;
  }
  get innerProvable(): ProvableHashable<T> {
    assert(
      this.Constructor._innerProvable !== undefined,
      'MerkleList not initialized'
    );
    return this.Constructor._innerProvable;
  }
}

type HashInput = { fields?: Field[]; packed?: [Field, number][] };
type ProvableHashable<T> = Provable<T> & {
  toInput: (x: T) => HashInput;
  empty: () => T;
};
