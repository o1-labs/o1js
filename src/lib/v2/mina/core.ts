import { VerificationKey } from '../../proof-system/zkprogram.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { Field as WrappedField } from '../../provable/wrapped.js';
import {
  hashWithPrefix,
  packToFields,
} from '../../provable/crypto/poseidon.js';
import { Provable } from '../../provable/types/provable-intf.js';
import {
  mocks,
  prefixes,
  protocolVersions,
} from '../../../bindings/crypto/constants.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { Types } from '../../../bindings/mina-transaction/types.js';
import {
  bytesToBits,
  prefixToField,
  stringLengthInBytes,
  stringToBytes,
} from '../../../bindings/lib/binable.js';
import { GenericHashInput } from '../../../bindings/lib/generic.js';

export import Option = Bindings.Leaves.Option;
export import Range = Bindings.Leaves.Range;

export const MAX_ZKAPP_STATE_FIELDS = 8;

export const MAX_TOKEN_SYMBOL_LENGTH = 6;

export const ACCOUNT_ACTION_STATE_BUFFER_SIZE = 5;

export const CURRENT_TRANSACTION_VERSION = UInt32.from(
  protocolVersions.txnVersion
);

export const ACCOUNT_CREATION_FEE = UInt64.from(10 ** 9);

export function DUMMY_VERIFICATION_KEY(): VerificationKey {
  return {
    data: '' /* TODO */,
    hash: new Field(mocks.dummyVerificationKeyHash),
  };
}

// TODO: constructors from Mina and NanoMina
export type MinaAmount = UInt64;

export function mapUndefined<A, B>(
  value: A | undefined,
  f: (a: A) => B
): B | undefined {
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

// credit goes to https://github.com/microsoft/TypeScript/issues/27024#issuecomment-421529650
export type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

export type Tuple<T> = [T, ...T[]] | [];

export type ProvableTuple = Tuple<Provable<any>>;

// TODO: IMPORTANT -- we want this type definition, since not having it hides bugs
//                    fortunately, there is one such bug I want to hide right now... lol
//                    (ProvableTupleInstances is infering any)
// export type ProvableInstance<P> = P extends Provable<infer T>
//   ? Equals<T, any> extends true
//     ? 'this type does not properly implement provable: the instance type cannot be inferred'
//     : T
//   : never;

export type ProvableInstance<P> = P extends Provable<infer T>
  ? T
  : never;

export type ProvableTupleInstances<T extends ProvableTuple> = {
  [I in keyof T]: ProvableInstance<T[I]>;
};

export type Constructor<T> = new (...args: any[]) => T;

// TODO
export class TokenId {
  // TODO: construct this from it's parts, don't pass in the raw Field directly
  constructor(public value: Field) {}

  equals(x: TokenId): Bool {
    return this.value.equals(x.value);
  }

  toString(): string {
    return this.value.toString();
  }

  static MINA: TokenId = new TokenId(new Field(1));
}

export class ZkappUri {
  readonly data: string;
  readonly hash: Field;

  constructor(uri: string | { data: string; hash: Field }) {
    if (typeof uri === 'object') {
      this.data = uri.data;
      this.hash = uri.hash;
    } else {
      this.data = uri;

      let packed: Field[];
      if (uri.length === 0) {
        packed = [new Field(0), new Field(0)];
      } else {
        const bits = bytesToBits(stringToBytes(uri));
        bits.push(true);
        const input: GenericHashInput<Field> = {
          packed: bits.map((b) => [new Field(Number(b)), 1]),
        };
        packed = packToFields(input);
      }

      this.hash = hashWithPrefix(prefixes.zkappUri, packed);
    }
  }

  toJSON(): Types.Json.AccountUpdate['body']['update']['zkappUri'] {
    return this.data.toString();
  }

  static empty(): ZkappUri {
    return new ZkappUri('');
  }

  static from(uri: ZkappUri | string): ZkappUri {
    return uri instanceof ZkappUri ? uri : new ZkappUri(uri);
  }
}

// TODO NOW -- figure out a better way to combine this and the bindings leaves version
export class TokenSymbol {
  readonly symbol: string;
  readonly field: Field;

  constructor(symbol: string | { symbol: string; field: Field }) {
    if (typeof symbol === 'object') {
      this.symbol = symbol.symbol;
      this.field = symbol.field;
    } else {
      let bytesLength = stringLengthInBytes(symbol);
      if (bytesLength > MAX_TOKEN_SYMBOL_LENGTH) {
        throw Error(
          `Token symbol ${symbol} should be a maximum of ${MAX_TOKEN_SYMBOL_LENGTH} bytes, but is ${bytesLength}`
        );
      }

      this.symbol = symbol;
      this.field = prefixToField(WrappedField, symbol);
    }
  }

  toJSON(): Types.Json.AccountUpdate['body']['update']['tokenSymbol'] {
    return this.symbol.toString();
  }

  static empty(): TokenSymbol {
    return new TokenSymbol('');
  }

  static from(symbol: TokenSymbol | string): TokenSymbol {
    return symbol instanceof TokenSymbol ? symbol : new TokenSymbol(symbol);
  }
}

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
