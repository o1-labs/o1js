import { Bool, Field } from './wrapped.js';
import { Provable } from './provable.js';
import { Struct } from './types/struct.js';
import { assert } from './gadgets/common.js';
import { provableFromClass } from './types/provable-derivers.js';
import { Poseidon, packToFields, ProvableHashable } from './crypto/poseidon.js';
import { Unconstrained } from './types/unconstrained.js';
import { ProvableType, WithProvable } from './types/provable-intf.js';
import { Option } from './option.js';

export {
  MerkleListBase,
  MerkleList,
  MerkleListIteratorBase,
  MerkleListIterator,
  WithHash,
  emptyHash,
  genericHash,
  merkleListHash,
  withHashes,
};

// common base types for both MerkleList and MerkleListIterator

const emptyHash = Field(0);

type WithHash<T> = { previousHash: Field; element: T };

function WithHash<T>(type: ProvableHashable<T>): ProvableHashable<WithHash<T>> {
  return Struct({ previousHash: Field, element: type });
}
function toConstant<T>(type: Provable<T>, node: WithHash<T>): WithHash<T> {
  return {
    previousHash: node.previousHash.toConstant(),
    element: Provable.toConstant(type, node.element),
  };
}

/**
 * Common base type for {@link MerkleList} and {@link MerkleListIterator}
 */
type MerkleListBase<T> = {
  hash: Field;
  data: Unconstrained<WithHash<T>[]>;
};

function MerkleListBase<T>(): ProvableHashable<MerkleListBase<T>> {
  return class extends Struct({ hash: Field, data: Unconstrained }) {
    static empty(): MerkleListBase<T> {
      return { hash: emptyHash, data: Unconstrained.from([]) };
    }
  };
}

// merkle list

/**
 * Dynamic-length list which is represented as a single hash
 *
 * Supported operations are {@link push()} and {@link pop()} and some variants thereof.
 *
 *
 * A Merkle list is generic over its element types, so before using it you must create a subclass for your element type:
 *
 * ```ts
 * class MyList extends MerkleList.create(MyType) {}
 *
 * // now use it
 * let list = MyList.empty();
 *
 * list.push(new MyType(...));
 *
 * let element = list.pop();
 * ```
 *
 * Internal detail: `push()` adds elements to the _start_ of the internal array and `pop()` removes them from the start.
 * This is so that the hash which represents the list is consistent with {@link MerkleListIterator},
 * and so a `MerkleList` can be used as input to `MerkleListIterator.startIterating(list)`
 * (which will then iterate starting from the last pushed element).
 */
class MerkleList<T> implements MerkleListBase<T> {
  hash: Field;
  data: Unconstrained<WithHash<T>[]>;

  constructor({ hash, data }: MerkleListBase<T>) {
    this.hash = hash;
    this.data = data;
  }

  isEmpty() {
    return this.hash.equals(this.Constructor.emptyHash);
  }

  /**
   * Push a new element to the list.
   */
  push(element: T) {
    let previousHash = this.hash;
    this.hash = this.nextHash(previousHash, element);
    this.data.updateAsProver((data) => [
      toConstant(this.innerProvable, { previousHash, element }),
      ...data,
    ]);
  }

  /**
   * Push a new element to the list, if the `condition` is true.
   */
  pushIf(condition: Bool, element: T) {
    let previousHash = this.hash;

    this.hash = Provable.if(condition, this.nextHash(previousHash, element), previousHash);
    this.data.updateAsProver((data) =>
      condition.toBoolean()
        ? [toConstant(this.innerProvable, { previousHash, element }), ...data]
        : data
    );
  }

  private popWitness() {
    return Provable.witness(WithHash(this.innerProvable), () => {
      let [value, ...data] = this.data.get();
      let head = value ?? {
        previousHash: this.Constructor.emptyHash,
        element: this.innerProvable.empty(),
      };
      this.data.set(data);
      return head;
    });
  }

  /**
   * Remove the last element from the list and return it.
   *
   * This proves that the list is non-empty, and fails otherwise.
   */
  popExn(): T {
    let { previousHash, element } = this.popWitness();

    let currentHash = this.nextHash(previousHash, element);
    this.hash.assertEquals(currentHash);

    this.hash = previousHash;
    return element;
  }

