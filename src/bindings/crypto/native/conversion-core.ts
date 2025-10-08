import type * as napiNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { MlArray } from '../../../lib/ml/base.js';
import { OrInfinity, Gate, PolyComm, Wire } from './kimchi-types.js';
import {
  WasmAffine as NapiAffine,
  affineFromRust,
  affineToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from './conversion-base.js';
import { mapTuple } from './util.js';


type Napi = typeof napiNamespace;

type NapiPolyComm = napiNamespace.WasmFpPolyComm | napiNamespace.WasmFqPolyComm;

type NapiClasses = {
  makeAffine: () => NapiAffine;
  PolyComm: typeof napiNamespace.WasmFpPolyComm | typeof napiNamespace.WasmFqPolyComm;
};

export function conversionCore(napi: Napi) {
  const fp = conversionCorePerField({
    makeAffine: napi.caml_vesta_affine_one,
    PolyComm: napi.WasmFpPolyComm,
  });
  const fq = conversionCorePerField({
    makeAffine: napi.caml_pallas_affine_one,
    PolyComm: napi.WasmFqPolyComm,
  });

  return {
    fp,
    fq,
    wireToRust: fp.wireToRust, // doesn't depend on the field
    mapMlArrayToRustVector<TMl, TRust extends {}>(
      [, ...array]: MlArray<TMl>,
      map: (x: TMl) => TRust
    ): TRust[] {
      return array.map(map);
    },
  };
}

function conversionCorePerField({ makeAffine, PolyComm: PolyCommClass }: NapiClasses) {
  const self = {
    wireToRust([, row, col]: Wire) {
      return { row, col };
    },

    vectorToRust: fieldsToRustFlat,
    vectorFromRust: fieldsFromRustFlat,

    gateToRust(gate: Gate): any {
      const [, typ, [, ...wires], coeffs] = gate;
      const mapped = mapTuple(wires, self.wireToRust);
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
        coeffs: toBuffer(fieldsToRustFlat(coeffs)),
      };
    },
    gateFromRust(nativeGate: any): Gate {
      const { typ, wires, coeffs } = nativeGate;
      const mlWires: Gate[2] = [
        0,
        [0, wires.w0.row, wires.w0.col],
        [0, wires.w1.row, wires.w1.col],
        [0, wires.w2.row, wires.w2.col],
        [0, wires.w3.row, wires.w3.col],
        [0, wires.w4.row, wires.w4.col],
        [0, wires.w5.row, wires.w5.col],
        [0, wires.w6.row, wires.w6.col],
      ];
      const mlCoeffs = fieldsFromRustFlat(toUint8Array(coeffs));
      return [0, typ, mlWires, mlCoeffs];
    },

    pointToRust(point: OrInfinity) {
      return affineToRust(point, makeAffine);
    },
    pointFromRust(point: any): OrInfinity {
      return affineFromRust(point);
    },

    pointsToRust([, ...points]: MlArray<OrInfinity>): any[] {
      return points.map(self.pointToRust);
    },
    pointsFromRust(points: unknown): MlArray<OrInfinity> {
      return [0, ...asArray(points, 'pointsFromRust').map(self.pointFromRust)];
    },

    polyCommToRust(polyComm: PolyComm): NapiPolyComm {
      const [, camlElems] = polyComm;
      const rustUnshifted = self.pointsToRust(camlElems);
      return new PolyCommClass(rustUnshifted, undefined);
    },
    polyCommFromRust(polyComm: NapiPolyComm): PolyComm {
      const rustUnshifted = asArray((polyComm as any).unshifted, 'polyComm.unshifted');
      const mlUnshifted = rustUnshifted.map(self.pointFromRust);
      return [0, [0, ...mlUnshifted]];
    },

    polyCommsToRust([, ...comms]: MlArray<PolyComm>): NapiPolyComm[] {
      return comms.map(self.polyCommToRust);
    },
    polyCommsFromRust(rustComms: NapiPolyComm[]): MlArray<PolyComm> {
      return [0, ...asArray(rustComms, 'polyCommsFromRust').map(self.polyCommFromRust)];
    },
  };

  return self;
}

function asArray<T>(value: unknown, context: string): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  throw Error(`${context}: expected array of native values`);
}

function toUint8Array(value: any): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (value && typeof value === 'object') {
    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
  }
  throw Error('Expected byte array');
}

function toBuffer(bytes: Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) return bytes;
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
