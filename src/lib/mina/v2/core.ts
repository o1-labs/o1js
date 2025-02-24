import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { Provable } from '../../provable/types/provable-intf.js';
import { protocolVersions } from '../../../bindings/crypto/constants.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';

export {
  Option,
  Range,
  MAX_ZKAPP_STATE_FIELDS,
  ACCOUNT_ACTION_STATE_BUFFER_SIZE,
  CURRENT_TRANSACTION_VERSION,
  ACCOUNT_CREATION_FEE,
};

const { Option, Range } = Bindings.Leaves;
type Option<T> = Bindings.Leaves.Option<T>;
type Range<T> = Bindings.Leaves.Range<T>;

const MAX_ZKAPP_STATE_FIELDS = 8 as const;
const ACCOUNT_ACTION_STATE_BUFFER_SIZE = 5 as const;
const CURRENT_TRANSACTION_VERSION = UInt32.from(protocolVersions.txnVersion);
const ACCOUNT_CREATION_FEE = UInt64.from(10 ** 9);

// TODO: constructors from Mina and NanoMina
export type MinaAmount = UInt64;

export function mapUndefined<A, B>(value: A | undefined, f: (a: A) => B): B | undefined {
  return value === undefined ? undefined : f(value);
}

export interface Empty<T> {
  empty: () => T;
}

export interface Eq<T extends Eq<T>> {
  equals(x: T): Bool;
}

export type Compare<T extends Compare<T>> = Eq<T> & {
  lessThan(x: T): Bool;
  lessThanOrEqual(x: T): Bool;
  greaterThan(x: T): Bool;
  greaterThanOrEqual(x: T): Bool;
};

export interface ToFields {
  toFields(): Field[];
}

export type Tuple<T> = [T, ...T[]] | [];

export type ProvableTuple = Tuple<Provable<any>>;

export type ProvableInstance<P> = P extends Provable<infer T>
  ? unknown extends T
    ? T
    : never
  : never;

export type ProvableTupleInstances<T extends ProvableTuple> = {
  [I in keyof T]: ProvableInstance<T[I]>;
};

export type Constructor<T> = new (...args: any[]) => T;

export class Update<T> {
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
