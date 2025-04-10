import * as BindingsLeaves from './leaves.js'
import { FieldsDecoder, ProvableSerializable } from './util.js';
import { versionBytes } from '../../crypto/constants.js';
import { Provable } from '../../../lib/provable/provable.js';
import { HashInput } from '../../../lib/provable/types/provable-derivers.js'
import { toBase58Check } from '../../../lib/util/base58.js';

const JsArray = Array;

abstract class ProvableBindingsType<T, Actual> {
  abstract Type(): ProvableSerializable<Actual>;

  sizeInFields(): number {
    return this.Type().sizeInFields();
  }

  toJSON(x: T): any {
    return this.Type().toJSON(x as never as Actual);
  }

  toInput(x: T): HashInput {
    return this.Type().toInput(x as never as Actual);
  }

  toFields(x: T): BindingsLeaves.Field[] {
    return this.Type().toFields(x as never as Actual);
  }

  toAuxiliary(x?: T): any[] {
    return this.Type().toAuxiliary(x as never as Actual);
  }

  fromFields(fields: BindingsLeaves.Field[], aux: any[]): T {
    return this.Type().fromFields(fields, aux) as never as T
  }

  toValue(x: T): T {
    return x;
  }

  fromValue(x: T): T {
    return x;
  }

  check(x: T) {
    return this.Type().check(x as never as Actual);
  }
}

export type BindingsType<T> =
  | BindingsType.Leaf<T>
  | BindingsType.Object<T>
  | BindingsType.Option<T>
  | BindingsType.Array<T>;

function assertBindingsTypeImplementsProvable<T, B extends BindingsType<T> & ProvableSerializable<T>>(_x?: B) {}

assertBindingsTypeImplementsProvable<number, BindingsType<number>>();
assertBindingsTypeImplementsProvable<string, BindingsType<string>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.AuthRequired, BindingsType<BindingsLeaves.AuthRequired>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.Bool, BindingsType<BindingsLeaves.Bool>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.Field, BindingsType<BindingsLeaves.Field>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.PublicKey, BindingsType<BindingsLeaves.PublicKey>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.Sign, BindingsType<BindingsLeaves.Sign>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.TokenId, BindingsType<BindingsLeaves.TokenId>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.TokenSymbol, BindingsType<BindingsLeaves.TokenSymbol>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.UInt32, BindingsType<BindingsLeaves.UInt32>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.UInt64, BindingsType<BindingsLeaves.UInt64>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.ZkappUri, BindingsType<BindingsLeaves.ZkappUri>>();
assertBindingsTypeImplementsProvable<{x: number}, BindingsType<{x: number}>>();
assertBindingsTypeImplementsProvable<number[], BindingsType<number[]>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.Option<number>, BindingsType<BindingsLeaves.Option<number>>>();
assertBindingsTypeImplementsProvable<BindingsLeaves.Option<BindingsLeaves.Range<number>>, BindingsType<BindingsLeaves.Option<BindingsLeaves.Range<number>>>>();

export namespace BindingsType {
  export class Object<T> implements Provable<T> {
    readonly _T!: T extends {[key: string]: any} ? void : never;
    readonly name: string;
    readonly keys: (keyof T)[];
    readonly entries: T extends {[key: string]: any} ? {[key in keyof T]: BindingsType<T[key]>} : never;

    constructor({
      name,
      keys,
      entries
    }: {
      name: Object<T>['name'],
      keys: Object<T>['keys'],
      entries: Object<T>['entries']
    }) {
      this.name = name;
      this.keys = keys;
      this.entries = entries;
    }

    sizeInFields(): number {
      let sum = 0;
      for(const key of this.keys) {
        sum += this.entries[key].sizeInFields();
      }
      return sum;
    }

    toJSON(x: T): any {
      // TODO: type safety
      const x2 = x as {[key in keyof T]: any};
      const json: Partial<T> = {};
      for(const key of this.keys) {
        json[key] = this.entries[key].toJSON(x2[key]);
      }
      return json;
    }

    toInput(x: T): HashInput {
      // TODO: type safety
      const x2 = x as {[key in keyof T]: any};
      const acc: HashInput = { fields: [], packed: [] };
      for(const key of this.keys) {
        // surely there is an optimization here to avoid allocating so many temporary arrays
        const { fields, packed } = this.entries[key].toInput(x2[key]);
        acc.fields!.push(...(fields ?? []));
        acc.packed!.push(...(packed ?? []));
      }
      return acc;
    }

