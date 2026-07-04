import { MlArray } from '../../../lib/ml/base.js';
import {
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from '../bindings/conversion-base.js';
import { Field, Gate, OrInfinity, PolyComm, Wire } from '../bindings/kimchi-types.js';
import type {
  Napi,
  NapiAffine,
  NapiPolyComm,
  NapiCoreClasses,
  PolyCommCtor,
} from './napi-wrappers.js';
import {
  asArrayLike,
} from './napi-ffi.js';

export { ConversionCore, ConversionCores, napiConversionCore };

type ConversionCore = ReturnType<typeof conversionCorePerField>;
type ConversionCores = ReturnType<typeof napiConversionCore>;

function wireToRust([, row, col]: Wire) {
  return { row, col };
}

function wireFromRust({ row, col }: { row: number; col: number }): Wire {
  return [0, row, col];
}

function napiConversionCore(napi: Napi) {
  const fpCore = conversionCorePerField({
    makeAffine: napi.caml_vesta_affine_one,
    PolyComm: napi.WasmFpPolyComm,
  });
  const fqCore = conversionCorePerField({
    makeAffine: napi.caml_pallas_affine_one,
    PolyComm: napi.WasmFqPolyComm,
  });

  return {
    fp: {
      ...fpCore,
    },
    fq: {
      ...fqCore,
    },
    wireToRust,
    mapMlArrayToRustVector<TMl, TRust>([, ...array]: [0, ...TMl[]], map: (x: TMl) => TRust) {
      return array.map(map);
    },
  };
}

function conversionCorePerField({ makeAffine, PolyComm }: NapiCoreClasses) {
  const vectorToRust = (fields: MlArray<Field>) => fieldsToRustFlat(fields);
  const vectorFromRust = fieldsFromRustFlat;

  // flat encoding matching gate_vector_add (typ + Int32Array of 14 wire ints +
  // coeff bytes) — nested objects cost one napi call per property read on wasm
  const gateToRust = (gate: Gate) => {
    const [, typ, [, ...wires], coeffs] = gate;
    let wireInts = new Int32Array(14);
    for (let i = 0; i < 7; i++) {
      let [, row, col] = wires[i];
      wireInts[2 * i] = row;
      wireInts[2 * i + 1] = col;
    }
    return { typ, wires: wireInts, coeffs: fieldsToRustFlat(coeffs) };
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

  // `WasmGVesta` / `WasmGPallas` are `#[napi(object)]` (plain JS objects), so points can be
  // built in JS without an ffi call per point. the infinity case reuses the generator's
  // coordinate bytes fetched once via makeAffine() — the rust side ignores x/y when
  // infinity is set, and only ever copies out of the buffers, so sharing them is fine.
  let affineOne: NapiAffine | undefined;
  const affineToRust = (pt: OrInfinity): NapiAffine => {
    if (!Array.isArray(pt)) {
      affineOne ??= makeAffine();
      return { x: affineOne.x, y: affineOne.y, infinity: true };
    }
    const [, pair] = pt as [0, [0, Field, Field]];
    const [, x, y] = pair;
    // distinct byte arrays for each coordinate — assigning the same backing buffer to
    // both `x` and `y` corrupts the point
    return { x: fieldToRust(x), y: fieldToRust(y), infinity: false };
  };
  const affineFromRust = (pt: NapiAffine): OrInfinity => {
    if (pt.infinity) return 0;

    const xField = fieldFromRust(pt.x);
    const yField = fieldFromRust(pt.y);
    return [0, [0, xField, yField]];
  };

  const pointsToRust = ([, ...points]: MlArray<OrInfinity>): NapiAffine[] =>
    points.map(affineToRust);
  const pointsFromRust = (points: ArrayLike<NapiAffine>): MlArray<OrInfinity> => [
    0,
    ...Array.from(points, affineFromRust),
  ];

  const polyCommToRust = (polyComm: PolyComm): NapiPolyComm => {
    const [, camlElems] = polyComm;
    const unshifted = pointsToRust(camlElems);
    const PolyCommClass = PolyComm as unknown as PolyCommCtor;
    return new PolyCommClass(unshifted, undefined);
  };

  const polyCommFromRust = (polyComm: NapiPolyComm): PolyComm => {
    const rustUnshifted = asArrayLike<NapiAffine>(polyComm.unshifted, 'polyComm.unshifted');
    const mlUnshifted = rustUnshifted.map(affineFromRust);
    return [0, [0, ...mlUnshifted]];
  };

  const polyCommsToRust = ([, ...comms]: MlArray<PolyComm>): NapiPolyComm[] =>
    comms.map(polyCommToRust);

  const polyCommsFromRust = (rustComms: unknown): MlArray<PolyComm> => {
    if (rustComms == null) {
      throw Error('polyCommsFromRust: expected array-like native values');
    }
    const comms = asArrayLike<NapiPolyComm>(rustComms, 'polyCommsFromRust');
    return [0, ...comms.map(polyCommFromRust)];
  };

  const self = {
    vectorToRust,
    vectorFromRust,
    wireToRust,
    gateToRust,
    gateFromRust,
    affineToRust,
    affineFromRust,
    pointToRust: affineToRust,
    pointFromRust: affineFromRust,
    pointsToRust,
    pointsFromRust,
    polyCommToRust,
    polyCommFromRust,
    polyCommsToRust,
    polyCommsFromRust,
  };

  return self;
}
