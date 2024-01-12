import { ConstantField, Field, FieldConst, FieldVar } from '../field.js';
import { FieldBn254 } from '../field_bn254.js';
import { MlArray } from './base.js';
export { MlFieldArray, MlFieldConstArray };

type MlFieldArray = MlArray<FieldVar>;
const MlFieldArray = {
  to(arr: Field[]): MlArray<FieldVar> {
    return MlArray.to(arr.map((x) => x.value));
  },
  from([, ...arr]: MlArray<FieldVar>) {
    return arr.map((x) => new Field(x));
  },
  fromBn254([, ...arr]: MlArray<FieldVar>) {
    return arr.map((x) => new FieldBn254(x));
  },
};

type MlFieldConstArray = MlArray<FieldConst>;
const MlFieldConstArray = {
  to(arr: Field[]): MlArray<FieldConst> {
    return MlArray.to(arr.map((x) => x.toConstant().value[1]));
  },
  toBn254(arr: FieldBn254[]): MlArray<FieldConst> {
    return MlArray.to(arr.map((x) => x.toConstant().value[1]));
  },
  from([, ...arr]: MlArray<FieldConst>): ConstantField[] {
    return arr.map((x) => new Field(x) as ConstantField);
  },
};