    toFields(x: T): BindingsLeaves.Field[] {
      // TODO: type safety
      const x2 = x as {[key in keyof T]: any};
      return this.keys.map((key) => this.entries[key].toFields(x2[key])).flat();
    }

    toAuxiliary(x?: T): any[] {
      // TODO: type safety
      const x2 = x as {[key in keyof T]: any} | undefined;
      const entries2 = this.entries as {[key in keyof T]: BindingsType<any>};
      return this.keys.map((key) => entries2[key].toAuxiliary(x2 !== undefined ? x2[key] : undefined));
    }

    fromFields(fields: BindingsLeaves.Field[], aux: any[]): T {
      const decoder = new FieldsDecoder(fields);
      // TODO: make this type-safe
      // const obj: Partial<T> = {};
      const obj: any = {};

      for(const i in this.keys) {
        const key = this.keys[i];
        const entryType = this.entries[key];
        const entryAux = aux[i];
        // console.log(`${this.name}[${JSON.stringify(key)}] :: aux = ${JSON.stringify(entryAux)}`);
        obj[key] = decoder.decode(entryType.sizeInFields(), (entryFields) => entryType.fromFields(entryFields, entryAux));
      }

      return obj;
    }

    toValue(x: T): T {
      return x;
    }

    fromValue(x: T): T {
      return x;
    }

    check(_x: T) {
      throw new Error('TODO')
    }
  }

  export class Array<T> implements Provable<T> {
    readonly _T!: T extends any[] ? void : never;
    readonly staticLength: number | null;
    readonly inner: T extends (infer U)[] ? BindingsType<U> : never;

    constructor({
      staticLength,
      inner,
    }: {
      staticLength: Array<T>['staticLength'],
      inner: Array<T>['inner'],
    }) {
      this.staticLength = staticLength;
      this.inner = inner;
    }

    sizeInFields(): number {
      if(this.staticLength !== null) {
        return this.staticLength * this.inner.sizeInFields();
      } else {
        return 0;
      }
    }

    toJSON(x: T extends any[] ? T : never): any {
      // TODO: type safety
      const inner: BindingsType<any> = this.inner;
      return x.map((el) => inner.toJSON(el));
    }

    toInput(x: T): HashInput {
      if(!(x instanceof JsArray)) throw new Error('impossible');

      // TODO: type safety
      const inner: BindingsType<any> = this.inner;
      const acc: HashInput = { fields: [], packed: [] };
      x.forEach((el) => {
        const { fields, packed } = inner.toInput(el);
        acc.fields!.push(...(fields ?? []));
        acc.packed!.push(...(packed ?? []));
      });
      return acc;
    }

    toFields(x: T): BindingsLeaves.Field[] {
      if(!(x instanceof JsArray)) throw new Error('impossible');

      // TODO: type safety
      const inner: BindingsType<any> = this.inner;
      return x.map((el) => inner.toFields(el)).flat();
    }

    toAuxiliary(x?: T): any[] {
      if(this.staticLength !== null) {
        if(x !== undefined) {
          // TODO: type safety
          const x2 = x as any[];
          if(x2.length !== this.staticLength) throw new Error('invalid array length');
          return x2.map((v) => this.inner.toAuxiliary(v));
        } else {
          return new JsArray(this.staticLength).fill(this.inner.toAuxiliary());
        }
      } else {
        // TODO: type safety
        return x as any[];
      }
    }

    fromFields(fields: BindingsLeaves.Field[], aux: any[]): T {
      if(this.staticLength !== null) {
        const decoder = new FieldsDecoder(fields);
        const x = new JsArray();
        for(let i = 0; i < this.staticLength; i++) x[i] = decoder.decode(this.inner.sizeInFields(), (f) => this.inner.fromFields(f, aux[i]));
        // TODO: type safety
        return x as T;
      } else {
        // TODO: type safety
        return aux as T;
      }
    }

    toValue(x: T): T {
      return x;
    }

    fromValue(x: T): T {
      return x;
    }

    check(_x: T) {
      throw new Error('TODO')
    }
  }

  export type Option<T> = Option.OrUndefined<T> | Option.Flagged<T> | Option.ClosedInterval<T>;

  export namespace Option {
    export class OrUndefined<T> implements Provable<T> {
      readonly _T!: T extends infer _U | undefined ? void : never;

      constructor(
        public readonly inner: T extends infer U | undefined ? BindingsType<U> : never
      ) {}

      sizeInFields(): number {
        return 0;
      }

