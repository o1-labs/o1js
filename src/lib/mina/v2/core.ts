import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt64 } from '../../provable/int.js';
import { Provable } from '../../provable/types/provable-intf.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';

export {
  Option,
  Range,
  MinaAmount,
  mapUndefined,
  Empty,
  Update,
  Compare,
  Eq,
  ToFields,
  Tuple,
  ProvableTuple,
  ProvableInstance,
  ProvableTupleInstances,
};

const { Option, Range } = Bindings.Leaves;
type Option<T> = Bindings.Leaves.Option<T>;
type Range<T> = Bindings.Leaves.Range<T>;

// TODO: constructors from Mina and NanoMina
type MinaAmount = UInt64;

function mapUndefined<A, B>(value: A | undefined, f: (a: A) => B): B | undefined {
  return value === undefined ? undefined : f(value);
}

interface Empty<T> {
  empty: () => T;
}

interface Eq<T extends Eq<T>> {
  equals(x: T): Bool;
}

type Compare<T extends Compare<T>> = Eq<T> & {
  lessThan(x: T): Bool;
  lessThanOrEqual(x: T): Bool;
  greaterThan(x: T): Bool;
  greaterThanOrEqual(x: T): Bool;
};

interface ToFields {
  toFields(): Field[];
}

type Tuple<T> = [T, ...T[]] | [];

type ProvableTuple = Tuple<Provable<any>>;

type ProvableInstance<P> = P extends Provable<infer T> ? (unknown extends T ? T : never) : never;

type ProvableTupleInstances<T extends ProvableTuple> = {
  [I in keyof T]: ProvableInstance<T[I]>;
};

class Update<T> {
  constructor(public set: Bool, public value: T) {}

  toOption(): Option<T> {
    return { isSome: this.set, value: this.value };
  }

  static fromOption<T>(option: Option<T>): Update<T> {
    return new Update(option.isSome, option.value);
  }

  static disabled<T>(defaultValue: T): Update<T> {
    return new Update(new Bool(false), defaultValue);
  }

  static set<T>(value: T): Update<T> {
    return new Update(new Bool(true), value);
  }

  static from<T>(value: Update<T> | T | undefined, defaultValue: T): Update<T> {
    if (value instanceof Update) {
      return value;
    } else if (value !== undefined) {
      return Update.set(value);
    } else {
      return Update.disabled(defaultValue);
    }
  }
}
