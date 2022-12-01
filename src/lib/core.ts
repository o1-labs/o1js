import { Bool, Field, Scalar, Group } from '../snarky.js';

export { Field, Bool };

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
