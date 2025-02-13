import {
  customTypes,
  Layout,
  TypeMap,
  Json,
  AccountUpdate,
  ZkappCommand,
  empty,
} from '../../bindings/mina-transaction/gen/transaction-bigint.js';
import {
  AuthRequired,
  Bool,
  Events,
  Field,
  Actions,
  ActionState,
  VerificationKeyHash,
  ReceiptChainHash,
  Sign,
  TokenId,
  TokenSymbol,
  ZkappUri,
  PublicKey,
  StateHash,
  MayUseToken,
} from '../../bindings/mina-transaction/transaction-leaves-bigint.js';
import { genericLayoutFold } from '../../bindings/lib/from-layout.js';
import { jsLayout } from '../../bindings/mina-transaction/gen/js-layout.js';
import { PrimitiveTypeMap, primitiveTypeMap } from '../../bindings/lib/generic.js';
import { Scalar, PrivateKey, Group } from '../../mina-signer/src/curve-bigint.js';
import { Signature } from '../../mina-signer/src/signature.js';
import { randomBytes } from '../../bindings/crypto/random.js';
import { alphabet } from '../util/base58.js';
import { bytesToBigInt } from '../../bindings/crypto/bigint-helpers.js';
import { Memo } from '../../mina-signer/src/memo.js';
import { Signable } from '../../mina-signer/src/derivers-bigint.js';
import { tokenSymbolLength } from '../../bindings/mina-transaction/derived-leaves.js';
import { stringLengthInBytes } from '../../bindings/lib/binable.js';
import { mocks } from '../../bindings/crypto/constants.js';
import type { FiniteField } from '../../bindings/crypto/finite-field.js';

export { Random, sample, withHardCoded };

type Random<T> = {
  create(): () => T;
  invalid?: Random<T>;
};
type RandomWithInvalid<T> = Required<Random<T>>;

function Random_<T>(next: () => T, toInvalid?: (valid: Random<T>) => Random<T>): Random<T> {
  let rng: Random<T> = { create: () => next };
  if (toInvalid !== undefined) rng.invalid = toInvalid(rng);
  return rng;
}

function sample<T>(rng: Random<T>, size: number) {
  let next = rng.create();
  return Array.from({ length: size }, next);
}

const boolean = Random_(() => drawOneOf8() < 4);

const bool = map(boolean, Bool);
const uint8 = biguintWithInvalid(8);
const uint32 = biguintWithInvalid(32);
const uint64 = biguintWithInvalid(64);
const byte = Random_(drawRandomByte);

const field = fieldWithInvalid(Field);
const scalar = fieldWithInvalid(Scalar);

const sign = map(boolean, (b) => Sign(b ? 1 : -1));
const int64 = record({ magnitude: uint64, sgn: sign });
const privateKey = Random_(PrivateKey.random);
const publicKey = publicKeyWithInvalid();
const keypair = map(privateKey, (privatekey) => ({
  privatekey,
  publicKey: PrivateKey.toPublicKey(privatekey),
}));

const tokenId = oneOf(TokenId.empty(), field);
const stateHash = field;
const authRequired = map(
  oneOf<Json.AuthRequired[]>('None', 'Proof', 'Signature', 'Either', 'Impossible'),
  AuthRequired.fromJSON
);
const mayUseToken = map(
  oneOf<Json.MayUseToken[]>(
    {
      parentsOwnToken: true,
      inheritFromParent: false,
    },
    {
      parentsOwnToken: false,
      inheritFromParent: true,
    },
    {
      parentsOwnToken: false,
      inheritFromParent: false,
    }
  ),
  MayUseToken.fromJSON
);
const tokenSymbolString = reject(string(nat(tokenSymbolLength)), (s) => stringLengthInBytes(s) > 6);
const tokenSymbol = map(tokenSymbolString, TokenSymbol.fromJSON);
const events = mapWithInvalid(array(array(field, int(1, 5)), nat(2)), Events.fromList);
const actions = mapWithInvalid(array(array(field, int(1, 5)), nat(2)), Actions.fromList);
const actionState = oneOf(ActionState.empty(), field);
const verificationKeyHash = oneOf(VerificationKeyHash.empty(), field);
const receiptChainHash = oneOf(ReceiptChainHash.empty(), field);
const zkappUri = map(string(nat(50)), ZkappUri.fromJSON);

