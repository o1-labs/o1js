import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';

export { bindingsNapi };

function bindingsNapi(napi: any) {
  return {
    fp: {
      vectorToRust: (fields: any) => {
        console.log('values going in ', fields);
        let res = fieldsToRustFlat(fields);
        console.log('values going out ', res);
        return res;
      },
      vectorFromRust: fieldsFromRustFlat,
    },
    fq: {
      vectorToRust: (fields: any) => {
        console.log('values going in ', fields);
        let res = fieldsToRustFlat(fields);
        console.log('values going out ', res);
        return res;
      },
      vectorFromRust: (fieldBytes: any) => {
        console.log('values going in ', fieldBytes);
        let res = fieldsFromRustFlat(fieldBytes);
        console.log('values going out ', res);
        return res;
      },
    },
  };
}