  /**
   * Remove the last element from the list and return it.
   *
   * If the list is empty, returns a dummy element.
   */
  pop(): T {
    let { previousHash, element } = this.popWitness();
    let isEmpty = this.isEmpty();
    let emptyHash = this.Constructor.emptyHash;

    let currentHash = this.nextHash(previousHash, element);
    currentHash = Provable.if(isEmpty, emptyHash, currentHash);
    this.hash.assertEquals(currentHash);

    this.hash = Provable.if(isEmpty, emptyHash, previousHash);
    let provable = this.innerProvable;
    return Provable.if(isEmpty, provable, provable.empty(), element);
  }

  /**
   * Remove the last element from the list and return it as an option:
   * Some(element) if the list is non-empty, None if the list is empty.
   *
   * **Warning**: If the list is empty, the the option's .value is entirely unconstrained.
   */
  popOption(): Option<T> {
    let { previousHash, element } = this.popWitness();
    let isEmpty = this.isEmpty();
    let emptyHash = this.Constructor.emptyHash;

    let currentHash = this.nextHash(previousHash, element);
    currentHash = Provable.if(isEmpty, emptyHash, currentHash);
    this.hash.assertEquals(currentHash);

    this.hash = Provable.if(isEmpty, emptyHash, previousHash);
    let provable = this.innerProvable;
    const OptionT = Option(provable);
    return new OptionT({ isSome: isEmpty.not(), value: element });
  }

  /**
   * Return the last element, but only remove it if `condition` is true.
   *
   * If the list is empty, returns a dummy element.
   */
  popIf(condition: Bool) {
    let originalHash = this.hash;
    let element = this.pop();

    // if the condition is false, we restore the original state
    this.data.updateAsProver((data) => {
      let node = { previousHash: this.hash, element };
      return condition.toBoolean() ? data : [toConstant(this.innerProvable, node), ...data];
    });
    this.hash = Provable.if(condition, this.hash, originalHash);

    return element;
  }

  /**
   * Low-level, minimal version of `pop()` which lets the _caller_ decide whether there is an element to pop.
   *
   * I.e. this proves:
   * - If the input condition is true, this returns the last element and removes it from the list.
   * - If the input condition is false, the list is unchanged and the return value is garbage.
   *
   * Note that if the caller passes `true` but the list is empty, this will fail.
   * If the caller passes `false` but the list is non-empty, this succeeds and just doesn't pop off an element.
   */
  popIfUnsafe(shouldPop: Bool) {
    let { previousHash, element } = Provable.witness(WithHash(this.innerProvable), () => {
      let dummy = {
        previousHash: this.hash,
        element: this.innerProvable.empty(),
      };
      if (!shouldPop.toBoolean()) return dummy;
      let [value, ...data] = this.data.get();
      this.data.set(data);
      return value ?? dummy;
    });

    let nextHash = this.nextHash(previousHash, element);
    let currentHash = Provable.if(shouldPop, nextHash, this.hash);
    this.hash.assertEquals(currentHash);
    this.hash = Provable.if(shouldPop, previousHash, this.hash);

    return element;
  }

  clone(): MerkleList<T> {
    let data = Unconstrained.witness(() => [...this.data.get()]);
    return new this.Constructor({ hash: this.hash, data });
  }

  /**
   * Iterate through the list in a fixed number of steps any apply a given callback on each element.
   *
   * Proves that the iteration traverses the entire list.
   * Once past the last element, dummy elements will be passed to the callback.
   *
   * Note: There are no guarantees about the contents of dummy elements, so the callback is expected
   * to handle the `isDummy` flag separately.
   */
  forEach(length: number, callback: (element: T, isDummy: Bool, i: number) => void) {
    let iter = this.startIterating();
    for (let i = 0; i < length; i++) {
      let { element, isDummy } = iter.Unsafe.next();
      callback(element, isDummy, i);
    }
    iter.assertAtEnd(`Expected MerkleList to have at most ${length} elements, but it has more.`);
  }

  startIterating(): MerkleListIterator<T> {
    let merkleArray = MerkleListIterator.createFromList<T>(this.Constructor);
    return merkleArray.startIterating(this);
  }

  startIteratingFromLast(): MerkleListIterator<T> {
    let merkleArray = MerkleListIterator.createFromList<T>(this.Constructor);
    return merkleArray.startIteratingFromLast(this);
  }

  toArrayUnconstrained(): Unconstrained<T[]> {
    return Unconstrained.witness(() => [...this.data.get()].reverse().map((x) => x.element));
  }

  lengthUnconstrained(): Unconstrained<number> {
    return Unconstrained.witness(() => this.data.get().length);
  }