      toJSON(x: T): any {
        // TODO: type safety
        const x2 = x as any | undefined;
        const inner = this.inner as BindingsType<any>;
        return x2 !== undefined ? inner.toJSON(x2) : null;
      }

      toInput(_x: T): any {
        return {}
      }

      toFields(_x: T): BindingsLeaves.Field[] {
        return []
      }

      toAuxiliary(x?: T): any[] {
        return x === undefined ? [false] : [true, this.inner.toAuxiliary(x)]
      }

      fromFields(fields: BindingsLeaves.Field[], aux: any[]): T {
        // TODO: type safety
        return (aux[0] ? this.inner.fromFields(fields, aux[1]) : undefined) as T;
      }

      toValue(x: T): T {
        return x;
      }

      fromValue(x: T): T {
        return x;
      }

      check(_x: T) {
        throw new Error('TODO')
      }
    }

    export class Flagged<T> extends ProvableBindingsType<T, BindingsLeaves.Option<any>> {
      readonly _T!: T extends BindingsLeaves.Option<any> ? void : never;

      constructor(
        public readonly inner: T extends BindingsLeaves.Option<infer U> ? BindingsType<U> : never
      ) {
        super();
      }

      Type() { return BindingsLeaves.Option(this.inner as ProvableSerializable<any>); }
    }

    export class ClosedInterval<T> extends ProvableBindingsType<T, BindingsLeaves.Option<BindingsLeaves.Range<any>>> {
      readonly _T!: T extends BindingsLeaves.Option<BindingsLeaves.Range<any>> ? void : never;

      constructor(
        public readonly inner: T extends BindingsLeaves.Option<BindingsLeaves.Range<infer U>> ? BindingsType<U> : never
      ) {
        super();
      }

      Type() { return BindingsLeaves.Option(BindingsLeaves.Range(this.inner as ProvableSerializable<any>)); }
    }
  }

  export type Leaf<T> =
    | Leaf.Number<T>
    | Leaf.String<T>
    | Leaf.Actions<T>
    | Leaf.AuthRequired<T>
    | Leaf.Bool<T>
    | Leaf.Events<T>
    | Leaf.Field<T>
    | Leaf.Int64<T>
    | Leaf.PublicKey<T>
    | Leaf.Sign<T>
    | Leaf.StateHash<T>
    | Leaf.TokenId<T>
    | Leaf.TokenSymbol<T>
    | Leaf.UInt32<T>
    | Leaf.UInt64<T>
    | Leaf.ZkappUri<T>;

  export namespace Leaf {
    abstract class AuxiliaryLeaf<T> {
      constructor() {}

      sizeInFields(): number {
        return 0;
      }

      toJSON(x: T): any {
        return x;
      }

      toInput(_x: T): HashInput {
        return {};
      }

      toFields(_x: T): BindingsLeaves.Field[] {
        return [];
      }

      toAuxiliary(x?: T): any[] {
        return [x];
      }

      fromFields(_fields: BindingsLeaves.Field[], aux: any[]): T {
        return aux[0];
      }

      toValue(x: T): T {
        return x;
      }

      fromValue(x: T): T {
        return x;
      }

      check(_x: T) {
        throw new Error('TODO')
      }
    }

    export class Number<T = number> extends AuxiliaryLeaf<T> {
      readonly _T!: T extends number ? void : never;
      readonly type: 'number' = 'number';
    }

    export class String<T = string> extends AuxiliaryLeaf<T> {
      readonly _T!: T extends string ? void : never;
      readonly type: 'string' = 'string';
    }

    export class Actions<T = BindingsLeaves.Actions> extends ProvableBindingsType<T, BindingsLeaves.Actions> {
      readonly _T!: T extends number ? void : never;
      readonly type: 'number' = 'number';

      Type() { return BindingsLeaves.Actions; }
    }

    export class AuthRequired<T = BindingsLeaves.AuthRequired> extends ProvableBindingsType<T, BindingsLeaves.AuthRequired> {
      readonly _T!: T extends BindingsLeaves.AuthRequired ? void : never;
      readonly type: 'AuthRequired' = 'AuthRequired';

      Type() { return BindingsLeaves.AuthRequired; }
    }

    export class Bool<T = BindingsLeaves.Bool> extends ProvableBindingsType<T, BindingsLeaves.Bool> {
      readonly _T!: T extends BindingsLeaves.Bool ? void : never;
      readonly type: 'Bool' = 'Bool';

      Type() { return BindingsLeaves.Bool; }
    }

