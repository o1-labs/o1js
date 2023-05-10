import { bytesToBigInt } from '../bindings/crypto/bigint-helpers.js';
import { defineBinable } from '../bindings/lib/binable.js';
import { sizeInBits } from '../provable/field-bigint.js';
import { Bool, Scalar, Group } from '../snarky.js';
import { Field } from '../snarky.js';
// import { Field } from './field.js';
import { Scalar as ScalarBigint } from '../provable/curve-bigint.js';
import { mod } from '../bindings/crypto/finite_field.js';

export { Field, Bool, Scalar, Group };

Bool.toAuxiliary = () => [];
Scalar.toAuxiliary = () => [];
Group.toAuxiliary = () => [];

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
