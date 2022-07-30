import { Field, Bool, Group, Ledger, Circuit } from '../snarky';
import * as Json from './gen/parties-json';
import { UInt32, UInt64, Sign } from '../lib/int';
import { TokenSymbol, HashInput } from '../lib/hash';
import { PublicKey } from '../lib/signature';
import { AsFieldsAndAux } from '../lib/circuit_value';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export { Events, StringWithHash, TokenSymbol };

export {
  toJson,
  toFields,
  toAuxiliary,
  sizeInFields,
  fromFields,
  check,
  toInput,
  TypeMap,
  OtherTypesKey,
  isFullType,
  FullTypes,
};

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};
type TokenId = Field;

// to what types in the js layout are mapped
type TypeMap = {
  PublicKey: PublicKey;
  Field: Field;
  Bool: Bool;
  AuthRequired: AuthRequired;
  UInt32: UInt32;
  UInt64: UInt64;
  Sign: Sign;
  TokenId: TokenId;
  // builtin
  number: number;
  null: null;
  undefined: undefined;
  string: string;
};

// types that implement AsFieldAndAux, and so can be left out of the conversion maps below
// sort of a "transposed" representation
type FullTypesKey = 'number' | 'null' | 'undefined' | 'string';
type OtherTypesKey = Exclude<keyof TypeMap, FullTypesKey>;
type FullTypes = {
  [K in FullTypesKey]: AsFieldsAndAux<TypeMap[K], Json.TypeMap[K]>;
};

let emptyType = {
  sizeInFields: () => 0,
  toFields: () => [],
  toAuxiliary: () => [],
  fromFields: () => null,
  check: () => {},
  toInput: () => ({}),
  toJson: () => null,
};

const FullTypes: FullTypes = {
  // implementations for primitive JS types
  number: {
    ...emptyType,
    toAuxiliary: (value = 0) => [value],
    toJson: (value) => value,
    fromFields: (_, aux) => aux.pop()!,
  },
  string: {
    ...emptyType,
    toAuxiliary: (value = '') => [value],
    toJson: (value) => value,
    fromFields: (_, aux) => aux.pop()!,
  },
  null: emptyType,
  undefined: {
    ...emptyType,
    fromFields: () => undefined,
  },
};

function isFullType(type: keyof TypeMap): type is FullTypesKey {
  return type in FullTypes;
}

// json conversion

function asString(x: Field | bigint) {
  return x.toString();
}

type ToJson = {
  [K in OtherTypesKey]: (x: TypeMap[K]) => Json.TypeMap[K];
};

let ToJson: ToJson = {
  PublicKey(x: PublicKey): Json.PublicKey {
    return Ledger.publicKeyToString(x);
  },
  Field: asString,
  Bool(x: Bool) {
    return x.toBoolean();
  },
  AuthRequired(x: AuthRequired) {
    let c = Number(x.constant.toBoolean());
    let n = Number(x.signatureNecessary.toBoolean());
    let s = Number(x.signatureSufficient.toBoolean());
    // prettier-ignore
    switch (`${c}${n}${s}`) {
      case '110': return 'Impossible';
      case '101': return 'None';
      case '000': return 'Proof';
      case '011': return 'Signature';
      case '001': return 'Either';
      default: throw Error('Unexpected permission');
    }
  },
  UInt32(x: UInt32) {
    return x.value.toString();
  },
  UInt64(x: UInt64) {
    return x.value.toString();
  },
  TokenId(x: TokenId) {
    return Ledger.fieldToBase58(x);
  },
  Sign(x: Sign) {
    if (x.toString() === '1') return 'Positive';
    if (x.neg().toString() === '1') return 'Negative';
    throw Error(`Invalid Sign: ${x}`);
  },
};

function toJson<K extends OtherTypesKey>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToJson))
    throw Error(`toJson: unsupported type "${typeName}"`);
  return ToJson[typeName](value);
}

// to fields

type ToFields = { [K in OtherTypesKey]: (x: TypeMap[K]) => Field[] };

function asFields(x: any): Field[] {
  return x.toFields();
}
function empty(_: any): [] {
  return [];
}

let ToFields: ToFields = {
  PublicKey({ g }: PublicKey) {
    let { x, y } = g;
    // TODO inefficient! in-snark public key should be uncompressed
    let isOdd = y.toBits()[0];
    return [x, isOdd.toField()];
  },
  Field: asFields,
  Bool: asFields,
  AuthRequired(x: AuthRequired) {
    return [x.constant, x.signatureNecessary, x.signatureSufficient]
      .map(asFields)
      .flat();
  },
  UInt32: asFields,
  UInt64: asFields,
  TokenId: asFields,
  Sign: asFields,
};

function toFields<K extends OtherTypesKey>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToFields))
    throw Error(`toFields: unsupported type "${typeName}"`);
  return ToFields[typeName](value);
}

// to auxiliary

type ToAuxiliary = {
  [K in OtherTypesKey]:
    | ((x: TypeMap[K] | undefined) => [])
    | ((x: TypeMap[K] | undefined) => [TypeMap[K]]);
};

let ToAuxiliary: ToAuxiliary = {
  PublicKey: empty,
  Field: empty,
  Bool: empty,
  AuthRequired: empty,
  UInt32: empty,
  UInt64: empty,
  TokenId: empty,
  Sign: empty,
};

function toAuxiliary<K extends OtherTypesKey>(
  typeName: K,
  value: TypeMap[K] | undefined
) {
  if (!(typeName in ToFields))
    throw Error(`toAuxiliary: unsupported type "${typeName}"`);
  return ToAuxiliary[typeName](value);
}

// size in fields

