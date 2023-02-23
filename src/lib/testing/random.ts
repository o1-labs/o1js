import {
  customTypes,
  Layout,
  TypeMap,
  Json,
  AccountUpdate,
  ZkappCommand,
} from '../../provable/gen/transaction-bigint.js';
import * as Bigint from '../../provable/transaction-leaves-bigint.js';
import { genericLayoutFold } from '../../provable/from-layout.js';
import { jsLayout } from '../../provable/gen/js-layout.js';
import { GenericProvable, primitiveTypeMap } from '../../provable/generic.js';
import * as CurveBigint from '../../provable/curve-bigint.js';
import * as SignatureBigint from '../../mina-signer/src/signature.js';
import { randomBytes } from '../../js_crypto/random.js';
import { alphabet } from '../../provable/base58.js';
import { bytesToBigInt } from '../../js_crypto/bigint-helpers.js';
import { Memo } from '../../mina-signer/src/memo.js';

export { Random, withHardCoded };

type Random<T> = {
  create(): () => T;
};
function Random_<T>(next: () => T): Random<T> {
  return { create: () => next };
}
const boolean = Random_(() => drawOneOf8() < 4);

const Field = Random_(Bigint.Field.random);
const Scalar = Random_(CurveBigint.Scalar.random);
const Bool = map(boolean, Bigint.Bool);
const UInt32 = biguint(32);
const UInt64 = biguint(64);
const Sign = map(boolean, (b) => Bigint.Sign(b ? 1 : -1));
const PrivateKey = Random_(CurveBigint.PrivateKey.random);
const PublicKey = map(PrivateKey, CurveBigint.PrivateKey.toPublicKey);

const TokenId = oneOf(Bigint.TokenId.emptyValue(), Field);
const AuthRequired = map(
  oneOf<Json.AuthRequired[]>(
    'None',
    'Proof',
    'Signature',
    'Either',
    'Impossible'
  ),
  Bigint.AuthRequired.fromJSON
);
const TokenSymbol = map(string(nat(6)), Bigint.TokenSymbol.fromJSON);
const Events = map(
  array(array(Field, int(1, 5)), nat(2)),
  Bigint.Events.fromList
);
const SequenceEvents = Events;
const SequenceState = oneOf(Bigint.SequenceState.emptyValue(), Field);
const ReceiptChainHash = oneOf(Bigint.SequenceState.emptyValue(), Field);
const ZkappUri = map(string(nat(50)), Bigint.ZkappUri.fromJSON);

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
  AuthRequired,
  TokenSymbol,
  Events,
  SequenceEvents,
  SequenceState,
  ReceiptChainHash,
  ZkappUri,
  null: constant(null),
  string: base58(nat(50)), // TODO replace various strings, like signature, with parsed types
  number: nat(3), // TODO need richer type for call depth, it's weird to use "number" knowing that it's the only number
};
let typeToGenerator = new Map<Provable<any>, Random<any>>(
  [TypeMap, PrimitiveMap, customTypes]
    .map(Object.entries)
    .flat()
    .map(([key, value]) => [value, Generators[key as keyof Generators]])
);

// transaction stuff
const RandomAccountUpdate = randomFromLayout<AccountUpdate>(
  jsLayout.AccountUpdate as any
);
const RandomFeePayer = randomFromLayout<ZkappCommand['feePayer']>(
  jsLayout.ZkappCommand.entries.feePayer as any
);
const RandomMemo = map(string(nat(32)), (s) =>
  Memo.toBase58(Memo.fromString(s))
);
const Signature = record({ r: Field, s: Scalar });

// some json versions of those types
const json = {
  uint64: map(UInt64, Bigint.UInt64.toJSON),
  uint32: map(UInt32, Bigint.UInt32.toJSON),
  publicKey: map(PublicKey, CurveBigint.PublicKey.toJSON),
  signature: map(Signature, SignatureBigint.Signature.toBase58),
};

const Random = Object.assign(Random_, {
  constant,
  int,
  nat,
  boolean,
  bytes,
  string,
  base58,
  array,
  record,
  map,
  oneOf,
  withHardCoded,
  field: Field,
  bool: Bool,
  uint32: UInt32,
  uint64: UInt64,
  privateKey: PrivateKey,
  publicKey: PublicKey,
  scalar: Scalar,
  signature: Signature,
  accountUpdate: RandomAccountUpdate,
  feePayer: RandomFeePayer,
  memo: RandomMemo,
  json,
});

function randomFromLayout<T>(typeData: Layout): Random<T> {
  return {
    create() {
      let typeToNext = new Map<Provable<any>, () => any>();
      for (let [key, random] of typeToGenerator) {
        typeToNext.set(key, random.create());
      }
      return () => nextFromLayout(typeData, typeToNext);
    },
  };
}

