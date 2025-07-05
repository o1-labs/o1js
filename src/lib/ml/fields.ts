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
    return arr.map((x) => {
      // Handle ML Array format in FieldVar data
      // If x is an ML Array like [0, [0, "value"], [0, "value2"], ...], extract the first field constant
      if (Array.isArray(x) && x.length > 2 && x[0] === 0) {
        // This is an ML Array with multiple field constants, use the first one
        console.log('🔍 MlFieldArray.from: Detected ML Array format, extracting first field constant');
        const firstFieldConst = x[1];
        if (Array.isArray(firstFieldConst) && firstFieldConst.length === 2 && firstFieldConst[0] === 0) {
          console.log('✅ MlFieldArray.from: Using extracted field constant:', firstFieldConst);
          return new Field([0, firstFieldConst]);
        }
      }
      
      // Standard FieldVar format
      return new Field(x);
    });
  },
};

type MlFieldConstArray = MlArray<FieldConst>;
const MlFieldConstArray = {
  to(arr: Field[]): MlArray<FieldConst> {
    // DEBUG: Log the conversion process
    if ((globalThis as any).DEBUG_ML_FIELD_CONST_ARRAY) {
      console.log('[MlFieldConstArray.to] Input array:', arr);
      console.log('[MlFieldConstArray.to] Array length:', arr.length);
      arr.forEach((x, i) => {
        console.log(`[MlFieldConstArray.to] Field[${i}]:`, x);
        console.log(`[MlFieldConstArray.to] Field[${i}].value:`, x?.value);
        console.log(`[MlFieldConstArray.to] Field[${i}].toConstant:`, typeof x?.toConstant);
        try {
          const constant = x?.toConstant?.();
          console.log(`[MlFieldConstArray.to] Field[${i}].toConstant():`, constant);
          console.log(`[MlFieldConstArray.to] Field[${i}].toConstant().value:`, constant?.value);
          console.log(`[MlFieldConstArray.to] Field[${i}].toConstant().value[1]:`, constant?.value?.[1]);
        } catch (e) {
          console.log(`[MlFieldConstArray.to] Error converting Field[${i}]:`, e);
        }
      });
    }
    
    return MlArray.to(arr.map((x) => x.toConstant().value[1]));
  },
  from([, ...arr]: MlArray<FieldConst>): ConstantField[] {
    return arr.map((x) => {
      // Handle ML Array format in FieldConst data  
      // If x is an ML Array like [0, [0, "value"], [0, "value2"], ...], extract the first field constant
      if (Array.isArray(x) && x.length > 2 && x[0] === 0) {
        // This is an ML Array with multiple field constants, use the first one
        console.log('🔍 MlFieldConstArray.from: Detected ML Array format, extracting first field constant');
        const firstFieldConst = x[1];
        if (Array.isArray(firstFieldConst) && firstFieldConst.length === 2 && firstFieldConst[0] === 0) {
          console.log('✅ MlFieldConstArray.from: Using extracted field constant:', firstFieldConst);
          // Return just the FieldConst format [0, "value"]
          return new Field(firstFieldConst) as ConstantField;
        }
      }
      
      // Standard FieldConst format
      return new Field(x) as ConstantField;
    });
  },
};
