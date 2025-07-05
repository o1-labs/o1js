import { Field } from '../provable/field.js';
import { MlArray } from './base.js';
export { MlFieldArray, MlFieldConstArray };
const MlFieldArray = {
    to(arr) {
        return MlArray.to(arr.map((x) => x.value));
    },
    from([, ...arr]) {
        return arr.map((x) => new Field(x));
    },
};
const MlFieldConstArray = {
    to(arr) {
        return MlArray.to(arr.map((x) => x.toConstant().value[1]));
    },
    from([, ...arr]) {
        return arr.map((x) => new Field(x));
    },
};
