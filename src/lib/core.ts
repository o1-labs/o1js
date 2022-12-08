import { bytesToBigInt, sizeInBits } from '../provable/field-bigint.js';
import { Bool, Field, Scalar, Group } from '../snarky.js';

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
Field.toBytes = function (x) {
  return [...(x.toConstant() as any as InternalConstantField).value[1]];
};
Field.fromBytes = function (bytes) {
  let uint8array = new Uint8Array(32);
  uint8array.set(bytes);
  return Object.assign(Object.create(Field(1).constructor.prototype), {
    value: [0, uint8array],
  });
};
Field.sizeInBytes = () => 32;

Bool.toInput = function (x) {
  return { packed: [[x.toField(), 1] as [Field, number]] };
};

// binable
Bool.toBytes = function (b) {
  return [Number(b.toBoolean())];
};
Bool.fromBytes = function ([b]) {
  return Bool(!!b);
};
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