type Types = typeof TypeMap & typeof customTypes & PrimitiveTypeMap<bigint>;
type Generators = {
  [K in keyof Types]: Types[K] extends Signable<infer U, any> ? Random<U> : never;
};
const Generators: Generators = {
  Field: field,
  Bool: bool,
  UInt32: uint32,
  UInt64: uint64,
  Sign: sign,
  BalanceChange: int64,
  PublicKey: publicKey,
  TokenId: tokenId,
  StateHash: stateHash,
  AuthRequired: authRequired,
  TokenSymbol: tokenSymbol,
  Events: events,
  Actions: actions,
  ActionState: actionState,
  VerificationKeyHash: verificationKeyHash,
  ReceiptChainHash: receiptChainHash,
  ZkappUri: zkappUri,
  null: constant(null),
  string: base58(nat(50)), // TODO replace various strings, like signature, with parsed types
  number: nat(3),
  TransactionVersion: uint32,
  MayUseToken: mayUseToken,
};
let typeToBigintGenerator = new Map<Signable<any, any>, Random<any>>(
  [TypeMap, primitiveTypeMap, customTypes]
    .map(Object.entries)
    .flat()
    .map(([key, value]) => [value, Generators[key as keyof Generators]])
);

// transaction stuff
const accountUpdate = mapWithInvalid(
  generatorFromLayout<AccountUpdate>(jsLayout.AccountUpdate as any, {
    isJson: false,
  }),
  (a) => {
    // TODO set proof to none since we can't generate a valid random one
    a.authorization.proof = undefined;
    // TODO set signature to null since the deriver encodes it as arbitrary string
    a.authorization.signature = undefined;
    // ensure authorization kind is valid
    let { isProved, isSigned } = a.body.authorizationKind;
    if (isProved && isSigned) {
      a.body.authorizationKind.isProved = Bool(false);
    }
    if (!a.body.authorizationKind.isProved) {
      a.body.authorizationKind.verificationKeyHash = VerificationKeyHash.empty();
    }
    // ensure mayUseToken is valid
    let { inheritFromParent, parentsOwnToken } = a.body.mayUseToken;
    if (inheritFromParent && parentsOwnToken) {
      a.body.mayUseToken.inheritFromParent = Bool(false);
    }
    return a;
  }
);

const feePayer = generatorFromLayout<ZkappCommand['feePayer']>(
  jsLayout.ZkappCommand.entries.feePayer as any,
  { isJson: false }
);
const memoString = reject(string(nat(32)), (s) => stringLengthInBytes(s) > 32);
const memo = map(memoString, (s) => Memo.toBase58(Memo.fromString(s)));
const signature = record({ r: field, s: scalar });

// invalid json inputs can contain invalid stringified numbers, but also non-numeric strings
const toString = <T>(rng: Random<T>) => map(rng, String);
const nonInteger = map(uint32, fraction(3), (x, frac) => Number(x) + frac);
const nonNumericString = reject(
  string(nat(20)),
  (str: any) => !isNaN(str) && !isNaN(parseFloat(str))
);
const invalidUint8Json = toString(oneOf(uint8.invalid, nonInteger, nonNumericString));
const invalidUint32Json = toString(oneOf(uint32.invalid, nonInteger, nonNumericString));
const invalidUint64Json = toString(oneOf(uint64.invalid, nonInteger, nonNumericString));

// some json versions of those types
let json_ = {
  uint32: { ...toString(uint32), invalid: invalidUint32Json },
  uint64: { ...toString(uint64), invalid: invalidUint64Json },
  sign: withInvalidRandomString(map(sign, Sign.toJSON)),
  publicKey: withInvalidBase58(mapWithInvalid(publicKey, PublicKey.toBase58)),
  privateKey: withInvalidBase58(map(privateKey, PrivateKey.toBase58)),
  keypair: map(keypair, ({ privatekey, publicKey }) => ({
    privateKey: PrivateKey.toBase58(privatekey),
    publicKey: PublicKey.toBase58(publicKey),
  })),
  signature: withInvalidBase58(map(signature, Signature.toBase58)),
  signatureJson: map(signature, Signature.toJSON),
  field: mapWithInvalid(field, Field.toJSON),
};

