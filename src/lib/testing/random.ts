import {
  customTypes,
  Layout,
  TypeMap,
  Json,
  AccountUpdate,
} from '../../provable/gen/transaction-bigint.js';
import * as Bigint from '../../provable/transaction-leaves-bigint.js';
import { genericLayoutFold } from '../../provable/from-layout.js';
import { jsLayout } from '../../provable/gen/js-layout.js';
import { GenericProvable, primitiveTypeMap } from '../../provable/generic.js';
import { PrivateKey } from '../../provable/curve-bigint.js';
import { randomBytes } from '../../js_crypto/random.js';
import { alphabet } from '../../provable/base58.js';

export { RandomAccountUpdate };

type Random<T> = {
  next(): T;
};
function Random<T>(next: () => T): Random<T> {
  return { next };
}

const boolean = Random(() => Math.random() > 0.5);
const base58 = (size: number | Random<number>) =>
  map(array(oneof(...alphabet), size), (a) => a.join(''));

const Field = Random(Bigint.Field.random);
const Bool = map(boolean, Bigint.Bool);
const UInt32 = Random(Bigint.UInt32.random);
const UInt64 = Random(Bigint.UInt64.random);
const Sign = map(boolean, (b) => Bigint.Sign(b ? 1 : -1));
const PublicKey = Random(() => PrivateKey.toPublicKey(PrivateKey.random()));
const TokenId = Field;
const AuthorizationKind = reject(
  record<Bigint.AuthorizationKind>({
    isProved: Bool,
    isSigned: Bool,
  }),
  (t) => !!t.isProved && !!t.isSigned
);
const AuthRequired = map(
  oneof<Json.AuthRequired[]>(
    'None',
    'Proof',
    'Signature',
    'Either',
    'Impossible'
  ),
  Bigint.AuthRequired.fromJSON
);
const TokenSymbol = map(string(nat(6)), Bigint.TokenSymbol.fromJSON);
const Events = map(array(array(Field, nat(5)), nat(2)), Bigint.Events.fromList);
const SequenceEvents = Events;
const SequenceState = oneof(Bigint.SequenceState.emptyValue(), Field);
const ZkappUri = map(string(nat(20)), Bigint.ZkappUri.fromJSON);

const PrimitiveMap = primitiveTypeMap<bigint>();
type Types = typeof TypeMap & typeof customTypes & typeof PrimitiveMap;
type Provable<T> = GenericProvable<T, bigint>;
type Generators = {
  [K in keyof Types]: Types[K] extends Provable<infer U> ? Random<U> : never;
};
const Generators: Generators = {
  Field,
  Bool,
  UInt32,
  UInt64,
  Sign,
  PublicKey,
  TokenId,
  AuthorizationKind,
  AuthRequired,
  TokenSymbol,
  Events,
  SequenceEvents,
  SequenceState,
  ZkappUri,
  null: constant(null),
  string: base58(50), // TODO replace various strings, like signature, with parsed types
  number: nat(5), // TODO need richer type for call depth
};
let typeToGenerator = new Map<Provable<any>, Random<any>>(
  [TypeMap, PrimitiveMap, customTypes]
    .map(Object.entries)
    .flat()
    .map(([key, value]) => [value, Generators[key as keyof Generators]])
);

function generatorFromLayout<T>(typeData: Layout): Random<T> {
  return {
    next() {
      return generate(typeData);
    },
  };
}

function generate<T>(typeData: Layout): T {
  return genericLayoutFold<undefined, any, TypeMap, Json.TypeMap>(
    TypeMap,
    customTypes,
    {
      map(type, _, name) {
        let gen = typeToGenerator.get(type);
        if (gen === undefined)
          throw Error(`could not find generator for type ${name}`);
        return gen.next();
      },
      reduceArray(array) {
        return array;
      },
      reduceObject(_, object) {
        return object;
      },
      reduceFlaggedOption({ isSome, value }, typeData) {
        let isSomeBoolean = TypeMap.Bool.toJSON(isSome);
        return isSomeBoolean ? { isSome, value } : empty(typeData);
      },
      reduceOrUndefined(value) {
        let isSome = this.map(TypeMap.Bool);
        let isSomeBoolean = TypeMap.Bool.toJSON(isSome);
        return isSomeBoolean ? value : undefined;
      },
    },
    typeData,
    undefined
  );
}

function empty(typeData: Layout) {
  let zero = TypeMap.Field.fromJSON('0');
  return genericLayoutFold<undefined, any, TypeMap, Json.TypeMap>(
    TypeMap,
    customTypes,
    {
      map(type) {
        if (type.emptyValue) return type.emptyValue();
        return type.fromFields(
          Array(type.sizeInFields()).fill(zero),
          type.toAuxiliary()
        );
      },
      reduceArray(array) {
        return array;
      },
      reduceObject(_, object) {
        return object;
      },
      reduceFlaggedOption({ isSome, value }, typeData) {
        if (typeData.optionType === 'closedInterval') {
          let innerInner = typeData.inner.entries.lower;
          let innerType = TypeMap[innerInner.type as 'UInt32' | 'UInt64'];
          value.lower = innerType.fromJSON(typeData.rangeMin);
          value.upper = innerType.fromJSON(typeData.rangeMax);
        }
        return { isSome, value };
      },
      reduceOrUndefined() {
        return undefined;
      },
    },
    typeData,
    undefined
  );
}

const RandomAccountUpdate = generatorFromLayout<AccountUpdate>(
  jsLayout.AccountUpdate as any
);

/**
 * min and max are inclusive!
 */
function int(min: number, max: number): Random<number> {
  if (max < min) throw Error('max < min');
  return {
    next() {
      return min + Math.floor((max + 1 - min) * Math.random());
    },
  };
}
function nat(max: number) {
  return int(0, max);
}

function constant<T>(t: T) {
  return Random(() => t);
}

function bytes(size: number | Random<number>) {
  let size_ = typeof size === 'number' ? constant(size) : size;
  return {
    next() {
      return [...randomBytes(size_.next())];
    },
  };
}
function string(size: number | Random<number>) {
  return map(bytes(size), (b) => String.fromCharCode(...b));
}

function oneof<Types extends readonly any[]>(
  ...values: { [K in keyof Types]: Types[K] | Random<Types[K]> }
): Random<Types[number]> {
  type T = Types[number];
  let I = nat(values.length - 1);
  let isGenerator = values.map(
    (v) => typeof v === 'object' && v && 'next' in v
  );
  return {
    next(): T {
      let i = I.next();
      let value = values[i];
      return isGenerator[i] ? (value as Random<T>).next() : (value as T);
    },
  };
}
function map<T, S>(rng: Random<T>, to: (t: T) => S): Random<S> {
  return {
    next() {
      return to(rng.next());
    },
  };
}

function array<T>(
  element: Random<T>,
  size: number | Random<number>
): Random<T[]> {
  let size_ = typeof size === 'number' ? constant(size) : size;
  return {
    next() {
      return Array.from({ length: size_.next() }, () => element.next());
    },
  };
}
function record<T extends {}>(gens: {
  [K in keyof T]: Random<T[K]>;
}): Random<T> {
  return {
    next() {
      return Object.fromEntries(
        Object.entries<Random<any>>(gens).map(([key, gen]) => [key, gen.next()])
      ) as T;
    },
  };
}

function reject<T>(gen: Random<T>, isRejected: (t: T) => boolean) {
  return {
    next() {
      while (true) {
        let t = gen.next();
        if (!isRejected(t)) return t;
      }
    },
  };
}