  /**
   * Create a Merkle list type
   *
   * Optionally, you can tell `create()` how to do the hash that pushes a new list element, by passing a `nextHash` function.
   *
   * @example
   * ```ts
   * class MyList extends MerkleList.create(Field, (hash, x) =>
   *   Poseidon.hashWithPrefix('custom', [hash, x])
   * ) {}
   * ```
   */
  static create<T>(
    type: WithProvable<ProvableHashable<T>>,
    nextHash: (hash: Field, value: T) => Field = merkleListHash(ProvableType.get(type)),
    emptyHash_ = emptyHash
  ): typeof MerkleList<T> & {
    // override static methods with strict types
    empty: () => MerkleList<T>;
    from: (array: T[]) => MerkleList<T>;
    fromReverse: (array: T[]) => MerkleList<T>;
    provable: ProvableHashable<MerkleList<T>>;
  } {
    let provable = ProvableType.get(type);

    class MerkleListTBase extends MerkleList<T> {
      static _innerProvable = provable;

      static _provable = provableFromClass(MerkleListTBase, {
        hash: Field,
        data: Unconstrained,
      }) satisfies ProvableHashable<MerkleList<T>> as ProvableHashable<MerkleList<T>>;

      static _nextHash = nextHash;
      static _emptyHash = emptyHash_;

      static empty(): MerkleList<T> {
        return new this({ hash: emptyHash_, data: Unconstrained.from([]) });
      }

      static from(array: T[]): MerkleList<T> {
        array = [...array].reverse();
        let { hash, data } = withHashes(array, nextHash, emptyHash_);
        let unconstrained = Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
        return new this({ data: unconstrained, hash });
      }

      static fromReverse(array: T[]): MerkleList<T> {
        let { hash, data } = withHashes(array, nextHash, emptyHash_);
        let unconstrained = Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
        return new this({ data: unconstrained, hash });
      }

      static get provable(): ProvableHashable<MerkleList<T>> {
        assert(this._provable !== undefined, 'MerkleList not initialized');
        return this._provable;
      }
      static set provable(_provable: ProvableHashable<MerkleList<T>>) {
        this._provable = _provable;
      }
    }
    // override `instanceof` for subclasses
    return class MerkleListT extends MerkleListTBase {
      static [Symbol.hasInstance](x: any): boolean {
        return x instanceof MerkleListTBase;
      }
    };
  }

  // dynamic subclassing infra
  static _nextHash: ((hash: Field, t: any) => Field) | undefined;
  static _emptyHash: Field | undefined;

  static _provable: ProvableHashable<MerkleList<any>> | undefined;
  static _innerProvable: ProvableHashable<any> | undefined;

  get Constructor() {
    return this.constructor as typeof MerkleList;
  }

  nextHash(hash: Field, value: T): Field {
    assert(this.Constructor._nextHash !== undefined, 'MerkleList not initialized');
    return this.Constructor._nextHash(hash, value);
  }

  static get emptyHash() {
    assert(this._emptyHash !== undefined, 'MerkleList not initialized');
    return this._emptyHash;
  }

  get innerProvable(): ProvableHashable<T> {
    assert(this.Constructor._innerProvable !== undefined, 'MerkleList not initialized');
    return this.Constructor._innerProvable;
  }
}

// merkle list iterator