function withInvalidRandomString<T extends string>(rng: Random<T>) {
  return { ...rng, invalid: string(30) as Random<T> };
}

type JsonGenerators = {
  [K in keyof Types]: Types[K] extends Signable<any, infer J> ? Random<J> : never;
};
const JsonGenerators: JsonGenerators = {
  Field: json_.field,
  Bool: boolean,
  UInt32: json_.uint32,
  UInt64: json_.uint64,
  Sign: json_.sign,
  BalanceChange: record({ magnitude: json_.uint64, sgn: json_.sign }),
  PublicKey: json_.publicKey,
  TokenId: withInvalidBase58(map(tokenId, TokenId.toJSON)),
  StateHash: withInvalidBase58(map(stateHash, StateHash.toJSON)),
  AuthRequired: withInvalidRandomString(map(authRequired, AuthRequired.toJSON)),
  TokenSymbol: Object.assign(tokenSymbolString, {
    invalid: string(int(tokenSymbolLength + 1, 20)),
  }),
  Events: mapWithInvalid(events, Events.toJSON),
  Actions: mapWithInvalid(actions, Actions.toJSON),
  ActionState: mapWithInvalid(actionState, ActionState.toJSON),
  VerificationKeyHash: mapWithInvalid(verificationKeyHash, Field.toJSON),
  ReceiptChainHash: mapWithInvalid(receiptChainHash, ReceiptChainHash.toJSON),
  ZkappUri: string(nat(50)),
  null: constant(null),
  string: base58(nat(50)),
  number: nat(3),
  TransactionVersion: json_.uint32,
  MayUseToken: mapWithInvalid(mayUseToken, MayUseToken.toJSON),
};
let typeToJsonGenerator = new Map<Signable<any, any>, Random<any>>(
  [TypeMap, primitiveTypeMap, customTypes]
    .map(Object.entries)
    .flat()
    .map(([key, value]) => [value, JsonGenerators[key as keyof JsonGenerators]])
);

const accountUpdateJson = mapWithInvalid(
  generatorFromLayout<Json.AccountUpdate>(jsLayout.AccountUpdate as any, {
    isJson: true,
  }),
  (a) => {
    // TODO set proof to null since we can't generate a valid random one
    a.authorization.proof = null;
    // TODO set signature to null since the deriver encodes it as arbitrary string
    a.authorization.signature = null;
    // ensure authorization kind is valid
    let { isProved, isSigned } = a.body.authorizationKind;
    if (isProved && isSigned) {
      a.body.authorizationKind.isProved = false;
    }

    if (!a.body.authorizationKind.isProved) {
      a.body.authorizationKind.verificationKeyHash = mocks.dummyVerificationKeyHash;
    }
    // ensure mayUseToken is valid
    let { inheritFromParent, parentsOwnToken } = a.body.mayUseToken;
    if (inheritFromParent && parentsOwnToken) {
      a.body.mayUseToken.inheritFromParent = false;
    }
    return a;
  }
);
const feePayerJson = generatorFromLayout<Json.ZkappCommand['feePayer']>(
  jsLayout.ZkappCommand.entries.feePayer as any,
  { isJson: true }
);

const json = {
  ...json_,
  accountUpdate: accountUpdateJson,
  feePayer: feePayerJson,
  memoString,
};

const Random = Object.assign(Random_, {
  constant,
  int,
  nat,
  fraction,
  boolean,
  byte,
  bytes,
  string,
  base58,
  array: Object.assign(array, { ofSize: arrayOfSizeValid }),
  record,
  map: Object.assign(map, { withInvalid: mapWithInvalid }),
  step,
  oneOf,
  withHardCoded,
  dependent,
  apply,
  reject,
  dice: Object.assign(dice, { ofSize: diceOfSize() }),
  field,
  otherField: fieldWithInvalid,
  bool,
  uint8,
  uint32,
  uint64,
  biguint: biguintWithInvalid,
  bignat: bignatWithInvalid,
  privateKey,
  publicKey,
  scalar,
  signature,
  accountUpdate,
  feePayer,
  memo,
  json,
});

