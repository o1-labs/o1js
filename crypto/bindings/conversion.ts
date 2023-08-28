/**
 * Implementation of Kimchi_bindings.Protocol.Gates
 */
import { MlArray, MlOption, MlTuple } from '../../../lib/ml/base.js';
import { mapTuple } from './util.js';
import type {
  WasmFpDomain,
  WasmFpGate,
  WasmFpPlonkVerificationEvals,
  WasmFpPlonkVerifierIndex,
  WasmFpPolyComm,
  WasmFpShifts,
  WasmFpSrs,
  WasmFqDomain,
  WasmFqGate,
  WasmFqPlonkVerificationEvals,
  WasmFqPlonkVerifierIndex,
  WasmFqPolyComm,
  WasmFqShifts,
  WasmFqSrs,
  WasmGPallas,
  WasmGVesta,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { bigIntToBytes, bytesToBigInt } from '../bigint-helpers.js';
import { Lookup } from './lookup.js';

export { createRustConversion };

type Field = Uint8Array;

// Kimchi_types.or_infinity
type OrInfinity = MlOption<MlTuple<Field, Field>>;

// ml types from kimchi_types.ml

type GateType = number;
type Wire = [_: 0, row: number, col: number];
type Gate = [
  _: 0,
  typ: GateType,
  wires: [0, Wire, Wire, Wire, Wire, Wire, Wire, Wire],
  coeffs: MlArray<Field>
];

type PolyComm = [
  _: 0,
  unshifted: MlArray<OrInfinity>,
  shifted: MlOption<OrInfinity>
];

type Domain = [_: 0, log_size_of_group: number, group_gen: Field];

type VerificationEvals = [
  _: 0,
  sigma_comm: MlArray<PolyComm>,
  coefficients_comm: MlArray<PolyComm>,
  generic_comm: PolyComm,
  psm_comm: PolyComm,
  complete_add_comm: PolyComm,
  mul_comm: PolyComm,
  emul_comm: PolyComm,
  endomul_scalar_comm: PolyComm
];

type VerifierIndex = [
  _: 0,
  domain: Domain,
  max_poly_size: number,
  public_: number,
  prev_challenges: number,
  srs: WasmSrs,
  evals: VerificationEvals,
  shifts: MlArray<Field>,
  lookup_index: MlOption<Lookup<PolyComm>>
];

// wasm types

type wasm = typeof wasmNamespace;

type WasmAffine = WasmGVesta | WasmGPallas;
type WasmPolyComm = WasmFpPolyComm | WasmFqPolyComm;
type WasmSrs = WasmFpSrs | WasmFqSrs;
type WasmDomain = WasmFpDomain | WasmFqDomain;
type WasmVerificationEvals =
  | WasmFpPlonkVerificationEvals
  | WasmFqPlonkVerificationEvals;
type WasmShifts = WasmFpShifts | WasmFqShifts;
type WasmVerifierIndex = WasmFpPlonkVerifierIndex | WasmFqPlonkVerifierIndex;

// wasm class types

type WasmPolyCommClass = typeof WasmFpPolyComm | typeof WasmFqPolyComm;

type WasmClasses = {
  CommitmentCurve: WrapperClass<WasmGVesta> | WrapperClass<WasmGPallas>;
  makeCurve: MakeAffine<WasmAffine>;
  Gate: typeof WasmFpGate | typeof WasmFqGate;
  PolyComm: typeof WasmFpPolyComm | typeof WasmFqPolyComm;
  Domain: typeof WasmFpDomain | typeof WasmFqDomain;
  VerificationEvals:
    | typeof WasmFpPlonkVerificationEvals
    | typeof WasmFqPlonkVerificationEvals;
  Shifts: typeof WasmFpShifts | typeof WasmFqShifts;
  VerifierIndex:
    | typeof WasmFpPlonkVerifierIndex
    | typeof WasmFqPlonkVerifierIndex;
};

// TODO: Hardcoding this is a little brittle
// TODO read from field
const fieldSizeBytes = 32;

function createRustConversion(wasm: wasm) {
  function wireToRust([, row, col]: Wire) {
    return wasm.Wire.create(row, col);
  }

  function perField({
    CommitmentCurve,
    makeCurve,
    Gate,
    PolyComm,
  }: WasmClasses) {
    function domainToRust(domain: Domain): WasmDomain {
      throw 'todo';
    }
    function domainFromRust(domain: WasmDomain): Domain {
      throw 'todo';
    }

    function verificationEvalsToRust(
      evals: VerificationEvals
    ): WasmVerificationEvals {
      throw 'todo';
    }
    function verificationEvalsFromRust(
      evals: WasmVerificationEvals
    ): VerificationEvals {
      throw 'todo';
    }

    function shiftsToRust(shifts: MlArray<Field>): WasmShifts {
      throw 'todo';
    }
    function shiftsFromRust(shifts: WasmShifts): MlArray<Field> {
      throw 'todo';
    }

    return {
      vectorToRust: fieldsToRustFlat,
      vectorFromRust: fieldsFromRustFlat,
      gateToRust(gate: Gate) {
        let [, typ, [, ...wires], coeffs] = gate;
        let rustWires = new wasm.WasmGateWires(...mapTuple(wires, wireToRust));
        let rustCoeffs = fieldsToRustFlat(coeffs);
        return new Gate(typ, rustWires, rustCoeffs);
      },
      pointToRust(point: OrInfinity) {
        return affineToRust(point, makeCurve);
      },
      pointFromRust(point: WasmAffine) {
        return affineFromRust(point);
      },
      pointsToRust(points: MlArray<OrInfinity>) {
        return mlArrayToRustVector(points, affineToRust, makeCurve);
      },
      pointsFromRust(points: Uint32Array) {
        return mlArrayFromRustVector(
          points,
          CommitmentCurve,
          affineFromRust,
          false
        );
      },
      polyCommToRust(polyComm: PolyComm): WasmPolyComm {
        return polyCommToRust(polyComm, PolyComm, makeCurve);
      },
      polyCommFromRust(polyComm: WasmPolyComm): PolyComm {
        return polyCommFromRust(polyComm, CommitmentCurve, false);
      },
      verifierIndexToRust(vk: VerifierIndex): WasmVerifierIndex {
        throw 'todo';
      },
      verifierIndexFromRust(vk: WasmVerifierIndex): VerifierIndex {
        throw 'todo';
      },
    };
  }

  // TODO: we have to lie about types here:
  // -) the WasmGVesta class doesn't declare __wrap() but our code assumes it
  // -) WasmGVesta doesn't declare the `ptr` property but our code assumes it

  const fp = perField({
    CommitmentCurve: wasm.WasmGVesta as any as WrapperClass<WasmGVesta>,
    makeCurve: wasm.caml_vesta_affine_one as MakeAffine<WasmGVesta>,
    Gate: wasm.WasmFpGate,
    PolyComm: wasm.WasmFpPolyComm,
    Domain: wasm.WasmFpDomain,
    VerificationEvals: wasm.WasmFpPlonkVerificationEvals,
    Shifts: wasm.WasmFpShifts,
    VerifierIndex: wasm.WasmFpPlonkVerifierIndex,
  });
  const fq = perField({
    CommitmentCurve: wasm.WasmGPallas as any as WrapperClass<WasmGPallas>,
    makeCurve: wasm.caml_pallas_affine_one as MakeAffine<WasmGPallas>,
    Gate: wasm.WasmFqGate,
    PolyComm: wasm.WasmFqPolyComm,
    Domain: wasm.WasmFqDomain,
    VerificationEvals: wasm.WasmFqPlonkVerificationEvals,
    Shifts: wasm.WasmFqShifts,
    VerifierIndex: wasm.WasmFqPlonkVerifierIndex,
  });

  return {
    wireToRust,
    fieldsToRustFlat,
    fieldsFromRustFlat,
    fp,
    fq,
    gateFromRust(wasmGate: WasmFpGate | WasmFqGate) {
      // note: this was never used and the old implementation was wrong
      // (accessed non-existent fields on wasmGate)
      throw Error('gateFromRust not implemented');
    },
  };
}

// field, field vectors

// TODO make more performant
function fieldToRust(x: Field): Uint8Array {
  return x;
}
function fieldFromRust(x: Uint8Array): Field {
  return x;
}

// TODO avoid intermediate Uint8Arrays
function fieldsToRustFlat([, ...fields]: MlArray<Field>): Uint8Array {
  let n = fields.length;
  let flatBytes = new Uint8Array(n * fieldSizeBytes);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let fieldBytes = fieldToRust(fields[i]);
    flatBytes.set(fieldBytes, offset);
  }
  return flatBytes;
}

