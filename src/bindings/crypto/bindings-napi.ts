import { fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { Gate, Wire } from './bindings/kimchi-types.js';
import { mapTuple } from './bindings/util.js';

export { bindingsNapi };

function bindingsNapi(napi: any) {
  return {
    fp: {
      vectorToRust: (fields: any) => {
        //console.log('values going in ', fields);
        let res = fieldsToRustFlat(fields);
        //console.log('values going out ', res);
        return res;
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
    },
    fq: {
      vectorToRust: (fields: any) => {
        //console.log('values going in ', fields);
        let res = fieldsToRustFlat(fields);
        //console.log('values going out ', res);
        return res;
      },
      vectorFromRust: (fieldBytes: any) => {
        //console.log('values going in ', fieldBytes);
        let res = fieldsFromRustFlat(fieldBytes);
        //console.log('values going out ', res);
        return res;
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
    },
  };
}
