import { MlArray } from '../../lib/ml/base.js';
import type * as napiNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import {
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from './bindings/conversion-base.js';
import { Field, Gate, LookupTable, OrInfinity, PolyComm, Wire } from './bindings/kimchi-types.js';
import { mapTuple } from './bindings/util.js';

export { ConversionCore, ConversionCores, napiConversionCore };

type ConversionCore = ReturnType<typeof conversionCorePerField>;
type ConversionCores = ReturnType<typeof napiConversionCore>;

type NapiAffine = napiNamespace.WasmGVesta | napiNamespace.WasmGPallas;
type NapiPolyComm = { unshifted: unknown; shifted?: NapiAffine | undefined };
type PolyCommCtor = new (unshifted: unknown, shifted?: NapiAffine | undefined) => NapiPolyComm;

type NapiClasses = {
  CommitmentCurve: typeof napiNamespace.WasmGVesta | typeof napiNamespace.WasmGPallas;
  makeAffine: () => NapiAffine;
  PolyComm: napiNamespace.WasmFpPolyComm | napiNamespace.WasmFqPolyComm;
};

function napiConversionCore(napi: any) {
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
    lookupTablesToRust([, ...tables]: MlArray<LookupTable>) {
      return tables;
    },
    runtimeTableCfgsToRust([, ...tables]: MlArray<Uint8Array>) {
      return tables.map((table) => Array.from(table));
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
    fp: {
      ...fpCore,
    },
    fq: {
      ...fqCore,
    },
    ...shared,
  };
}

function conversionCorePerField({ makeAffine, PolyComm }: NapiClasses) {
  const vectorToRust = (fields: MlArray<Field>) => fieldsToRustFlat(fields);
  const vectorFromRust = fieldsFromRustFlat;

  const wireToRust = ([, row, col]: Wire) => ({ row, col });
  const wireFromRust = ({ row, col }: { row: number; col: number }): Wire => [0, row, col];

  const gateToRust = (gate: Gate) => {
    const [, typ, [, ...wires], coeffs] = gate;
    const mapped = mapTuple(wires, wireToRust);
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
  };

  const gateFromRust = (gate: {
    typ: number;
    wires: {
      w0: { row: number; col: number };
      w1: { row: number; col: number };
      w2: { row: number; col: number };
      w3: { row: number; col: number };
      w4: { row: number; col: number };
      w5: { row: number; col: number };
      w6: { row: number; col: number };
    };
    coeffs: Uint8Array | number[];
  }): Gate => {
    const { w0, w1, w2, w3, w4, w5, w6 } = gate.wires;
    const wiresTuple: [0, Wire, Wire, Wire, Wire, Wire, Wire, Wire] = [
      0,
      wireFromRust(w0),
      wireFromRust(w1),
      wireFromRust(w2),
      wireFromRust(w3),
      wireFromRust(w4),
      wireFromRust(w5),
      wireFromRust(w6),
    ];
    const coeffBytes =
      gate.coeffs instanceof Uint8Array ? gate.coeffs : Uint8Array.from(gate.coeffs);
    const coeffs = fieldsFromRustFlat(coeffBytes);
    return [0, gate.typ, wiresTuple, coeffs];
  };

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
    // console.log('pt', pt);
    // console.log('pt.x', pt.x);
    // console.log('pt.y', pt.y);

    const xField = fieldFromRust(pt.x);
    const yField = fieldFromRust(pt.y);
    return [0, [0, xField, yField]];
  };

  const pointToRust = (point: OrInfinity): NapiAffine => affineToRust(point);
  const pointFromRust = (point: NapiAffine): OrInfinity => affineFromRust(point);

  const pointsToRust = ([, ...points]: MlArray<OrInfinity>): NapiAffine[] =>
    points.map(affineToRust);
  const pointsFromRust = (points: NapiAffine[]): MlArray<OrInfinity> => [
    0,
    ...points.map(affineFromRust),
  ];

  const polyCommToRust = (polyComm: PolyComm): NapiPolyComm => {
    const [, camlElems] = polyComm;
    const unshifted = pointsToRust(camlElems);
    const PolyCommClass = PolyComm as unknown as PolyCommCtor;
    return new PolyCommClass(unshifted as unknown, undefined);
  };

  const polyCommFromRust = (polyComm: any): any => {
    if (polyComm == null) return undefined;
    // console.log('polyComm', polyComm);
    const rustUnshifted = asArrayLike<NapiAffine>(polyComm.unshifted, 'polyComm.unshifted');
    // console.log('rustUnshifted', rustUnshifted);
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
    vectorToRust,
    vectorFromRust,
    wireToRust,
    gateToRust,
    gateFromRust,
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