function fieldsFromRustFlat(fieldBytes: Uint8Array): MlArray<Field> {
  var n = fieldBytes.length / fieldSizeBytes;
  if (!Number.isInteger(n)) {
    throw Error('fieldsFromRustFlat: invalid bytes');
  }
  var fields: Field[] = Array(n);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let fieldView = new Uint8Array(fieldBytes.buffer, offset, fieldSizeBytes);
    fields[i] = fieldFromRust(fieldView);
  }
  return [0, ...fields];
}

// affine

type MakeAffine<A extends WasmAffine> = () => A & { ptr: number };

function affineFromRust(pt: WasmAffine): OrInfinity {
  if (pt.infinity) {
    pt.free();
    return 0;
  } else {
    let x = fieldFromRust(pt.x);
    let y = fieldFromRust(pt.y);
    pt.free();
    return [0, [0, x, y]];
  }
}

function affineToRust<A extends WasmAffine>(
  pt: OrInfinity,
  klass: MakeAffine<A>
) {
  var res = klass();
  if (pt === 0) {
    res.infinity = true;
  } else {
    res.x = fieldToRust(pt[1][1]);
    res.y = fieldToRust(pt[1][2]);
  }
  return res;
}

// polycomm

function polyCommFromRust(
  polyComm: WasmPolyComm,
  klass: WrapperClass<WasmAffine>,
  shouldFree: boolean
): PolyComm {
  let rustShifted = polyComm.shifted;
  let rustUnshifted = polyComm.unshifted;
  let mlShifted: MlOption<OrInfinity> =
    rustShifted === undefined ? 0 : [0, affineFromRust(rustShifted)];
  let mlUnshifted = mlArrayFromRustVector(
    rustUnshifted,
    klass,
    affineFromRust,
    shouldFree
  );
  return [0, mlUnshifted, mlShifted];
}

