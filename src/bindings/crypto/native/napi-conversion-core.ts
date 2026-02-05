import { MlArray } from '../../../lib/ml/base.js';
import {
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from '../bindings/conversion-base.js';
import { Field, Gate, OrInfinity, PolyComm, Wire } from '../bindings/kimchi-types.js';
import { mapTuple } from '../bindings/util.js';
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
    CommitmentCurve: napi.WasmGVesta,
    makeAffine: napi.caml_vesta_affine_one,
    PolyComm: napi.WasmFpPolyComm,
  });
  const fqCore = conversionCorePerField({
    CommitmentCurve: napi.WasmGPallas,
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
      const [, pair] = pt;
      const [, x, y] = pair;
      // `WasmGVesta` / `WasmGPallas` are `#[napi(object)]` (plain JS objects), so assigning the
      // same backing buffer to both `x` and `y` corrupts the point. Always use distinct byte
      // arrays for each coordinate.
      res.x = fieldToRust(x);
      res.y = fieldToRust(y);
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
    pointToRust,
    pointFromRust,
    pointsToRust,
    pointsFromRust,
    polyCommToRust,
    polyCommFromRust,
    polyCommsToRust,
    polyCommsFromRust,
  };

  return self;
}
