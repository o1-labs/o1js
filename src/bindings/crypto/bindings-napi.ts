import { Buffer } from 'node:buffer';
import { fieldFromRust, fieldToRust, fieldsFromRustFlat, fieldsToRustFlat } from './bindings/conversion-base.js';
import { Gate, OrInfinity, PolyComm, Wire, Field } from './bindings/kimchi-types.js';
import { MlArray } from '../../lib/ml/base.js';
import { mapTuple } from './bindings/util.js';
import type * as napiNamespace from '../compiled/node_bindings/plonk_wasm.cjs';

export { bindingsNapi };

type NapiAffine = napiNamespace.WasmGVesta | napiNamespace.WasmGPallas;
type NapiPolyComm = { unshifted: unknown; shifted?: NapiAffine | undefined };
type PolyCommCtor = new (unshifted: unknown, shifted?: NapiAffine | undefined) => NapiPolyComm;

//const FIELD_BYTE_LENGTH = fieldToRust([0, 0n]).length;

type NapiClasses = {
  CommitmentCurve: typeof napiNamespace.WasmGVesta | typeof napiNamespace.WasmGPallas;
  makeAffine: () => NapiAffine;
  PolyComm: napiNamespace.WasmFpPolyComm | napiNamespace.WasmFqPolyComm;
}

function bindingsNapi(napi: any) {
  const fpCore = conversionCorePerField({
    CommitmentCurve: napi.WasmGVesta,
    makeAffine: napi.caml_vesta_affine_one,
    PolyComm: napi.WasmFpPolyComm,
  });
  const fqCore = conversionCorePerField({
    CommitmentCurve: napi.WasmGPallas,
    makeAffine: napi.caml_pallas_affine_one,
    PolyComm: napi.WasmFqPolyComm,
  });

  const shared = {
    vectorToRust: (fields: any) => fieldsToRustFlat(fields),
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
  };

  return {
    fp: { ...shared, ...fpCore },
    fq: { ...shared, ...fqCore },
  };
}

function conversionCorePerField({ makeAffine, PolyComm }: NapiClasses) {
  const affineToRust = (pt: OrInfinity): NapiAffine => {
    function isFinitePoint(point: OrInfinity): point is [0, [0, Field, Field]] {
      return Array.isArray(point);
    }
    let res = makeAffine();
    if (!isFinitePoint(pt)) {
      res.infinity = true;
    } else {
      const tmpBytes = new Uint8Array(32);
      const [, pair] = pt;
      const [, x, y] = pair;
      res.x = fieldToRust(x, tmpBytes);
      res.y = fieldToRust(y, tmpBytes);
    }
    return res;
  };
  const affineFromRust = (pt: NapiAffine): OrInfinity => {
    if (pt.infinity) return 0;
    const xField = fieldFromRust(pt.x);
    const yField = fieldFromRust(pt.y);
    return [0, [0, xField, yField]];
  };  

  const pointToRust = (point: OrInfinity): NapiAffine => affineToRust(point);
  const pointFromRust = (point: NapiAffine): OrInfinity => affineFromRust(point);

  const pointsToRust = ([, ...points]: MlArray<OrInfinity>): NapiAffine[] => points.map(affineToRust);
  const pointsFromRust = (points: NapiAffine[]): MlArray<OrInfinity> => [0, ...points.map(affineFromRust)];

  const polyCommToRust = (polyComm: PolyComm): NapiPolyComm => {
    const [, camlElems] = polyComm;
    const unshifted = pointsToRust(camlElems);
    const PolyCommClass = PolyComm as unknown as PolyCommCtor;
    return new PolyCommClass(unshifted as unknown, undefined);
  };

  const polyCommFromRust = (polyComm: NapiPolyComm): PolyComm => {
    const rustUnshifted = asArrayLike<NapiAffine>(polyComm.unshifted, 'polyComm.unshifted');
    const mlUnshifted = rustUnshifted.map(affineFromRust);
    return [0, [0, ...mlUnshifted]];
  };

  const polyCommsToRust = ([, ...comms]: MlArray<PolyComm>): NapiPolyComm[] =>
    comms.map(polyCommToRust);

  const polyCommsFromRust = (rustComms: unknown): MlArray<PolyComm> => {
    const comms = asArrayLike<NapiPolyComm>(rustComms, 'polyCommsFromRust');
    return [0, ...comms.map(polyCommFromRust)];
  };

  return {
    affineToRust,
    affineFromRust,
    pointToRust,
    pointFromRust,
    pointsToRust,
    pointsFromRust,
    polyCommToRust,
    polyCommFromRust,
    polyCommsToRust,
    polyCommsFromRust,
  };
}

function asArrayLike<T>(value: unknown, context: string): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<T>);
  if (typeof value === 'object' && value !== null && 'length' in (value as { length: unknown })) {
    const { length } = value as { length: unknown };
    if (typeof length === 'number') return Array.from(value as ArrayLike<T>);
  }
  throw Error(`${context}: expected array-like native values`);
}