    export class Events<T = BindingsLeaves.Events> extends ProvableBindingsType<T, BindingsLeaves.Events> {
      readonly _T!: T extends number ? void : never;
      readonly type: 'number' = 'number';

      Type() { return BindingsLeaves.Events; }
    }

    export class Field<T = BindingsLeaves.Field> extends ProvableBindingsType<T, BindingsLeaves.Field> {
      readonly _T!: T extends BindingsLeaves.Field ? void : never;
      readonly type: 'Field' = 'Field';

      Type() { return BindingsLeaves.Field; }
    }

    export class Int64<T = BindingsLeaves.Int64> extends ProvableBindingsType<T, BindingsLeaves.Int64> {
      readonly _T!: T extends BindingsLeaves.Int64 ? void : never;
      readonly type: 'Int64' = 'Int64';

      Type() { return BindingsLeaves.Int64; }
    }

    export class PublicKey<T = BindingsLeaves.PublicKey> extends ProvableBindingsType<T, BindingsLeaves.PublicKey> {
      readonly _T!: T extends BindingsLeaves.PublicKey ? void : never;
      readonly type: 'PublicKey' = 'PublicKey';

      Type() { return BindingsLeaves.PublicKey; }
    }

    export class Sign<T = BindingsLeaves.Sign> extends ProvableBindingsType<T, BindingsLeaves.Sign> {
      readonly _T!: T extends BindingsLeaves.Sign ? void : never;
      readonly type: 'Sign' = 'Sign';

      Type() { return BindingsLeaves.Sign; }
    }

    export class StateHash<T = BindingsLeaves.StateHash> extends ProvableBindingsType<T, BindingsLeaves.StateHash> {
      readonly _T!: T extends BindingsLeaves.StateHash ? void : never;
      readonly type: 'StateHash' = 'StateHash';

      Type() { return BindingsLeaves.StateHash; }
    }

    // TODO NOW
    export class TokenId<T = BindingsLeaves.TokenId> implements Provable<T> {
      readonly _T!: T extends BindingsLeaves.TokenId ? void : never;
      readonly type: 'TokenId' = 'TokenId';

      constructor() {}

      sizeInFields(): number {
        return BindingsLeaves.Field.sizeInFields();
      }

      toJSON(x: T): any {
        // TODO: type safety
        return toBase58Check(BindingsLeaves.Field.toBytes(x as BindingsLeaves.Field), versionBytes.tokenIdKey);
      }

      toInput(x: T): HashInput {
        // TODO: type safety
        return BindingsLeaves.Field.toInput(x as BindingsLeaves.Field);
      }

      toFields(x: T): BindingsLeaves.Field[] {
        // TODO: type safety
        return BindingsLeaves.Field.toFields(x as BindingsLeaves.Field);
      }

      toAuxiliary(_x?: T): any[] {
        return [];
      }

      fromFields(fields: BindingsLeaves.Field[], _aux: any[]): T {
        // TODO: type safety
        return BindingsLeaves.Field.fromFields(fields) as T;
      }

      toValue(x: T): T {
        return x;
      }

      fromValue(x: T): T {
        return x;
      }

      check(_x: T) {
        throw new Error('TODO')
      }
    }

    export class TokenSymbol<T = BindingsLeaves.TokenSymbol> extends ProvableBindingsType<T, BindingsLeaves.TokenSymbol> {
      readonly _T!: T extends BindingsLeaves.TokenId ? void : never;
      readonly type: 'TokenId' = 'TokenId';

      Type() { return BindingsLeaves.TokenSymbol; }
    }

    export class UInt32<T = BindingsLeaves.UInt32> extends ProvableBindingsType<T, BindingsLeaves.UInt32> {
      readonly _T!: T extends BindingsLeaves.UInt32 ? void : never;
      readonly type: 'UInt32' = 'UInt32';

      Type() { return BindingsLeaves.UInt32; }
    }

    export class UInt64<T = BindingsLeaves.UInt64> extends ProvableBindingsType<T, BindingsLeaves.UInt64> {
      readonly _T!: T extends BindingsLeaves.UInt64 ? void : never;
      readonly type: 'UInt64' = 'UInt64';

      Type() { return BindingsLeaves.UInt64; }
    }

    export class ZkappUri<T = BindingsLeaves.ZkappUri> extends ProvableBindingsType<T, BindingsLeaves.ZkappUri> {
      readonly _T!: T extends BindingsLeaves.ZkappUri ? void : never;
      readonly type: 'ZkappUri';

      Type() { return BindingsLeaves.ZkappUri; }
    }
  }
}
