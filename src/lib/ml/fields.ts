import { ConstantField, Field } from '../provable/field.js';
import { FieldVar, FieldConst } from '../provable/core/fieldvar.js';
import { MlArray } from './base.js';
export { MlFieldArray, MlFieldConstArray };

type MlFieldArray = MlArray<FieldVar>;
const MlFieldArray = {
  to(arr: Field[]): MlArray<FieldVar> {
    // Add defensive programming to handle undefined/null Field objects
    const validFields = arr.filter((x) => x !== undefined && x !== null);
    if (validFields.length !== arr.length) {
      console.warn(`MlFieldArray.to(): Filtered out ${arr.length - validFields.length} undefined/null field objects`);
    }
    return MlArray.to(validFields.map((x) => x.value));
  },
  from([, ...arr]: MlArray<FieldVar>) {
    return arr.map((x) => new Field(x));
  },
};

type MlFieldConstArray = MlArray<FieldConst>;
const MlFieldConstArray = {
  to(arr: Field[]): MlArray<FieldConst> {
    return MlArray.to(arr.map((x) => x.toConstant().value[1]));
  },
  from([, ...arr]: MlArray<FieldConst>): ConstantField[] {
    return arr.map((x) => new Field(x) as ConstantField);
  },
};
