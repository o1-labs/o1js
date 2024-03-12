import { FieldBn254, ConstantField, FieldConst, FieldVar } from '../field-bn254.js';
import { MlArray } from './base.js';
export { MlFieldArray, MlFieldConstArray };

type MlFieldArray = MlArray<FieldVar>;
const MlFieldArray = {
  to(arr: FieldBn254[]): MlArray<FieldVar> {
    return MlArray.to(arr.map((x) => x.value));
  },
  from([, ...arr]: MlArray<FieldVar>) {
    return arr.map((x) => new FieldBn254(x));
  },
};

type MlFieldConstArray = MlArray<FieldConst>;
const MlFieldConstArray = {
  to(arr: FieldBn254[]): MlArray<FieldConst> {
    return MlArray.to(arr.map((x) => x.toConstant().value[1]));
  },
  from([, ...arr]: MlArray<FieldConst>): ConstantField[] {
    return arr.map((x) => new FieldBn254(x) as ConstantField);
  },
};