function generatorFromLayout<T>(typeData: Layout, { isJson }: { isJson: boolean }): Random<T> {
  let typeToGenerator = isJson ? typeToJsonGenerator : typeToBigintGenerator;
  return genericLayoutFold<Signable<any, any>, undefined, Random<any>, TypeMap, Json.TypeMap>(
    TypeMap,
    customTypes,
    {
      map(type, _, name) {
        let rng = typeToGenerator.get(type);
        if (rng === undefined) throw Error(`could not find generator for type ${name}`);
        return rng;
      },
      reduceArray(_, typeData) {
        let element = generatorFromLayout(typeData.inner, { isJson });
        let size = typeData.staticLength ?? Random.nat(20);
        return array(element, size);
      },
      reduceObject(keys, object) {
        // hack to not sample invalid vk hashes (because vk hash is correlated with other fields, and has to be overridden)
        if (keys.includes('verificationKeyHash')) {
          (object as any).verificationKeyHash = noInvalid((object as any).verificationKeyHash);
        }
        return record(object);
      },
      reduceFlaggedOption({ isSome, value }, typeData) {
        if (isJson) {
          return oneOf(null, value);
        } else {
          return mapWithInvalid(isSome, value, (isSome, value) => {
            let isSomeBoolean = TypeMap.Bool.toJSON(isSome);
            if (!isSomeBoolean) return empty(typeData);
            return { isSome, value };
          });
        }
      },
      reduceOrUndefined(_, innerTypeData) {
        return oneOf(isJson ? null : undefined, generatorFromLayout(innerTypeData, { isJson }));
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
  return arrayValid(byte, size);
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
  return map(arrayValid(oneOf(...alphabet), size), (a) => a.join(''));
}

function isGenerator<T>(rng: any): rng is Random<T> {
  return typeof rng === 'object' && rng && 'create' in rng;
}

function oneOf<Types extends readonly any[]>(
  ...values: {
    [K in keyof Types]: Random<Types[K]> | RandomWithInvalid<Types[K]> | Types[K];
  }
): Random<Types[number]> {
  let gens = values.map(maybeConstant);
  let valid = {
    create() {
      let nexts = gens.map((rng) => rng.create());
      return () => {
        let i = drawUniformUint(values.length - 1);
        return nexts[i]();
      };
    },
  };
  let invalidGens = gens.filter((g) => g.invalid !== undefined).map((g) => g.invalid!);
  let nInvalid = invalidGens.length;
  if (nInvalid === 0) return valid;
  let invalid = {
    create() {
      let nexts = invalidGens.map((rng) => rng.create());
      return () => {
        let i = drawUniformUint(nInvalid - 1);
        return nexts[i]();
      };
    },
  };
  return Object.assign(valid, { invalid });
}

/**
 * map a list of generators to a new generator, by specifying the transformation which maps samples
 * of the input generators to a sample of the result.
 */
function map<T extends readonly any[], S>(
  ...args: [...rngs: { [K in keyof T]: Random<T[K]> }, to: (...values: T) => S]
): Random<S> {
  const to = args.pop()! as (...values: T) => S;
  let rngs = args as { [K in keyof T]: Random<T[K]> };
  return {
    create() {
      let nexts = rngs.map((rng) => rng.create());
      return () => to(...(nexts.map((next) => next()) as any));
    },
  };
}
/**
 * dependent is like {@link map}, with the difference that the mapping contains a free variable
 * whose samples have to be provided as inputs separately. this is useful to create correlated generators, where
 * multiple generators are all dependent on the same extra variable which is sampled independently.
 *
 * dependent can be used in two different ways:
 * - as a function from a random generator of the free variable to a random generator of the result
 * - as a random generator whose samples are _functions_ from free variable to result: `Random<(arg: Free) => Result>`
 */
function dependent<T extends readonly any[], Result, Free>(
  ...args: [...rngs: { [K in keyof T]: Random<T[K]> }, to: (free: Free, values: T) => Result]
): Random<(arg: Free) => Result> & ((arg: Random<Free>) => Random<Result>) {
  const to = args.pop()! as (free: Free, values: T) => Result;
  let rngs = args as { [K in keyof T]: Random<T[K]> };
  let rng: Random<(arg: Free) => Result> = {
    create() {
      let nexts = rngs.map((rng) => rng.create());
      return () => (free) => to(free, nexts.map((next) => next()) as any);
    },
  };
  return Object.assign(function (free: Random<Free>): Random<Result> {
    return {
      create() {
        let freeNext = free.create();
        let nexts = rngs.map((rng) => rng.create());
        return () => to(freeNext(), nexts.map((next) => next()) as any);
      },
    };
  }, rng);
}

function step<T extends readonly any[], S>(
  ...args: [
    ...rngs: { [K in keyof T]: Random<T[K]> },
    step: (current: S, ...values: T) => S,
    initial: S
  ]
): Random<S> {
  let initial = args.pop()! as S;
  const step = args.pop()! as (current: S, ...values: T) => S;
  let rngs = args as { [K in keyof T]: Random<T[K]> };
  return {
    create() {
      let nexts = rngs.map((rng) => rng.create());
      let next = initial;
      let current = initial;
      return () => {
        current = next;
        next = step(current, ...(nexts.map((next) => next()) as any as T));
        return current;
      };
    },
  };
}

function arrayValid<T>(
  element: Random<T>,
  size: number | Random<number>,
  { reset = false } = {}
): Random<T[]> {
  let size_ = typeof size === 'number' ? constant(size) : size;
  return {
    create() {
      let nextSize = size_.create();
      let nextElement = element.create();
      return () => {
        let nextElement_ = reset ? element.create() : nextElement;
        return Array.from({ length: nextSize() }, nextElement_);
      };
    },
  };
}
function arrayOfSizeValid<T>(
  element: Random<T>,
  { reset = false } = {}
): Random<(n: number) => T[]> {
  return {
    create() {
      let nextElement = element.create();
      return () => (length: number) => {
        let nextElement_ = reset ? element.create() : nextElement;
        return Array.from({ length }, nextElement_);
      };
    },
  };
}

function recordValid<T extends {}>(gens: {
  [K in keyof T]: Random<T[K]>;
}): Random<T> {
  return {
    create() {
      let keys = Object.keys(gens);
      let nexts = keys.map((key) => gens[key as keyof T].create());
      return () => Object.fromEntries(keys.map((key, i) => [key, nexts[i]()])) as T;
    },
  };
}

function tupleValid<T extends readonly any[]>(
  gens: {
    [i in keyof T & number]: Random<T[i]>;
  } & Random<any>[]
): Random<T> {
  return {
    create() {
      let nexts = gens.map((gen) => gen.create());
      return () => nexts.map((next) => next()) as any;
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

type Action<S> = Random<(s: S) => S>;
function apply<S>(
  rng: Random<S>,
  howMany: number | Random<number>,
  ...actions: Action<S>[]
): Random<S> {
  let howMany_ = maybeConstant(howMany);
  let action = oneOf(...actions);
  return {
    create() {
      let next = rng.create();
      let nextSize = howMany_.create();
      let nextAction = action.create();
      return () => {
        let state = next();
        let size = nextSize();
        for (let i = 0; i < size; i++) {
          let action = nextAction();
          state = action(state);
        }
        return state;
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

function maybeConstant<T>(c: T | Random<T>): Random<T> {
  return isGenerator(c) ? c : constant(c);
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
        let i = drawUniformUint(nSpecial - 1);
        return special[i];
      }
      // the remaining follow a uniform distribution
      return min + drawUniformUint(max - min);
    },
  };
}

/**
 * log-uniform distribution over range [0, max]
 * with bias towards 0, 1, 2
 */
function bignat(max: bigint): Random<bigint> {
  if (max < 0n) throw Error('max < 0');
  if (max === 0n) return constant(0n);
  let bits = max.toString(2).length;
  let bitBits = bits.toString(2).length;
  // set of special numbers that will appear more often in tests
  let special = [0n, 0n, 1n];
  if (max > 1n) special.push(2n);
  let nSpecial = special.length;
  return {
    create: () => () => {
      // 25% of test cases are special numbers
      if (drawOneOf8() < 3) {
        let i = drawUniformUint(nSpecial - 1);
        return special[i];
      }
      // the remaining follow a log-uniform / cut off exponential distribution:
      // we sample a bit length (within a target range) and then a number with that length
      while (true) {
        // draw bit length from [1, 2**bitBits); reject if > bit length of max
        let bitLength = 1 + drawUniformUintBits(bitBits);
        if (bitLength > bits) continue;
        // draw number from [0, 2**bitLength); reject if > max
        let n = drawUniformBigUintBits(bitLength);
        if (n <= max) return n;
      }
    },
  };
}

/**
 * log-uniform distribution over range [0, max]
 * with bias towards 0, 1, 2
 */
function nat(max: number): Random<number> {
  return map(bignat(BigInt(max)), (n) => Number(n));
}

function fraction(fixedPrecision = 3) {
  let denom = 10 ** fixedPrecision;
  if (fixedPrecision < 1) throw Error('precision must be > 1');
  let next = () => (drawUniformUint(denom - 2) + 1) / denom;
  return { create: () => next };
}

/**
 * unbiased, uniform distribution over range [0, max-1]
 */
function dice(max: number): Random<number> {
  if (max < 1) throw Error('max as to be > 0');
  return {
    create: () => () => drawUniformUint(max - 1),
  };
}
function diceOfSize(): Random<(size: number) => number> {
  return {
    create: () => () => (max: number) => {
      if (max < 1) throw Error('max as to be > 0');
      return drawUniformUint(max - 1);
    },
  };
}

let specialBytes = [0, 0, 0, 1, 1, 2, 255, 255];
/**
 * log-uniform distribution over range [0, 255]
 * with bias towards 0, 1, 2, 255
 */
function drawRandomByte() {
  // 25% of test cases are special numbers
  if (drawOneOf8() < 2) return specialBytes[drawOneOf8()];
  // the remaining follow log-uniform / cut off exponential distribution:
  // we sample a bit length from [1, 8] and then a number with that length
  let bitLength = 1 + drawOneOf8();
  return drawUniformUintBits(bitLength);
}

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

// generators for invalid samples
// note: these only cover invalid samples with a _valid type_.
// for example, numbers that are out of range or base58 strings with invalid characters.
// what we don't cover is something like passing numbers where strings are expected

// convention is that invalid generators sit next to valid ones
// so you can use uint64.invalid, array(uint64, 10).invalid, etc

/**
 * we get invalid uints by sampling from a larger range plus negative numbers
 */
function biguintWithInvalid(bits: number): RandomWithInvalid<bigint> {
  let valid = biguint(bits);
  let max = 1n << BigInt(bits);
  let double = biguint(2 * bits);
  let negative = map(double, (uint) => -uint - 1n);
  let tooLarge = map(valid, (uint) => uint + max);
  let invalid = oneOf(negative, tooLarge);
  return Object.assign(valid, { invalid });
}

function bignatWithInvalid(max: bigint): RandomWithInvalid<bigint> {
  let valid = bignat(max);
  let double = bignat(2n * max);
  let negative = map(double, (uint) => -uint - 1n);
  let tooLarge = map(valid, (uint) => uint + max);
  let invalid = oneOf(negative, tooLarge);
  return Object.assign(valid, { invalid });
}

function fieldWithInvalid(F: FiniteField): RandomWithInvalid<bigint> {
  let randomField = Random_(F.random);
  let specialField = oneOf(0n, 1n, F.negate(1n));
  let roughLogSize = 1 << Math.ceil(Math.log2(F.sizeInBits) - 1);
  let uint = biguint(roughLogSize);
  let field = oneOf<bigint[]>(randomField, randomField, uint, specialField);
  let tooLarge = map(field, (x) => x + F.modulus);
  let negative = map(field, (x) => -x - 1n);
  let invalid = oneOf(tooLarge, negative);
  return Object.assign(field, { invalid });
}

function publicKeyWithInvalid() {
  let publicKey = map(privateKey, PrivateKey.toPublicKey);
  let invalidX = reject(field, (x) => Field.isSquare(Field.add(Field.power(x, 3n), Group.b)));
  let invalid = map(invalidX, bool, (x, isOdd): PublicKey => ({ x, isOdd }));
  return Object.assign(publicKey, { invalid });
}

/**
 * invalid arrays are sampled by generating an array with exactly one invalid input (and any number of valid inputs);
 * (note: invalid arrays have the same length distribution as valid ones, except that they are never empty)
 */
function array<T>(
  element: Random<T>,
  size: number | Random<number>,
  options?: { reset?: boolean }
): Random<T[]> {
  let valid = arrayValid(element, size, options);
  if (element.invalid === undefined) return valid;
  let invalid = map(valid, element.invalid, (arr, invalid) => {
    if (arr.length === 0) return [invalid];
    let i = drawUniformUint(arr.length - 1);
    arr[i] = invalid;
    return arr;
  });
  return { ...valid, invalid };
}
/**
 * invalid records are similar to arrays: randomly choose one of the fields that have an invalid generator,
 * and set it to its invalid value
 */
function record<T extends {}>(gens: {
  [K in keyof T]: Random<T[K]>;
}): Random<T> {
  let valid = recordValid(gens);
  let invalidFields: [string & keyof T, Random<any>][] = [];
  for (let key in gens) {
    let invalid = gens[key].invalid;
    if (invalid !== undefined) {
      invalidFields.push([key, invalid]);
    }
  }
  let nInvalid = invalidFields.length;
  if (nInvalid === 0) return valid;
  let invalid = {
    create() {
      let next = valid.create();
      let invalidNexts = invalidFields.map(([key, rng]) => [key, rng.create()] as const);
      return () => {
        let value = next();
        let i = drawUniformUint(nInvalid - 1);
        let [key, invalidNext] = invalidNexts[i];
        value[key] = invalidNext();
        return value;
      };
    },
  };
  return { ...valid, invalid };
}
/**
 * invalid tuples are like invalid records
 */
function tuple<T extends readonly any[]>(
  gens: {
    [K in keyof T & number]: Random<T[K]>;
  } & Random<any>[]
): Random<T> {
  let valid = tupleValid<T>(gens);
  let invalidFields: [number & keyof T, Random<any>][] = [];
  gens.forEach((gen, i) => {
    let invalid = gen.invalid;
    if (invalid !== undefined) {
      invalidFields.push([i, invalid]);
    }
  });
  let nInvalid = invalidFields.length;
  if (nInvalid === 0) return valid;
  let invalid = {
    create() {
      let next = valid.create();
      let invalidNexts = invalidFields.map(([key, rng]) => [key, rng.create()] as const);
      return () => {
        let value = next();
        let i = drawUniformUint(nInvalid - 1);
        let [key, invalidNext] = invalidNexts[i];
        value[key] = invalidNext();
        return value;
      };
    },
  };
  return { ...valid, invalid };
}
/**
 * map assuming that invalid inputs can be mapped just like valid ones.
 * _one_ of the inputs is sampled as invalid
 */
function mapWithInvalid<T extends readonly any[], S>(
  ...args: [...rngs: { [K in keyof T]: Random<T[K]> }, to: (...values: T) => S]
): Random<S> {
  const to = args.pop()! as (...values: T) => S;
  let rngs = args as { [K in keyof T]: Random<T[K]> };
  let valid = map<T, S>(...rngs, to);
  let invalidInput = tuple<T>(rngs as Random<any>[]).invalid;
  if (invalidInput === undefined) return valid;
  let invalid = {
    create() {
      let nextInput = invalidInput!.create();
      return () => to(...nextInput());
    },
  };
  return { ...valid, invalid };
}

function noInvalid<T>(rng: Random<T>): Random<T> {
  return { ...rng, invalid: undefined };
}

// functions to create invalid base58
let n = alphabet.length;

function replaceCharacter(string: string, i: number, char: string) {
  return string.slice(0, i) + char + string.slice(i + 1);
}

function makeCheckSumInvalid(base58: string) {
  if (base58.length === 0) return base58;
  // pick any character, and change it to any different one
  let iChar = drawUniformUint(base58.length - 1);
  let iAlph = alphabet.indexOf(base58[iChar]);
  let iAlphNew = (iAlph + 1 + drawUniformUint(n - 2)) % n;
  return replaceCharacter(base58, iChar, alphabet[iAlphNew]);
}

function makeBase58Invalid(base58: string) {
  let iChar = drawUniformUint(base58.length - 1);
  // sample a character that is not in the alphabet
  let char: string;
  while (true) {
    let [byte] = randomBytes(1);
    char = String.fromCharCode(byte);
    if (!alphabet.includes(char)) break;
  }
  return replaceCharacter(base58, iChar, char);
}

function withInvalidBase58(rng: Random<string>): RandomWithInvalid<string> {
  let invalidBase58 = apply(rng, 1, constant(makeBase58Invalid), constant(makeCheckSumInvalid));
  let invalid = rng.invalid === undefined ? invalidBase58 : oneOf(invalidBase58, rng.invalid);
  return { ...rng, invalid };
}