function polyCommToRust(
  [, camlUnshifted, camlShifted]: PolyComm,
  PolyComm: WasmPolyCommClass,
  makeAffine: MakeAffine<WasmAffine>
): WasmPolyComm {
  let rustShifted =
    camlShifted === 0 ? undefined : affineToRust(camlShifted[1], makeAffine);
  let rustUnshifted = mlArrayToRustVector(
    camlUnshifted,
    affineToRust,
    makeAffine
  );
  return new PolyComm(rustUnshifted, rustShifted);
}

// generic rust helpers

type Freeable = { free(): void };
type WrappedPointer = Freeable & { ptr: number };
type WrapperClass<T extends Freeable> = {
  __wrap(i: number): T;
};

const registry = new FinalizationRegistry((ptr: WrappedPointer) => {
  ptr.free();
});

function mlArrayFromRustVector<TRust extends Freeable, TMl>(
  rustVector: Uint32Array,
  klass: WrapperClass<TRust>,
  convert: (c: TRust) => TMl,
  shouldFree: boolean
): MlArray<TMl> {
  var n = rustVector.length;
  var array: TMl[] = new Array(n);
  for (let i = 0; i < n; i++) {
    var rustValue = klass.__wrap(rustVector[i]);
    array[i] = convert(rustValue);
    if (shouldFree) rustValue.free();
  }
  return [0, ...array];
}

// TODO get rid of excessive indirection here

function mlArrayToRustVector<TRust extends WrappedPointer, TMl>(
  [, ...array]: MlArray<TMl>,
  convert: (c: TMl, makeNew: () => TRust) => TRust,
  makeNew: () => TRust
): Uint32Array {
  let n = array.length;
  let rustVector = new Uint32Array(n);
  for (var i = 0, l = array.length; i < l; i++) {
    var rustValue = convert(array[i], makeNew);
    // Beware: caller may need to do finalizer things to avoid these
    // pointers disappearing out from under us.
    rustVector[i] = rustValue.ptr;
    // Don't free when GC runs; rust will free on its end.
    registry.unregister(rustValue);
  }
  return rustVector;
}
