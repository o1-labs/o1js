import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Provable } from '../../provable/types/provable-intf.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { bytesToBits, stringToBytes } from '../../../bindings/lib/binable.js';
import { GenericHashInput } from '../../../bindings/lib/generic.js';
import { hashWithPrefix, packToFields } from '../../../lib/provable/crypto/poseidon.js';
import { prefixes } from '../../../bindings/crypto/constants.js';
import { Types } from '../../../bindings/mina-transaction/v1/types.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { provable } from '../../provable/types/provable-derivers.js';

export {
  Option,
  Range,
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
  TokenId,
  ZkappUri,
  mapObject,
};

// boo typescript
function mapObject<In extends { [key: string]: any }, Out extends { [key in keyof In]: any }>(
  object: In,
  f: <Key extends keyof In>(key: Key) => Out[Key]
): { [key in keyof In]: Out[key] } {
  const newObject: Partial<{ [key in keyof In]: Out[key] }> = {};
  for (const key in object) {
    newObject[key] = f(key);
  }
  return newObject as { [key in keyof In]: Out[key] };
}

const { Option, Range } = Bindings.Leaves;
type Option<T> = Bindings.Leaves.Option<T>;
type Range<T> = Bindings.Leaves.Range<T>;

class ZkappUri {
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

class TokenId {
  constructor(public value: Field) {}

  equals(x: TokenId): Bool {
    return this.value.equals(x.value);
  }

  toString(): string {
    return this.value.toString();
  }

  static MINA: TokenId = new TokenId(new Field(1));

  /**
   * Derives a TokenId from a token owner's public key and a parent token ID.
   * This implementation exactly matches the OCaml code in Mina Protocol:
   * 
   * @param tokenOwner - The public key of the token owner.
   * @param parentTokenId - The parent token ID (defaults to MINA token ID).
   * @returns A new TokenId.
   */
  static derive(tokenOwner: PublicKey, parentTokenId: Field = new Field(1)): TokenId {
    // Define an AccountId with the specified fields
    const AccountId = { tokenOwner, parentTokenId };
    
    // Create input directly
    const input: GenericHashInput<Field> = {
      fields: [...PublicKey.toFields(AccountId.tokenOwner), AccountId.parentTokenId]
    };
    
    // First pack the input (Random_oracle.pack_input), then hash with the prefix
    const packed = packToFields(input);
    // hashWithPrefix returns a value that needs to be cast to Field
    // The result is actually a Field but TypeScript doesn't know that
    const hash = hashWithPrefix(prefixes.deriveTokenId, packed) as Field;
    
    return new TokenId(hash);
  }
}

function mapUndefined<A, B>(value: A | undefined, f: (a: A) => B): B | undefined {
  return value === undefined ? undefined : f(value);
}

interface Empty<T> {
  empty: () => T;
}

interface Eq<T> {
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
