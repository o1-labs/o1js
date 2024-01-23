import {
  Bool,
  Field,
  Poseidon,
  Provable,
  ProvableExtended,
  Struct,
  Unconstrained,
  assert,
} from 'o1js';
import { provableFromClass } from 'src/bindings/lib/provable-snarky.js';
import { packToFields } from 'src/lib/hash.js';

export { MerkleList, WithHash, WithStackHash, emptyHash, ProvableHashable };

function merkleListHash<T>(provable: ProvableHashable<T>, prefix = '') {
  return function nextHash(hash: Field, value: T) {
    let input = provable.toInput(value);
    let packed = packToFields(input);
    return Poseidon.hashWithPrefix(prefix, [hash, ...packed]);
  };
}

class MerkleList<T> {
  hash: Field;
  stack: Unconstrained<WithHash<T>[]>;

  constructor({ hash, stack }: WithStackHash<T>) {
    this.hash = hash;
    this.stack = stack;
  }

  isEmpty() {
    return this.hash.equals(emptyHash);
  }
  notEmpty() {
    return this.hash.equals(emptyHash).not();
  }

  push(element: T) {
    let previousHash = this.hash;
    this.hash = this.nextHash(previousHash, element);
    Provable.asProver(() => {
      this.stack.set([...this.stack.get(), { previousHash, element }]);
    });
  }

  pushIf(condition: Bool, element: T) {
    let previousHash = this.hash;
    this.hash = Provable.if(
      condition,
      this.nextHash(previousHash, element),
      previousHash
    );
    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.stack.set([...this.stack.get(), { previousHash, element }]);
      }
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

  popExn(): T {
    let { previousHash, element } = this.popWitness();

    let requiredHash = this.nextHash(previousHash, element);
    this.hash.assertEquals(requiredHash);

    this.hash = previousHash;
    return element;
  }

  pop(): T {
    let { previousHash, element } = this.popWitness();

    let isEmpty = this.isEmpty();
    let correctHash = this.nextHash(previousHash, element);
    let requiredHash = Provable.if(isEmpty, emptyHash, correctHash);
    this.hash.assertEquals(requiredHash);

    this.hash = Provable.if(isEmpty, emptyHash, previousHash);
    let provable = this.innerProvable;
    return Provable.if(isEmpty, provable, provable.empty(), element);
  }

  clone(): MerkleList<T> {
    let stack = Unconstrained.witness(() => [...this.stack.get()]);
    return new this.Constructor({ hash: this.hash, stack });
  }

  /**
   * Create a Merkle list type
   */
  static create<T>(
    type: ProvableHashable<T>,
    nextHash: (hash: Field, value: T) => Field = merkleListHash(type)
  ): typeof MerkleList<T> & {
    empty: () => MerkleList<T>;
    provable: ProvableHashable<MerkleList<T>>;
  } {
    return class MerkleList_ extends MerkleList<T> {
      static _innerProvable = type;

      static _provable = provableFromClass(MerkleList_, {
        hash: Field,
        stack: Unconstrained.provable,
      }) as ProvableHashable<MerkleList<T>>;

      static _nextHash = nextHash;

      static empty(): MerkleList<T> {
        return new this({ hash: emptyHash, stack: Unconstrained.from([]) });
      }

      static get provable(): ProvableHashable<MerkleList<T>> {
        assert(this._provable !== undefined, 'MerkleList not initialized');
        return this._provable;
      }
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

  get innerProvable(): ProvableHashable<T> {
    assert(
      this.Constructor._innerProvable !== undefined,
      'MerkleList not initialized'
    );
    return this.Constructor._innerProvable;
  }
}

type WithHash<T> = { previousHash: Field; element: T };
function WithHash<T>(type: ProvableHashable<T>): Provable<WithHash<T>> {
  return Struct({ previousHash: Field, element: type });
}

const emptyHash = Field(0);

type WithStackHash<T> = {
  hash: Field;
  stack: Unconstrained<WithHash<T>[]>;
};
function WithStackHash<T>(): ProvableExtended<WithStackHash<T>> {
  return class extends Struct({ hash: Field, stack: Unconstrained.provable }) {
    static empty(): WithStackHash<T> {
      return { hash: emptyHash, stack: Unconstrained.from([]) };
    }
  };
}

type HashInput = { fields?: Field[]; packed?: [Field, number][] };
type ProvableHashable<T> = Provable<T> & {
  toInput: (x: T) => HashInput;
  empty: () => T;
};
