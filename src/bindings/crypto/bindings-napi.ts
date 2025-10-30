import { fieldFromRust, fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';

export { bindingsNapi };

function bindingsNapi(napi: any) {
  return {
    fp: {
      vectorToRust: (fields: any) => {
        return fieldsToRustFlat(fields);
      },
      vectorFromRust: fieldsFromRustFlat,
      shiftsFromRust(s: any) {
        let shifts = [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6].map((x) => Uint8Array.from(x));
        let shifted = [0, ...shifts.map(fieldFromRust)];
        return shifted;
      },
    },
    fq: {
      shiftsFromRust(s: any) {
        let shifts = [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6].map((x) => Uint8Array.from(x));
        let shifted = [0, ...shifts.map(fieldFromRust)];
        return shifted;
      },
      vectorToRust: (fields: any) => {
        return fieldsToRustFlat(fields);
      },
      vectorFromRust: (fieldBytes: any) => {
        return fieldsFromRustFlat(fieldBytes);
      },
    },
  };
}