type MerkleListIteratorBase<T> = {
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
 * MerkleListIterator helps iterating through a Merkle list.
 * This works similar to calling `list.pop()` or `list.push()` repeatedly, but maintaining the entire list instead of removing elements.
 *
 * The core methods that support iteration are {@link next()} and {@link previous()}.
 *
 * ```ts
 * let iterator = MerkleListIterator.startIterating(list);
 *
 * let firstElement = iterator.next();
 * ```
 *
 * We maintain two commitments:
 * - One to the entire array, to be able to prove that we end iteration at the correct point.
 * - One to the array from the current index until the end, to efficiently step forward.
 */
class MerkleListIterator<T> implements MerkleListIteratorBase<T> {
  // fixed parts
  readonly data: Unconstrained<WithHash<T>[]>;
  readonly hash: Field;

  // mutable parts
  currentHash: Field;
  currentIndex: Unconstrained<number>;

  constructor(value: MerkleListIteratorBase<T>) {
    Object.assign(this, value);
  }

  assertAtStart() {
    return this.currentHash.assertEquals(this.Constructor.emptyHash);
  }

  isAtEnd() {
    return this.currentHash.equals(this.hash);
  }

  jumpToEnd() {
    this.currentIndex.setTo(Unconstrained.witness(() => 0));
    this.currentHash = this.hash;
  }

  jumpToEndIf(condition: Bool) {
    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.currentIndex.set(0);
      }
    });
    this.currentHash = Provable.if(condition, this.hash, this.currentHash);
  }

  assertAtEnd(message?: string) {
    return this.currentHash.assertEquals(
      this.hash,
      message ?? 'Merkle list iterator is not at the end'
    );
  }

  isAtStart() {
    return this.currentHash.equals(this.Constructor.emptyHash);
  }

  jumpToStart() {
    this.currentIndex.setTo(Unconstrained.witness(() => this.data.get().length));
    this.currentHash = this.Constructor.emptyHash;
  }

  jumpToStartIf(condition: Bool) {
    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.currentIndex.set(this.data.get().length);
      }
    });
    this.currentHash = Provable.if(condition, this.Constructor.emptyHash, this.currentHash);
  }

  _index(direction: 'next' | 'previous', i?: number) {
    i ??= this.currentIndex.get();
    if (direction === 'next') {
      return Math.min(Math.max(i, -1), this.data.get().length - 1);
    } else {
      return Math.max(Math.min(i, this.data.get().length), 0);
    }
  }
  _updateIndex(direction: 'next' | 'previous') {
    this.currentIndex.updateAsProver(() => {
      let i = this._index(direction);
      return this._index(direction, direction === 'next' ? i - 1 : i + 1);
    });
  }

  previous() {
    // `previous()` corresponds to `pop()` in MerkleList
    // it returns a dummy element if we're at the start of the array
    let { previousHash, element } = Provable.witness(
      WithHash(this.innerProvable),
      () =>
        this.data.get()[this._index('previous')] ?? {
          previousHash: this.Constructor.emptyHash,
          element: this.innerProvable.empty(),
        }
    );

    let isDummy = this.isAtStart();
    let emptyHash = this.Constructor.emptyHash;
    let correctHash = this.nextHash(previousHash, element);
    let requiredHash = Provable.if(isDummy, emptyHash, correctHash);

    this.currentHash.assertEquals(requiredHash);

    this._updateIndex('previous');

    this.currentHash = Provable.if(isDummy, emptyHash, previousHash);

    return Provable.if(isDummy, this.innerProvable, this.innerProvable.empty(), element);
  }

  next() {
    // instead of starting from index `0`, we start at index `length - 1` and go in reverse
    // this is like MerkleList.push() but we witness the next element instead of taking it as input,
    // and we return a dummy element if we're at the end of the array
    let element = Provable.witness(
      this.innerProvable,
      () => this.data.get()[this._index('next')]?.element ?? this.innerProvable.empty()
    );

    let isDummy = this.isAtEnd();
    let currentHash = this.nextHash(this.currentHash, element);
    this.currentHash = Provable.if(isDummy, this.hash, currentHash);
    this._updateIndex('next');

    return Provable.if(isDummy, this.innerProvable, this.innerProvable.empty(), element);
  }

  /**
   * Low-level APIs for advanced uses
   */
  get Unsafe() {
    let self = this;
    return {
      /**
       * Version of {@link previous} which doesn't guarantee anything about
       * the returned element in case the iterator is at the start.
       *
       * Instead, the `isDummy` flag is also returned so that this case can
       * be handled in a custom way.
       */
      previous() {
        let { previousHash, element } = Provable.witness(
          WithHash(self.innerProvable),
          () =>
            self.data.get()[self._index('previous')] ?? {
              previousHash: self.Constructor.emptyHash,
              element: self.innerProvable.empty(),
            }
        );

        let isDummy = self.isAtStart();
        let emptyHash = self.Constructor.emptyHash;
        let correctHash = self.nextHash(previousHash, element);
        let requiredHash = Provable.if(isDummy, emptyHash, correctHash);

        self.currentHash.assertEquals(requiredHash);

        self._updateIndex('previous');
        self.currentHash = Provable.if(isDummy, emptyHash, previousHash);
        return { element, isDummy };
      },

      /**
       * Version of {@link next} which doesn't guarantee anything about
       * the returned element in case the iterator is at the end.
       *
       * Instead, the `isDummy` flag is also returned so that this case can
       * be handled in a custom way.
       */
      next() {
        let element = Provable.witness(self.innerProvable, () => {
          return self.data.get()[self._index('next')]?.element ?? self.innerProvable.empty();
        });

        let isDummy = self.isAtEnd();
        let currentHash = self.nextHash(self.currentHash, element);
        self.currentHash = Provable.if(isDummy, self.hash, currentHash);
        self._updateIndex('next');

        return { element, isDummy };
      },
    };
  }

  clone(): MerkleListIterator<T> {
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
    type: WithProvable<ProvableHashable<T>>,
    nextHash: (hash: Field, value: T) => Field = merkleListHash(ProvableType.get(type)),
    emptyHash_ = emptyHash
  ): typeof MerkleListIterator<T> & {
    from: (array: T[]) => MerkleListIterator<T>;
    startIterating: (list: MerkleListBase<T>) => MerkleListIterator<T>;
    startIteratingFromLast: (list: MerkleListBase<T>) => MerkleListIterator<T>;
    empty: () => MerkleListIterator<T>;
    provable: ProvableHashable<MerkleListIterator<T>>;
  } {
    let provable = ProvableType.get(type);
    return class Iterator extends MerkleListIterator<T> {
      static _innerProvable = ProvableType.get(provable);

      static _provable = provableFromClass(Iterator, {
        hash: Field,
        data: Unconstrained,
        currentHash: Field,
        currentIndex: Unconstrained,
      }) satisfies ProvableHashable<MerkleListIterator<T>> as ProvableHashable<
        MerkleListIterator<T>
      >;

      static _nextHash = nextHash;
      static _emptyHash = emptyHash_;

      static from(array: T[]): MerkleListIterator<T> {
        let { hash, data } = withHashes(array, nextHash, emptyHash_);
        let unconstrained = Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
        return this.startIterating({ data: unconstrained, hash });
      }

      static fromLast(array: T[]): MerkleListIterator<T> {
        array = [...array].reverse();
        let { hash, data } = withHashes(array, nextHash, emptyHash_);
        let unconstrained = Unconstrained.witness(() => data.map((x) => toConstant(provable, x)));
        return this.startIteratingFromLast({ data: unconstrained, hash });
      }

      static startIterating({ data, hash }: MerkleListBase<T>): MerkleListIterator<T> {
        return new this({
          data,
          hash,
          currentHash: emptyHash_,
          // note: for an empty list or any list which is "at the end", the currentIndex is -1
          currentIndex: Unconstrained.witness(() => data.get().length - 1),
        });
      }

      static startIteratingFromLast({ data, hash }: MerkleListBase<T>): MerkleListIterator<T> {
        return new this({
          data,
          hash,
          currentHash: hash,
          currentIndex: Unconstrained.from(0),
        });
      }

      static empty(): MerkleListIterator<T> {
        return this.from([]);
      }

      static get provable(): ProvableHashable<MerkleListIterator<T>> {
        assert(this._provable !== undefined, 'MerkleListIterator not initialized');
        return this._provable;
      }
    };
  }

  static createFromList<T>(merkleList: typeof MerkleList<T>) {
    return this.create<T>(
      merkleList.prototype.innerProvable,
      merkleList._nextHash,
      merkleList.emptyHash
    );
  }

  // dynamic subclassing infra
  static _nextHash: ((hash: Field, value: any) => Field) | undefined;
  static _emptyHash: Field | undefined;

  static _provable: ProvableHashable<MerkleListIterator<any>> | undefined;
  static _innerProvable: ProvableHashable<any> | undefined;

  get Constructor() {
    return this.constructor as typeof MerkleListIterator;
  }

  nextHash(hash: Field, value: T): Field {
    assert(this.Constructor._nextHash !== undefined, 'MerkleListIterator not initialized');
    return this.Constructor._nextHash(hash, value);
  }

  static get emptyHash() {
    assert(this._emptyHash !== undefined, 'MerkleList not initialized');
    return this._emptyHash;
  }

  get innerProvable(): ProvableHashable<T> {
    assert(this.Constructor._innerProvable !== undefined, 'MerkleListIterator not initialized');
    return this.Constructor._innerProvable;
  }
}

// hash helpers

function genericHash<T>(provable: ProvableHashable<T>, prefix: string, value: T) {
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

function withHashes<T>(
  data: T[],
  nextHash: (hash: Field, value: T) => Field,
  emptyHash: Field
): { data: WithHash<T>[]; hash: Field } {
  let n = data.length;
  let arrayWithHashes = Array<WithHash<T>>(n);
  let currentHash = emptyHash;

  for (let i = n - 1; i >= 0; i--) {
    arrayWithHashes[i] = { previousHash: currentHash, element: data[i] };
    currentHash = nextHash(currentHash, data[i]);
  }

  return { data: arrayWithHashes, hash: currentHash };
}
