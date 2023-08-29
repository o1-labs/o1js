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

type WasmClasses = {
  CommitmentCurve: typeof WasmGVesta | typeof WasmGPallas;
  makeAffine: () => WasmAffine;
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
    makeAffine,
    Gate,
    PolyComm,
    Domain,
    VerificationEvals,
    Shifts,
    VerifierIndex,
  }: WasmClasses) {
    let self = {
      vectorToRust: fieldsToRustFlat,
      vectorFromRust: fieldsFromRustFlat,

      gateToRust(gate: Gate) {
        let [, typ, [, ...wires], coeffs] = gate;
        let rustWires = new wasm.WasmGateWires(...mapTuple(wires, wireToRust));
        let rustCoeffs = fieldsToRustFlat(coeffs);
        return new Gate(typ, rustWires, rustCoeffs);
      },

      pointToRust(point: OrInfinity) {
        return affineToRust(point, makeAffine);
      },
      pointFromRust: affineFromRust,

      pointsToRust([, ...points]: MlArray<OrInfinity>) {
        return mapToUint32Array(points, (point) => {
          let rustValue = self.pointToRust(point);
          // Don't free when GC runs; rust will free on its end.
          registry.unregister(rustValue);
          return unwrap(rustValue);
        });
      },
      pointsFromRust(points: Uint32Array) {
        let arr = mapFromUintArray(points, (ptr) => {
          return affineFromRust(wrap(ptr, CommitmentCurve));
        });
        return [0, ...arr];
      },

      polyCommToRust(polyComm: PolyComm): WasmPolyComm {
        let [, camlUnshifted, camlShifted] = polyComm;
        let rustShifted =
          camlShifted === 0
            ? undefined
            : affineToRust(camlShifted[1], makeAffine);
        let rustUnshifted = self.pointsToRust(camlUnshifted);
        return new PolyComm(rustUnshifted, rustShifted);
      },
      polyCommFromRust(polyComm: WasmPolyComm): PolyComm {
        let rustShifted = polyComm.shifted;
        let rustUnshifted = polyComm.unshifted;
        let mlShifted: MlOption<OrInfinity> =
          rustShifted === undefined ? 0 : [0, affineFromRust(rustShifted)];
        let mlUnshifted = mapFromUintArray(rustUnshifted, (ptr) => {
          return affineFromRust(wrap(ptr, CommitmentCurve));
        });
        return [0, [0, ...mlUnshifted], mlShifted];
      },

      polyCommsToRust([, ...comms]: MlArray<PolyComm>): Uint32Array {
        return mapToUint32Array(comms, (c) => unwrap(self.polyCommToRust(c)));
      },
      polyCommsFromRust(rustComms: Uint32Array): MlArray<PolyComm> {
        let comms = mapFromUintArray(rustComms, (ptr) =>
          self.polyCommFromRust(wrap(ptr, PolyComm))
        );
        return [0, ...comms];
      },

      shiftsToRust([, ...shifts]: MlArray<Field>): WasmShifts {
        let s = shifts.map(fieldToRust);
        return new Shifts(s[0], s[1], s[2], s[3], s[4], s[5], s[6]);
      },
      shiftsFromRust(s: WasmShifts): MlArray<Field> {
        let shifts = [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6];
        s.free();
        return [0, ...shifts.map(fieldFromRust)];
      },

      verifierIndexToRust(vk: VerifierIndex): WasmVerifierIndex {
        let domain = domainToRust(vk[1]);
        let maxPolySize = vk[2];
        let nPublic = vk[3];
        let prevChallenges = vk[4];
        let srs = vk[5];
        let evals = verificationEvalsToRust(vk[6]);
        let shifts = self.shiftsToRust(vk[7]);
        return new VerifierIndex(
          domain,
          maxPolySize,
          nPublic,
          prevChallenges,
          srs,
          evals,
          shifts
        );
      },
      verifierIndexFromRust(vk: WasmVerifierIndex): VerifierIndex {
        let lookupIndex = 0 as 0; // None
        let mlVk: VerifierIndex = [
          0,
          domainFromRust(vk.domain),
          vk.max_poly_size,
          vk.public_,
          vk.prev_challenges,
          vk.srs,
          verificationEvalsFromRust(vk.evals),
          self.shiftsFromRust(vk.shifts),
          lookupIndex,
        ];
        vk.free();
        return mlVk;
      },
    };

    function domainToRust([, logSizeOfGroup, groupGen]: Domain): WasmDomain {
      return new Domain(logSizeOfGroup, fieldToRust(groupGen));
    }
    function domainFromRust(domain: WasmDomain): Domain {
      let logSizeOfGroup = domain.log_size_of_group;
      let groupGen = fieldFromRust(domain.group_gen);
      domain.free();
      return [0, logSizeOfGroup, groupGen];
    }

    function verificationEvalsToRust(
      evals: VerificationEvals
    ): WasmVerificationEvals {
      let sigmaComm = self.polyCommsToRust(evals[1]);
      let coefficientsComm = self.polyCommsToRust(evals[2]);
      let genericComm = self.polyCommToRust(evals[3]);
      let psmComm = self.polyCommToRust(evals[4]);
      let completeAddComm = self.polyCommToRust(evals[5]);
      let mulComm = self.polyCommToRust(evals[6]);
      let emulComm = self.polyCommToRust(evals[7]);
      let endomulScalarComm = self.polyCommToRust(evals[8]);
      return new VerificationEvals(
        sigmaComm,
        coefficientsComm,
        genericComm,
        psmComm,
        completeAddComm,
        mulComm,
        emulComm,
        endomulScalarComm
      );
    }
    function verificationEvalsFromRust(
      evals: WasmVerificationEvals
    ): VerificationEvals {
      let mlEvals: VerificationEvals = [
        0,
        self.polyCommsFromRust(evals.sigma_comm),
        self.polyCommsFromRust(evals.coefficients_comm),
        self.polyCommFromRust(evals.generic_comm),
        self.polyCommFromRust(evals.psm_comm),
        self.polyCommFromRust(evals.complete_add_comm),
        self.polyCommFromRust(evals.mul_comm),
        self.polyCommFromRust(evals.emul_comm),
        self.polyCommFromRust(evals.endomul_scalar_comm),
      ];
      evals.free();
      return mlEvals;
    }
    return self;
  }

  const fp = perField({
    CommitmentCurve: wasm.WasmGVesta,
    makeAffine: wasm.caml_vesta_affine_one,
    Gate: wasm.WasmFpGate,
    PolyComm: wasm.WasmFpPolyComm,
    Domain: wasm.WasmFpDomain,
    VerificationEvals: wasm.WasmFpPlonkVerificationEvals,
    Shifts: wasm.WasmFpShifts,
    VerifierIndex: wasm.WasmFpPlonkVerifierIndex,
  });
  const fq = perField({
    CommitmentCurve: wasm.WasmGPallas,
    makeAffine: wasm.caml_pallas_affine_one,
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
  makeAffine: () => A
) {
  var res = makeAffine();
  if (pt === 0) {
    res.infinity = true;
  } else {
    res.x = fieldToRust(pt[1][1]);
    res.y = fieldToRust(pt[1][2]);
  }
  return res;
}

// generic rust helpers

type Freeable = { free(): void };
type Constructor<T> = new (...args: any[]) => T;

function wrap<T>(ptr: number, Class: Constructor<T>): T {
  const obj = Object.create(Class.prototype);
  obj.ptr = ptr;
  return obj;
}
function unwrap<T extends {}>(obj: T): number {
  // Beware: caller may need to do finalizer things to avoid these
  // pointers disappearing out from under us.
  let ptr = (obj as any).ptr;
  if (ptr === undefined) throw Error('unwrap: missing ptr');
  return ptr;
}

const registry = new FinalizationRegistry((ptr: Freeable) => {
  ptr.free();
});

function mapFromUintArray<T>(
  array: Uint32Array | Uint8Array,
  map: (i: number) => T
) {
  let n = array.length;
  let result: T[] = Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = map(array[i]);
  }
  return result;
}

function mapToUint32Array<T>(array: T[], map: (t: T) => number) {
  let n = array.length;
  let result = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = map(array[i]);
  }
  return result;
}