type SizeInFields = { [K in OtherTypesKey]: number };
let SizeInFields: SizeInFields = {
  PublicKey: 2,
  Field: 1,
  Bool: 1,
  AuthRequired: 3,
  UInt32: 1,
  UInt64: 1,
  TokenId: 1,
  Sign: 1,
};

function sizeInFields<K extends OtherTypesKey>(typeName: K) {
  if (!(typeName in ToFields))
    throw Error(`sizeInFields: unsupported type "${typeName}"`);
  return SizeInFields[typeName];
}

// from fields & aux
// these functions get the reversed output of `toFields` and `toAuxiliary` and pop the values they need from those arrays

type FromFields = {
  [K in OtherTypesKey]: (fields: Field[], aux: any[]) => TypeMap[K];
};

let FromFields: FromFields = {
  PublicKey(fields: Field[]) {
    let x = fields.pop()!;
    let isOdd = fields.pop()!;
    // compute y from elliptic curve equation y^2 = x^3 + 5
    // TODO: this is used in-snark, so we should improve constraint efficiency
    let ySquared = x.mul(x).mul(x).add(5);
    let someY: Field;
    if (ySquared.isConstant()) {
      someY = ySquared.sqrt();
    } else {
      someY = Circuit.witness(Field, () => ySquared.toConstant().sqrt());
      someY.square().equals(ySquared).or(x.equals(Field.zero)).assertTrue();
    }
    let isTheRightY = isOdd.equals(someY.toBits()[0].toField());
    let y = isTheRightY
      .toField()
      .mul(someY)
      .add(isTheRightY.not().toField().mul(someY.neg()));
    return new PublicKey(new Group(x, y));
  },
  Field(fields: Field[]) {
    return fields.pop()!;
  },
  Bool(fields: Field[]) {
    return Bool.Unsafe.ofField(fields.pop()!);
  },
  AuthRequired(fields: Field[], _) {
    let constant = FromFields.Bool(fields, _);
    let signatureNecessary = FromFields.Bool(fields, _);
    let signatureSufficient = FromFields.Bool(fields, _);
    return { constant, signatureNecessary, signatureSufficient };
  },
  UInt32(fields: Field[]) {
    return new UInt32(fields.pop()!);
  },
  UInt64(fields: Field[]) {
    return new UInt64(fields.pop()!);
  },
  TokenId(fields: Field[]) {
    return fields.pop()!;
  },
  Sign(fields: Field[]) {
    return new Sign(fields.pop()!);
  },
};

function fromFields<K extends OtherTypesKey>(
  typeName: K,
  fields: Field[],
  aux: any[]
): TypeMap[K] {
  if (!(typeName in ToFields))
    throw Error(`fromFields: unsupported type "${typeName}"`);
  return FromFields[typeName](fields, aux);
}

// check

type Check = { [K in OtherTypesKey]: (x: TypeMap[K]) => void };

let Check: Check = {
  PublicKey: (v) => PublicKey.check(v),
  Field: (v) => Field.check(v),
  Bool: (v) => Bool.check(v),
  AuthRequired(x: AuthRequired) {
    Bool.check(x.constant);
    Bool.check(x.signatureNecessary);
    Bool.check(x.signatureSufficient);
  },
  UInt32: (v) => UInt32.check(v),
  UInt64: (v) => UInt64.check(v),
  TokenId: (v) => Field.check(v),
  Sign: (v) => Sign.check(v),
};

function check<K extends OtherTypesKey>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToFields))
    throw Error(`check: unsupported type "${typeName}"`);
  Check[typeName](value);
}

// to input

type ToInput = {
  [K in OtherTypesKey]: (x: TypeMap[K]) => HashInput;
};

let ToInput: ToInput = {
  PublicKey(pk) {
    let [x, isOdd] = ToFields.PublicKey(pk);
    return {
      fields: [x],
      packed: [[isOdd, 1]],
    };
  },
  Field(x) {
    return { fields: [x] };
  },
  Bool(x) {
    return { packed: [[x.toField(), 1]] };
  },
  AuthRequired({ constant, signatureNecessary, signatureSufficient }) {
    return {
      packed: [
        [constant.toField(), 1],
        [signatureNecessary.toField(), 1],
        [signatureSufficient.toField(), 1],
      ],
    };
  },
  TokenId(x) {
    return { fields: [x] };
  },
  Sign(x) {
    return { packed: [[x.isPositive().toField(), 1]] };
  },
  UInt32(x) {
    return { packed: [[x.value, 32]] };
  },
  UInt64(x) {
    return { packed: [[x.value, 64]] };
  },
};

function toInput<K extends OtherTypesKey>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToFields))
    throw Error(`toInput: unsupported type "${typeName}"`);
  return ToInput[typeName](value);
}

// converters for types which got an annotation about its circuit type in Ocaml

type DataAsHash<T> = { data: T; hash: Field };

const Events: AsFieldsAndAux<DataAsHash<Field[][]>, string[][]> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? []];
  },
  fromFields(fields, aux) {
    let hash = fields.pop()!;
    let data = aux.pop()!;
    return { data, hash };
  },
  toJson({ data }) {
    return data.map((row) => row.map((e) => toJson('Field', e)));
  },
  check() {},
  toInput({ hash }) {
    return { fields: [hash] };
  },
};

const StringWithHash: AsFieldsAndAux<DataAsHash<string>, string> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? ''];
  },
  fromFields(fields, aux) {
    let hash = fields.pop()!;
    let data = aux.pop()!;
    return { data, hash };
  },
  toJson({ data }) {
    return data;
  },
  check() {},
  toInput({ hash }) {
    return { fields: [hash] };
  },
};
