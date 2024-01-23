import {
  Bool,
  Field,
  Poseidon,
  Provable,
  Struct,
  Unconstrained,
  assert,
} from 'o1js';
import { provableFromClass } from '../../../bindings/lib/provable-snarky.js';
import { packToFields } from '../../hash.js';

export {
  MerkleArray,
  MerkleArrayIterator,
  MerkleArrayBase,
  MerkleList,
  WithHash,
  WithStackHash,
  emptyHash,
  ProvableHashable,
  genericHash,
};

function genericHash<T>(
  provable: ProvableHashable<T>,
  prefix: string,
  value: T
) {
  let input = provable.toInput(value);
  let packed = packToFields(input);
  return Poseidon.hashWithPrefix(prefix, packed);
}

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
function WithStackHash<T>(): ProvableHashable<WithStackHash<T>> {
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

// merkle array

type MerkleArrayBase<T> = {
  readonly array: Unconstrained<WithHash<T>[]>;
  readonly hash: Field;
};

function MerkleArrayBase<T>(): ProvableHashable<MerkleArrayBase<T>> {
  return class extends Struct({ array: Unconstrained.provable, hash: Field }) {
    static empty(): MerkleArrayBase<T> {
      return { array: Unconstrained.from([]), hash: emptyHash };
    }
  };
}

type MerkleArrayIterator<T> = {
  readonly array: Unconstrained<WithHash<T>[]>;
  readonly hash: Field;

  currentHash: Field;
  currentIndex: Unconstrained<number>;
};

function MerkleArrayIterator<T>(): ProvableHashable<MerkleArrayIterator<T>> {
  return class extends Struct({
    array: Unconstrained.provable,
    hash: Field,
    currentHash: Field,
    currentIndex: Unconstrained.provable,
  }) {
    static empty(): MerkleArrayIterator<T> {
      return {
        array: Unconstrained.from([]),
        hash: emptyHash,
        currentHash: emptyHash,
        currentIndex: Unconstrained.from(0),
      };
    }
  };
}

/**
 * MerkleArray is similar to a MerkleList, but it maintains the entire array througout a computation,
 * instead of needlessly mutating itself / throwing away context while stepping through it.
 *
 * We maintain two commitments, both of which are equivalent to a Merkle list hash starting _from the end_ of the array:
 * - One to the entire array, to prove that we start iterating at the beginning.
 * - One to the array from the current index until the end, to efficiently step forward.
 */
class MerkleArray<T> implements MerkleArrayIterator<T> {
  // fixed parts
  readonly array: Unconstrained<WithHash<T>[]>;
  readonly hash: Field;

  // mutable parts
  currentHash: Field;
  currentIndex: Unconstrained<number>;

  constructor(value: MerkleArrayIterator<T>) {
    Object.assign(this, value);
  }

  static startIterating<T>({ array, hash }: MerkleArrayBase<T>) {
    return new this({
      array,
      hash,
      currentHash: hash,
      currentIndex: Unconstrained.from(0),
    });
  }
  assertAtStart() {
    return this.currentHash.assertEquals(this.hash);
  }

  isAtEnd() {
    return this.currentHash.equals(emptyHash);
  }
  jumpToEnd() {
    this.currentIndex.setTo(
      Unconstrained.witness(() => this.array.get().length)
    );
    this.currentHash = emptyHash;
  }
  jumpToEndIf(condition: Bool) {
    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.currentIndex.set(this.array.get().length);
      }
    });
    this.currentHash = Provable.if(condition, emptyHash, this.currentHash);
  }

  next() {
    // next corresponds to `pop()` in MerkleList
    // it returns a dummy element if we're at the end of the array
    let index = Unconstrained.witness(() => this.currentIndex.get() + 1);

    let { previousHash, element } = Provable.witness(
      WithHash(this.innerProvable),
      () =>
        this.array.get()[index.get()] ?? {
          previousHash: this.hash,
          element: this.innerProvable.empty(),
        }
    );

    let isDummy = this.isAtEnd();
    let correctHash = this.nextHash(previousHash, element);
    let requiredHash = Provable.if(isDummy, emptyHash, correctHash);
    this.currentHash.assertEquals(requiredHash);

    this.currentIndex.setTo(index);
    this.currentHash = Provable.if(isDummy, emptyHash, previousHash);

    return Provable.if(
      isDummy,
      this.innerProvable,
      this.innerProvable.empty(),
      element
    );
  }

  clone(): MerkleArray<T> {
    let array = Unconstrained.witness(() => [...this.array.get()]);
    let currentIndex = Unconstrained.witness(() => this.currentIndex.get());
    return new this.Constructor({
      array,
      hash: this.hash,
      currentHash: this.currentHash,
      currentIndex,
    });
  }

  /**
   * Create a Merkle list type
   */
  static create<T>(
    type: ProvableHashable<T>,
    nextHash: (hash: Field, value: T) => Field = merkleListHash(type)
  ): typeof MerkleArray<T> & {
    from: (array: T[]) => MerkleArray<T>;
    empty: () => MerkleArray<T>;
    provable: ProvableHashable<MerkleArray<T>>;
  } {
    return class MerkleArray_ extends MerkleArray<T> {
      static _innerProvable = type;

      static _provable = provableFromClass(MerkleArray_, {
        array: Unconstrained.provable,
        hash: Field,
        currentHash: Field,
        currentIndex: Unconstrained.provable,
      }) satisfies ProvableHashable<MerkleArray<T>> as ProvableHashable<
        MerkleArray<T>
      >;

      static _nextHash = nextHash;

      static from(array: T[]): MerkleArray<T> {
        let n = array.length;
        let arrayWithHashes = Array<WithHash<T>>(n);
        let currentHash = emptyHash;

        for (let i = n - 1; i >= 0; i--) {
          arrayWithHashes[i] = { previousHash: currentHash, element: array[i] };
          currentHash = nextHash(currentHash, array[i]);
        }

        return new this({
          array: Unconstrained.from(arrayWithHashes),
          hash: currentHash,
          currentHash: currentHash,
          currentIndex: Unconstrained.from(0),
        });
      }

      static empty(): MerkleArray<T> {
        return this.from([]);
      }

      static get provable(): ProvableHashable<MerkleArray<T>> {
        assert(this._provable !== undefined, 'MerkleArray not initialized');
        return this._provable;
      }
    };
  }

  // dynamic subclassing infra
  static _nextHash: ((hash: Field, t: any) => Field) | undefined;

  static _provable: ProvableHashable<MerkleArray<any>> | undefined;
  static _innerProvable: ProvableHashable<any> | undefined;

  get Constructor() {
    return this.constructor as typeof MerkleArray;
  }

  nextHash(hash: Field, t: T): Field {
    assert(
      this.Constructor._nextHash !== undefined,
      'MerkleArray not initialized'
    );
    return this.Constructor._nextHash(hash, t);
  }

  get innerProvable(): ProvableHashable<T> {
    assert(
      this.Constructor._innerProvable !== undefined,
      'MerkleArray not initialized'
    );
    return this.Constructor._innerProvable;
  }
}
