import { Field, Bool, Group, Ledger, Circuit } from '../snarky';
import * as Json from './gen/parties-json';
import { UInt32, UInt64, Sign } from '../lib/int';
import { TokenSymbol, HashInput } from '../lib/hash';
import { PublicKey } from '../lib/signature';
import {
  AsFieldsAndAux,
  AsFieldsExtended,
  circuitValue,
} from '../lib/circuit_value';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export { Events, StringWithHash, TokenSymbol };

export {
  toJSON,
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
type FullTypesKey =
  | 'number'
  | 'null'
  | 'undefined'
  | 'string'
  | 'UInt32'
  | 'UInt64'
  | 'Sign'
  | 'TokenId'
  | 'AuthRequired'
  | 'PublicKey';
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
  toJSON: () => null,
};

const TokenId: AsFieldsExtended<TokenId> = {
  ...circuitValue<TokenId>(Field),
  toJSON(x: TokenId): Json.TokenId {
    return Ledger.fieldToBase58(x);
  },
};

const AuthRequired: AsFieldsExtended<AuthRequired> = {
  ...circuitValue<AuthRequired>(
    { constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool },
    {
      customObjectKeys: [
        'constant',
        'signatureNecessary',
        'signatureSufficient',
      ],
    }
  ),
  toJSON(x): Json.AuthRequired {
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
  // TODO: this should be made automatic by putting toInput on Bool
  toInput({ constant, signatureNecessary, signatureSufficient }) {
    return {
      packed: [
        [constant.toField(), 1],
        [signatureNecessary.toField(), 1],
        [signatureSufficient.toField(), 1],
      ],
    };
  },
};

const PublicKeyCompressed: AsFieldsExtended<PublicKey> = {
  ...circuitValue<PublicKey>(PublicKey),
  toJSON(x): Json.PublicKey {
    return Ledger.publicKeyToString(x);
  },
  toFields({ g }: PublicKey) {
    let { x, y } = g;
    // TODO inefficient! in-snark public key should be uncompressed
    let isOdd = y.toBits()[0];
    return [x, isOdd.toField()];
  },
  ofFields([x, isOdd]) {
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
  toInput(pk) {
    let [x, isOdd] = this.toFields(pk);
    return {
      fields: [x],
      packed: [[isOdd, 1]],
    };
  },
};

const FullTypes: FullTypes = {
  UInt32: AsFieldsAndAux.fromCircuitValue(UInt32),
  UInt64: AsFieldsAndAux.fromCircuitValue(UInt64),
  Sign: AsFieldsAndAux.fromCircuitValue(Sign),
  TokenId: AsFieldsAndAux.fromCircuitValue(TokenId),
  AuthRequired: AsFieldsAndAux.fromCircuitValue(AuthRequired),
  PublicKey: AsFieldsAndAux.fromCircuitValue(PublicKeyCompressed),
  // primitive JS types
  number: {
    ...emptyType,
    toAuxiliary: (value = 0) => [value],
    toJSON: (value) => value,
    fromFields: (_, aux) => aux.pop()!,
  },
  string: {
    ...emptyType,
    toAuxiliary: (value = '') => [value],
    toJSON: (value) => value,
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
  Field: asString,
  Bool(x: Bool) {
    return x.toBoolean();
  },
};

function toJSON<K extends OtherTypesKey>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToJson))
    throw Error(`toJSON: unsupported type "${typeName}"`);
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
  Field: asFields,
  Bool: asFields,
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
  Field: empty,
  Bool: empty,
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
  Field: 1,
  Bool: 1,
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
  Field(fields: Field[]) {
    return fields.pop()!;
  },
  Bool(fields: Field[]) {
    return Bool.Unsafe.ofField(fields.pop()!);
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
  Field: (v) => Field.check(v),
  Bool: (v) => Bool.check(v),
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
  Field(x) {
    return { fields: [x] };
  },
  Bool(x) {
    return { packed: [[x.toField(), 1]] };
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
  toJSON({ data }) {
    return data.map((row) => row.map((e) => toJSON('Field', e)));
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
  toJSON({ data }) {
    return data;
  },
  check() {},
  toInput({ hash }) {
    return { fields: [hash] };
  },
};
