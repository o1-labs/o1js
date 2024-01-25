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
  MerkleListBase,
  MerkleList,
  MerkleListIterator,
  MerkleArray,
  WithHash,
  emptyHash,
  ProvableHashable,
  genericHash,
  merkleListHash,
};

// common base types for both MerkleList and MerkleArray

const emptyHash = Field(0);

type WithHash<T> = { previousHash: Field; element: T };

function WithHash<T>(type: ProvableHashable<T>): ProvableHashable<WithHash<T>> {
  return Struct({ previousHash: Field, element: type });
}

type MerkleListBase<T> = {
  hash: Field;
  data: Unconstrained<WithHash<T>[]>;
};

function MerkleListBase<T>(): ProvableHashable<MerkleListBase<T>> {
  return class extends Struct({ hash: Field, data: Unconstrained.provable }) {
    static empty(): MerkleListBase<T> {
      return { hash: emptyHash, data: Unconstrained.from([]) };
    }
  };
}

// merkle list

class MerkleList<T> implements MerkleListBase<T> {
  hash: Field;
  data: Unconstrained<WithHash<T>[]>;

  constructor({ hash, data }: MerkleListBase<T>) {
    this.hash = hash;
    this.data = data;
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
    this.data.updateAsProver((data) => [...data, { previousHash, element }]);
  }

  pushIf(condition: Bool, element: T) {
    let previousHash = this.hash;
    this.hash = Provable.if(
      condition,
      this.nextHash(previousHash, element),
      previousHash
    );
    this.data.updateAsProver((data) =>
      condition.toBoolean() ? [...data, { previousHash, element }] : data
    );
  }

  private popWitness() {
    return Provable.witness(WithHash(this.innerProvable), () => {
      let value = this.data.get();
      let head = value.at(-1) ?? {
        previousHash: emptyHash,
        element: this.innerProvable.empty(),
      };
      this.data.set(value.slice(0, -1));
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
    let data = Unconstrained.witness(() => [...this.data.get()]);
    return new this.Constructor({ hash: this.hash, data });
  }

  /**
   * Create a Merkle list type
   */
  static create<T>(
    type: ProvableHashable<T>,
    nextHash: (hash: Field, value: T) => Field = merkleListHash(type)
  ): typeof MerkleList<T> & {
    // override static methods with strict types
    empty: () => MerkleList<T>;
    provable: ProvableHashable<MerkleList<T>>;
  } {
    return class MerkleList_ extends MerkleList<T> {
      static _innerProvable = type;

      static _provable = provableFromClass(MerkleList_, {
        hash: Field,
        data: Unconstrained.provable,
      }) as ProvableHashable<MerkleList<T>>;

      static _nextHash = nextHash;

      static empty(): MerkleList<T> {
        return new this({ hash: emptyHash, data: Unconstrained.from([]) });
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

type HashInput = { fields?: Field[]; packed?: [Field, number][] };
type ProvableHashable<T> = Provable<T> & {
  toInput: (x: T) => HashInput;
  empty: () => T;
};

// merkle array

type MerkleListIterator<T> = {
  readonly hash: Field;
  readonly data: Unconstrained<WithHash<T>[]>;

  /**
   * The merkle list hash of `[data[currentIndex], ..., data[length-1]]` (when hashing from right to left).
   *
   * For example:
   * - If `currentIndex === 0`, then `currentHash === this.hash` is the hash of the entire array.
   * - If `currentIndex === length`, then `currentHash === emptyHash` is the hash of an empty array.
   */
  currentHash: Field;
  /**
   * The index of the element that will be returned by the next call to `next()`.
   */
  currentIndex: Unconstrained<number>;
};

/**
 * MerkleArray is similar to a MerkleList, but it maintains the entire array througout a computation,
 * instead of mutating itself / throwing away context while stepping through it.
 *
 * We maintain two commitments, both of which are equivalent to a Merkle list hash starting _from the end_ of the array:
 * - One to the entire array, to prove that we start iterating at the beginning.
 * - One to the array from the current index until the end, to efficiently step forward.
 */
class MerkleArray<T> implements MerkleListIterator<T> {
  // fixed parts
  readonly data: Unconstrained<WithHash<T>[]>;
  readonly hash: Field;

  // mutable parts
  currentHash: Field;
  currentIndex: Unconstrained<number>;

  constructor(value: MerkleListIterator<T>) {
    Object.assign(this, value);
  }

  static startIterating<T>({ data, hash }: MerkleListBase<T>) {
    return new this({
      data,
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
      Unconstrained.witness(() => this.data.get().length)
    );
    this.currentHash = emptyHash;
  }
  jumpToEndIf(condition: Bool) {
    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.currentIndex.set(this.data.get().length);
      }
    });
    this.currentHash = Provable.if(condition, emptyHash, this.currentHash);
  }

  next() {
    // next corresponds to `pop()` in MerkleList
    // it returns a dummy element if we're at the end of the array
    let { previousHash, element } = Provable.witness(
      WithHash(this.innerProvable),
      () =>
        this.data.get()[this.currentIndex.get()] ?? {
          previousHash: emptyHash,
          element: this.innerProvable.empty(),
        }
    );

    let isDummy = this.isAtEnd();
    let correctHash = this.nextHash(previousHash, element);
    let requiredHash = Provable.if(isDummy, emptyHash, correctHash);
    this.currentHash.assertEquals(requiredHash);

    this.currentIndex.updateAsProver((i) =>
      Math.min(i + 1, this.data.get().length)
    );
    this.currentHash = Provable.if(isDummy, emptyHash, previousHash);

    return Provable.if(
      isDummy,
      this.innerProvable,
      this.innerProvable.empty(),
      element
    );
  }

  clone(): MerkleArray<T> {
    let data = Unconstrained.witness(() => [...this.data.get()]);
    let currentIndex = Unconstrained.witness(() => this.currentIndex.get());
    return new this.Constructor({
      data,
      hash: this.hash,
      currentHash: this.currentHash,
      currentIndex,
    });
  }

  /**
   * Create a Merkle array type
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
        hash: Field,
        data: Unconstrained.provable,
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
          data: Unconstrained.from(arrayWithHashes),
          hash: currentHash,
          currentHash,
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
  static _nextHash: ((hash: Field, value: any) => Field) | undefined;

  static _provable: ProvableHashable<MerkleArray<any>> | undefined;
  static _innerProvable: ProvableHashable<any> | undefined;

  get Constructor() {
    return this.constructor as typeof MerkleArray;
  }

  nextHash(hash: Field, value: T): Field {
    assert(
      this.Constructor._nextHash !== undefined,
      'MerkleArray not initialized'
    );
    return this.Constructor._nextHash(hash, value);
  }

  get innerProvable(): ProvableHashable<T> {
    assert(
      this.Constructor._innerProvable !== undefined,
      'MerkleArray not initialized'
    );
    return this.Constructor._innerProvable;
  }
}

// hash helpers

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