function nextFromLayout<T>(
  typeData: Layout,
  typeToNext: Map<Provable<any>, () => any>
): T {
  return genericLayoutFold<undefined, any, TypeMap, Json.TypeMap>(
    TypeMap,
    customTypes,
    {
      map(type, _, name) {
        let next = typeToNext.get(type);
        if (next === undefined)
          throw Error(`could not find generator for type ${name}`);
        return next();
      },
      reduceArray(array) {
        return array;
      },
      reduceObject(_, object) {
        return object;
      },
      reduceFlaggedOption({ isSome, value }, typeData) {
        let isSomeBoolean = TypeMap.Bool.toJSON(isSome);
        if (!isSomeBoolean) return empty(typeData);
        if (typeData.optionType === 'closedInterval') {
          let innerInner = typeData.inner.entries.lower;
          let innerType = TypeMap[innerInner.type as 'UInt32' | 'UInt64'];
          let { lower, upper } = value;
          if (
            BigInt(innerType.toJSON(lower)) > BigInt(innerType.toJSON(upper))
          ) {
            value.upper = lower;
            value.lower = upper;
          }
        }
        return { isSome, value };
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

function constant<T>(t: T) {
  return Random_(() => t);
}

function bytes(size: number | Random<number>): Random<number[]> {
  return array(byte, size);
}

function uniformBytes(size: number | Random<number>): Random<number[]> {
  let size_ = typeof size === 'number' ? constant(size) : size;
  return {
    create() {
      let nextSize = size_.create();
      return () => [...randomBytes(nextSize())];
    },
  };
}
function string(size: number | Random<number>) {
  return map(uniformBytes(size), (b) => String.fromCharCode(...b));
}

function base58(size: number | Random<number>) {
  return map(array(oneOf(...alphabet), size), (a) => a.join(''));
}

function oneOf<Types extends readonly any[]>(
  ...values: { [K in keyof Types]: Types[K] | Random<Types[K]> }
): Random<Types[number]> {
  type T = Types[number];
  let isGenerator = values.map(
    (v) => typeof v === 'object' && v && 'create' in v
  );
  return {
    create() {
      let nexts = values.map((v: Random<T>, i) =>
        isGenerator[i] ? v.create() : undefined
      );
      return () => {
        let i = drawUniformUint(values.length - 1);
        return isGenerator[i] ? nexts[i]!() : (values[i] as T);
      };
    },
  };
}
function map<T, S>(rng: Random<T>, to: (t: T) => S): Random<S> {
  return {
    create() {
      let next = rng.create();
      return () => to(next());
    },
  };
}

function array<T>(
  element: Random<T>,
  size: number | Random<number>
): Random<T[]> {
  let size_ = typeof size === 'number' ? constant(size) : size;
  return {
    create() {
      let nextSize = size_.create();
      let nextElement = element.create();
      return () => Array.from({ length: nextSize() }, () => nextElement());
    },
  };
}
function record<T extends {}>(gens: {
  [K in keyof T]: Random<T[K]>;
}): Random<T> {
  return {
    create() {
      let keys = Object.keys(gens);
      let nexts = keys.map((key) => gens[key as keyof T].create());
      return () =>
        Object.fromEntries(keys.map((key, i) => [key, nexts[i]()])) as T;
    },
  };
}

function reject<T>(rng: Random<T>, isRejected: (t: T) => boolean): Random<T> {
  return {
    create() {
      let next = rng.create();
      return () => {
        while (true) {
          let t = next();
          if (!isRejected(t)) return t;
        }
      };
    },
  };
}

function withHardCoded<T>(rng: Random<T>, ...hardCoded: T[]): Random<T> {
  return {
    create() {
      let next = rng.create();
      let i = 0;
      return () => {
        if (i < hardCoded.length) return hardCoded[i++];
        return next();
      };
    },
  };
}

/**
 * uniform distribution over range [min, max]
 * with bias towards special values 0, 1, -1, 2, min, max
 */
function int(min: number, max: number): Random<number> {
  if (max < min) throw Error('max < min');
  // set of special numbers that will appear more often in tests
  let specialSet = new Set<number>();
  if (-1 >= min && -1 <= max) specialSet.add(-1);
  if (1 >= min && 1 <= max) specialSet.add(1);
  if (2 >= min && 2 <= max) specialSet.add(2);
  specialSet.add(min);
  specialSet.add(max);
  let special = [...specialSet];
  if (0 >= min && 0 <= max) special.unshift(0, 0);
  let nSpecial = special.length;
  return {
    create: () => () => {
      // 25% of test cases are special numbers
      if (drawOneOf8() < 3) {
        let i = drawUniformUint(nSpecial);
        return special[i];
      }
      // the remaining follow a uniform distribution
      return min + drawUniformUint(max - min);
    },
  };
}

/**
 * log-uniform distribution over range [0, max]
 * with bias towards 0, 1, 2, max
 */
function nat(max: number): Random<number> {
  if (max < 0) throw Error('max < 0');
  if (max === 0) return constant(0);
  let bits = max.toString(2).length;
  let bitBits = bits.toString(2).length;
  // set of special numbers that will appear more often in tests
  let special = [0, 0, 1];
  if (max > 1) special.push(2);
  if (max > 2) special.push(max);
  let nSpecial = special.length - 1;
  return {
    create: () => () => {
      // 25% of test cases are special numbers
      if (drawOneOf8() < 3) {
        let i = drawUniformUint(nSpecial);
        return special[i];
      }
      // the remaining follow a log-uniform / cut off exponential distribution:
      // we sample a bit length (within a target range) and then a number with that length
      while (true) {
        // draw bit length from [1, 2**bitBits); reject if > bit length of max
        let bitLength = 1 + drawUniformUintBits(bitBits);
        if (bitLength > bits) continue;
        // draw number from [0, 2**bitLength); reject if > max
        let n = drawUniformUintBits(bitLength);
        if (n <= max) return n;
      }
    },
  };
}

let specialBytes = [0, 0, 0, 1, 1, 2, 255, 255];
/**
 * log-uniform distribution over range [0, 255]
 * with bias towards 0, 1, 2, 255
 */
const byte: Random<number> = {
  create: () => () => {
    // 25% of test cases are special numbers
    if (drawOneOf8() < 2) return specialBytes[drawOneOf8()];
    // the remaining follow log-uniform / cut off exponential distribution:
    // we sample a bit length from [1, 8] and then a number with that length
    let bitLength = 1 + drawOneOf8();
    return drawUniformUintBits(bitLength);
  },
};
/**
 * log-uniform distribution over 2^n-bit range
 * with bias towards 0, 1, 2, max
 * outputs are bigints
 */
function biguint(bits: number): Random<bigint> {
  let max = (1n << BigInt(bits)) - 1n;
  let special = [0n, 0n, 0n, 1n, 1n, 2n, max, max];
  let bitsBits = Math.log2(bits);
  if (!Number.isInteger(bitsBits)) throw Error('bits must be a power of 2');
  return {
    create: () => () => {
      // 25% of test cases are special numbers
      if (drawOneOf8() < 2) return special[drawOneOf8()];
      // the remaining follow log-uniform / cut off exponential distribution:
      // we sample a bit length from [1, 8] and then a number with that length
      let bitLength = 1 + drawUniformUintBits(bitsBits);
      return drawUniformBigUintBits(bitLength);
    },
  };
}

/**
 * uniform positive integer in [0, max] drawn from secure randomness,
 */
function drawUniformUint(max: number) {
  if (max === 0) return 0;
  let bitLength = Math.floor(Math.log2(max)) + 1;
  while (true) {
    // values with same bit length can be too large by a factor of at most 2; those are rejected
    let n = drawUniformUintBits(bitLength);
    if (n <= max) return n;
  }
}

/**
 * uniform positive integer drawn from secure randomness,
 * given a target bit length
 */
function drawUniformUintBits(bitLength: number) {
  let byteLength = Math.ceil(bitLength / 8);
  // draw random bytes, zero the excess bits
  let bytes = randomBytes(byteLength);
  if (bitLength % 8 !== 0) {
    bytes[byteLength - 1] &= (1 << bitLength % 8) - 1;
  }
  // accumulate bytes to integer
  let n = 0;
  let bitPosition = 0;
  for (let byte of bytes) {
    n += byte << bitPosition;
    bitPosition += 8;
  }
  return n;
}

/**
 * uniform positive bigint drawn from secure randomness,
 * given a target bit length
 */
function drawUniformBigUintBits(bitLength: number) {
  let byteLength = Math.ceil(bitLength / 8);
  // draw random bytes, zero the excess bits
  let bytes = randomBytes(byteLength);
  if (bitLength % 8 !== 0) {
    bytes[byteLength - 1] &= (1 << bitLength % 8) - 1;
  }
  return bytesToBigInt(bytes);
}

/**
 * draw number between 0,..,7 using secure randomness
 */
function drawOneOf8() {
  return randomBytes(1)[0] >> 5;
}
