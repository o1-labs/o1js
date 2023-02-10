import { bytesToBigInt } from '../js_crypto/bigint-helpers.js';
import { defineBinable } from '../provable/binable.js';
import { sizeInBits } from '../provable/field-bigint.js';
import { Bool, Field, Scalar, Group } from '../snarky.js';
import { Scalar as ScalarBigint } from '../provable/curve-bigint.js';
import { mod } from '../js_crypto/finite_field.js';

export { Field, Bool, Scalar, Group };

type InternalConstantField = { value: [0, Uint8Array] };

Field.toAuxiliary = () => [];
Bool.toAuxiliary = () => [];
Scalar.toAuxiliary = () => [];
Group.toAuxiliary = () => [];

Field.toInput = function (x) {
  return { fields: [x] };
};

// binable
const FieldBinable = defineBinable({
  toBytes(t: Field) {
    return [...(t.toConstant() as any as InternalConstantField).value[1]];
  },
  readBytes(bytes, offset) {
    let uint8array = new Uint8Array(32);
    uint8array.set(bytes.slice(offset, offset + 32));
    return [
      Object.assign(Object.create(Field(1).constructor.prototype), {
        value: [0, uint8array],
      }) as Field,
      offset + 32,
    ];
  },
});

Field.toBytes = FieldBinable.toBytes;
Field.fromBytes = FieldBinable.fromBytes;
Field.readBytes = FieldBinable.readBytes;
Field.sizeInBytes = () => 32;

Bool.toInput = function (x) {
  return { packed: [[x.toField(), 1] as [Field, number]] };
};

// binable
const BoolBinable = defineBinable({
  toBytes(b: Bool) {
    return [Number(b.toBoolean())];
  },
  readBytes(bytes, offset) {
    return [Bool(!!bytes[offset]), offset + 1];
  },
});
Bool.toBytes = BoolBinable.toBytes;
Bool.fromBytes = BoolBinable.fromBytes;
Bool.readBytes = BoolBinable.readBytes;
Bool.sizeInBytes = () => 1;

Scalar.toFieldsCompressed = function (s: Scalar) {
  let isConstant = s.toFields().every((x) => x.isConstant());
  let constantValue: Uint8Array | undefined = (s as any).constantValue;
  if (!isConstant || constantValue === undefined)
    throw Error(
      `Scalar.toFieldsCompressed is not available in provable code.
That means it can't be called in a @method or similar environment, and there's no alternative implemented to achieve that.`
    );
  let x = bytesToBigInt(constantValue);
  let lowBitSize = BigInt(sizeInBits - 1);
  let lowBitMask = (1n << lowBitSize) - 1n;
  return {
    field: Field(x & lowBitMask),
    highBit: Bool(x >> lowBitSize === 1n),
  };
};

Scalar.fromBigInt = function (scalar: bigint) {
  scalar = mod(scalar, ScalarBigint.modulus);
  return Scalar.fromJSON(scalar.toString());
};
