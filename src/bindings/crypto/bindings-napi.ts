import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';

export { bindingsNapi };

function bindingsNapi(napi: any) {
  return {
    fp: {
      vectorToRust: (fields: any) => {
        let res = fieldsToRustFlat(fields);
        return res;
      },
      vectorFromRust: fieldsFromRustFlat,
    },
    fq: {
      vectorToRust: (fields: any) => {
        let res = fieldsToRustFlat(fields);
        return res;
      },
      vectorFromRust: (fieldBytes: any) => {
        let res = fieldsFromRustFlat(fieldBytes);
        return res;
      },
    },
  };
}
