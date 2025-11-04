import { fieldFromRust, fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { Gate, Wire } from './bindings/kimchi-types.js';
import { mapTuple } from './bindings/util.js';

export { bindingsNapi };

function bindingsNapi(napi: any) {
  return {
    fp: {
      vectorToRust: (fields: any) => {
        return fieldsToRustFlat(fields);
      },
      vectorFromRust: fieldsFromRustFlat,
      wireToRust([, row, col]: Wire) {
        return { row, col };
      },
      gateToRust(gate: Gate): any {
        const [, typ, [, ...wires], coeffs] = gate;
        const mapped = mapTuple(wires, (wire) => this.wireToRust(wire));
        const nativeWires = {
          w0: mapped[0],
          w1: mapped[1],
          w2: mapped[2],
          w3: mapped[3],
          w4: mapped[4],
          w5: mapped[5],
          w6: mapped[6],
        } as const;
        return {
          typ,
          wires: nativeWires,
          coeffs: Array.from(fieldsToRustFlat(coeffs)),
        };
      },
      shiftsFromRust(s: any) {
        let shifts = [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6].map((x) => Uint8Array.from(x));
        let shifted = [0, ...shifts.map(fieldFromRust)];
        return shifted;
      },
    },
    fq: {
      vectorToRust: (fields: any) => {
        return fieldsToRustFlat(fields);
      },
      vectorFromRust: (fieldBytes: any) => {
        return fieldsFromRustFlat(fieldBytes);

      },
      wireToRust([, row, col]: Wire) {
        return { row, col };
      },
      gateToRust(gate: Gate): any {
        const [, typ, [, ...wires], coeffs] = gate;
        const mapped = mapTuple(wires, (wire) => this.wireToRust(wire));
        const nativeWires = {
          w0: mapped[0],
          w1: mapped[1],
          w2: mapped[2],
          w3: mapped[3],
          w4: mapped[4],
          w5: mapped[5],
          w6: mapped[6],
        } as const;
        return {
          typ,
          wires: nativeWires,
          coeffs: Array.from(fieldsToRustFlat(coeffs)),
        };
      },
      shiftsFromRust(s: any) {
        let shifts = [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6].map((x) => Uint8Array.from(x));
        let shifted = [0, ...shifts.map(fieldFromRust)];
        return shifted;
      },
    },
  };
}
