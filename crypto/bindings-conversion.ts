/**
 * Implementation of Kimchi_bindings.Protocol.Gates
 */
import { MlArray, MlOption } from '../../lib/ml/base.js';
import { MlTupleN, mapTuple } from './bindings-util.js';
import { Field } from './bindings-field.js';
import type {
  WasmFpDomain,
  WasmFpGate,
  WasmFpOpeningProof,
  WasmFpOracles,
  WasmFpPlonkVerificationEvals,
  WasmFpPlonkVerifierIndex,
  WasmFpPolyComm,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFpRandomOracles,
  WasmFpShifts,
  WasmFpSrs,
  WasmFqDomain,
  WasmFqGate,
  WasmFqOpeningProof,
  WasmFqOracles,
  WasmFqPlonkVerificationEvals,
  WasmFqPlonkVerifierIndex,
  WasmFqPolyComm,
  WasmFqProverCommitments,
  WasmFqProverProof,
  WasmFqRandomOracles,
  WasmFqShifts,
  WasmFqSrs,
  WasmGPallas,
  WasmGVesta,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import { bigIntToBytes, bytesToBigInt } from './bigint-helpers.js';
import { OrInfinity } from './bindings-curve.js';
import { Lookup } from './bindings-lookup.js';

export { createRustConversion };

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

type ScalarChallenge = [_: 0, inner: Field];
type RandomOracles = [
  _: 0,
  joint_combiner: MlOption<[0, ScalarChallenge, Field]>,
  beta: Field,
  gamma: Field,
  alpha_chal: ScalarChallenge,
  alpha: Field,
  zeta: Field,
  v: Field,
  u: Field,
  zeta_chal: ScalarChallenge,
  v_chal: ScalarChallenge,
  u_chal: ScalarChallenge
];
type Oracles = [
  _: 0,
  o: RandomOracles,
  p_eval: [0, Field, Field],
  opening_prechallenges: MlArray<Field>,
  digest_before_evaluations: Field
];

type LookupCommitments = [
  _: 0,
  sorted: MlArray<PolyComm>,
  aggreg: PolyComm,
  runtime: MlOption<PolyComm>
];
type ProverCommitments = [
  _: 0,
  w_comm: MlTupleN<PolyComm, 15>,
  z_comm: PolyComm,
  t_comm: PolyComm,
  lookup: LookupCommitments
];
type OpeningProof = [
  _: 0,
  lr: MlArray<[0, OrInfinity, OrInfinity]>,
  delta: OrInfinity,
  z1: Field,
  z2: Field,
  sg: OrInfinity
];
type PointEvaluations = [
  _: 0,
  zeta: MlArray<Field>,
  zeta_omega: MlArray<Field>
];
type LookupEvaluations = [
  _: 0,
  sorted: MlArray<PointEvaluations>,
  aggreg: PointEvaluations,
  table: PointEvaluations,
  runtime: MlOption<PointEvaluations>
];
type ProofEvaluations = [
  _: 0,
  w: MlTupleN<PointEvaluations, 16>,
  z: PointEvaluations,
  s: MlTupleN<PointEvaluations, 6>,
  coefficients: MlTupleN<PointEvaluations, 15>,
  lookup: MlOption<LookupEvaluations>,
  generic_selector: PointEvaluations,
  poseidon_selector: PointEvaluations
];
type RecursionChallenge = [_: 0, chals: MlArray<Field>, comm: PolyComm];

type ProverProof = [
  _: 0,
  commitments: ProverCommitments,
  proof: OpeningProof,
  evals: ProofEvaluations,
  ft_eval1: Field,
  public_: MlArray<Field>,
  prev_challenges: MlArray<RecursionChallenge>
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
type WasmRandomOracles = WasmFpRandomOracles | WasmFqRandomOracles;
type WasmOracles = WasmFpOracles | WasmFqOracles;
type WasmProverCommitments = WasmFpProverCommitments | WasmFqProverCommitments;
type WasmOpeningProof = WasmFpOpeningProof | WasmFqOpeningProof;
type WasmVecVec = WasmVecVecFp | WasmVecVecFq;
type WasmProverProof = WasmFpProverProof | WasmFqProverProof;

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
  RandomOracles: typeof WasmFpRandomOracles | typeof WasmFqRandomOracles;
  Oracles: typeof WasmFpOracles | typeof WasmFqOracles;
  ProverCommitments:
    | typeof WasmFpProverCommitments
    | typeof WasmFqProverCommitments;
  OpeningProof: typeof WasmFpOpeningProof | typeof WasmFqOpeningProof;
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  ProverProof: typeof WasmFpProverProof | typeof WasmFqProverProof;
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
    RandomOracles,
    Oracles,
    ProverCommitments,
    OpeningProof,
    VecVec,
    ProverProof,
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

      pointsToRust([, ...points]: MlArray<OrInfinity>): Uint32Array {
        return mapToUint32Array(points, (point) =>
          unwrap(self.pointToRust(point))
        );
      },
      pointsFromRust(points: Uint32Array): MlArray<OrInfinity> {
        let arr = mapFromUintArray(points, (ptr) =>
          affineFromRust(wrap(ptr, CommitmentCurve))
        );
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
        return new Shifts(s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
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
          freeOnFinalize(vk.srs),
          verificationEvalsFromRust(vk.evals),
          self.shiftsFromRust(vk.shifts),
          lookupIndex,
        ];
        vk.free();
        return mlVk;
      },

      oraclesToRust(oracles: Oracles): WasmOracles {
        let [, o, pEval, openingPrechallenges, digestBeforeEvaluations] =
          oracles;
        return new Oracles(
          randomOraclesToRust(o),
          fieldToRust(pEval[1]),
          fieldToRust(pEval[2]),
          fieldsToRustFlat(openingPrechallenges),
          fieldToRust(digestBeforeEvaluations)
        );
      },
      oraclesFromRust(oracles: WasmOracles): Oracles {
        let mlOracles: Oracles = [
          0,
          randomOraclesFromRust(oracles.o),
          [0, fieldFromRust(oracles.p_eval0), fieldFromRust(oracles.p_eval1)],
          fieldsFromRustFlat(oracles.opening_prechallenges),
          fieldFromRust(oracles.digest_before_evaluations),
        ];
        // TODO: do we not want to free?
        // oracles.free();
        return mlOracles;
      },

      proofToRust(proof: ProverProof): WasmProverProof {
        let commitments = commitmentsToRust(proof[1]);
        let openingProof = openingProofToRust(proof[2]);
        // WARNING we're not converting evals atm - not touched in OCaml?
        let evals = proof[3];
        let ftEval1 = fieldToRust(proof[4]);
        let public_ = fieldsToRustFlat(proof[5]);
        let [, ...prevChallenges] = proof[6];
        let n = prevChallenges.length;
        let prevChallengeScalars = new VecVec(n);
        let prevChallengeCommsMl: MlArray<PolyComm> = [0];
        for (let [, scalars, comms] of prevChallenges) {
          prevChallengeScalars.push(fieldsToRustFlat(scalars));
          prevChallengeCommsMl.push(comms);
        }
        let prevChallengeComms = self.polyCommsToRust(prevChallengeCommsMl);
        return new ProverProof(
          commitments,
          openingProof,
          evals,
          ftEval1,
          public_,
          prevChallengeScalars,
          prevChallengeComms
        );
      },
      proofFromRust(proof: WasmProverProof): ProverProof {
        let commitments = commitmentsFromRust(proof.commitments);
        let openingProof = openingProofFromRust(proof.proof);
        // WARNING we're not converting evals atm - not touched in OCaml?
        let evals = proof.evals;
        let ftEval1 = fieldFromRust(proof.ft_eval1);
        let public_ = fieldsFromRustFlat(proof.public_);
        let prevChallengeScalars = proof.prev_challenges_scalars;
        let [, ...prevChallengeComms] = self.polyCommsFromRust(
          proof.prev_challenges_comms
        );
        let prevChallenges = prevChallengeComms.map<RecursionChallenge>(
          (comms, i) => {
            let scalars = fieldsFromRustFlat(prevChallengeScalars.get(i));
            return [0, scalars, comms];
          }
        );
        proof.free();
        return [
          0,
          commitments,
          openingProof,
          evals,
          ftEval1,
          public_,
          [0, ...prevChallenges],
        ];
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

    function randomOraclesToRust(ro: RandomOracles): WasmRandomOracles {
      let jointCombinerMl = MlOption.from(ro[1]);
      let jointCombinerChal = maybeFieldToRust(jointCombinerMl?.[1][1]);
      let jointCombiner = maybeFieldToRust(jointCombinerMl?.[2]);
      let beta = fieldToRust(ro[2]);
      let gamma = fieldToRust(ro[3]);
      let alphaChal = fieldToRust(ro[4][1]);
      let alpha = fieldToRust(ro[5]);
      let zeta = fieldToRust(ro[6]);
      let v = fieldToRust(ro[7]);
      let u = fieldToRust(ro[8]);
      let zetaChal = fieldToRust(ro[9][1]);
      let vChal = fieldToRust(ro[10][1]);
      let uChal = fieldToRust(ro[11][1]);
      return new RandomOracles(
        jointCombinerChal,
        jointCombiner,
        beta,
        gamma,
        alphaChal,
        alpha,
        zeta,
        v,
        u,
        zetaChal,
        vChal,
        uChal
      );
    }
    function randomOraclesFromRust(ro: WasmRandomOracles): RandomOracles {
      let jointCombinerChal = ro.joint_combiner_chal;
      let jointCombiner = ro.joint_combiner;
      let jointCombinerOption = MlOption<[0, ScalarChallenge, Field]>(
        jointCombinerChal &&
          jointCombiner && [
            0,
            [0, fieldFromRust(jointCombinerChal)],
            fieldFromRust(jointCombiner),
          ]
      );
      let mlRo: RandomOracles = [
        0,
        jointCombinerOption,
        fieldFromRust(ro.beta),
        fieldFromRust(ro.gamma),
        [0, fieldFromRust(ro.alpha_chal)],
        fieldFromRust(ro.alpha),
        fieldFromRust(ro.zeta),
        fieldFromRust(ro.v),
        fieldFromRust(ro.u),
        [0, fieldFromRust(ro.zeta_chal)],
        [0, fieldFromRust(ro.v_chal)],
        [0, fieldFromRust(ro.u_chal)],
      ];
      // TODO: do we not want to free?
      // ro.free();
      return mlRo;
    }

    function commitmentsToRust(
      commitments: ProverCommitments
    ): WasmProverCommitments {
      let wComm = self.polyCommsToRust(commitments[1]);
      let zComm = self.polyCommToRust(commitments[2]);
      let tComm = self.polyCommToRust(commitments[3]);
      // TODO lookup
      return new ProverCommitments(wComm, zComm, tComm);
    }
    function commitmentsFromRust(
      commitments: WasmProverCommitments
    ): ProverCommitments {
      let wComm = self.polyCommsFromRust(commitments.w_comm);
      let zComm = self.polyCommFromRust(commitments.z_comm);
      let tComm = self.polyCommFromRust(commitments.t_comm);
      let lookup = 0 as any; // TODO
      commitments.free();
      return [0, wComm as MlTupleN<PolyComm, 15>, zComm, tComm, lookup];
    }

    function openingProofToRust(proof: OpeningProof): WasmOpeningProof {
      let [_, [, ...lr], delta, z1, z2, sg] = proof;
      // We pass l and r as separate vectors over the FFI
      let l: MlArray<OrInfinity> = [0];
      let r: MlArray<OrInfinity> = [0];
      for (let [, li, ri] of lr) {
        l.push(li);
        r.push(ri);
      }
      return new OpeningProof(
        self.pointsToRust(l),
        self.pointsToRust(r),
        self.pointToRust(delta),
        fieldToRust(z1),
        fieldToRust(z2),
        self.pointToRust(sg)
      );
    }
    function openingProofFromRust(proof: WasmOpeningProof): OpeningProof {
      let [, ...l] = self.pointsFromRust(proof.lr_0);
      let [, ...r] = self.pointsFromRust(proof.lr_1);
      let n = l.length;
      if (n !== r.length)
        throw Error('openingProofFromRust: l and r length mismatch.');
      let lr = l.map<[0, OrInfinity, OrInfinity]>((li, i) => [0, li, r[i]]);
      let delta = self.pointFromRust(proof.delta);
      let z1 = fieldFromRust(proof.z1);
      let z2 = fieldFromRust(proof.z2);
      let sg = self.pointFromRust(proof.sg);
      proof.free();
      return [0, [0, ...lr], delta, z1, z2, sg];
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
    RandomOracles: wasm.WasmFpRandomOracles,
    Oracles: wasm.WasmFpOracles,
    ProverCommitments: wasm.WasmFpProverCommitments,
    OpeningProof: wasm.WasmFpOpeningProof,
    VecVec: wasm.WasmVecVecFp,
    ProverProof: wasm.WasmFpProverProof,
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
    RandomOracles: wasm.WasmFqRandomOracles,
    Oracles: wasm.WasmFqOracles,
    ProverCommitments: wasm.WasmFqProverCommitments,
    OpeningProof: wasm.WasmFqOpeningProof,
    VecVec: wasm.WasmVecVecFq,
    ProverProof: wasm.WasmFqProverProof,
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
function fieldToRust([x]: Field): Uint8Array {
  return Uint8Array.from(bigIntToBytes(x, fieldSizeBytes));
}
function fieldFromRust(x: Uint8Array): Field {
  return [bytesToBigInt(x)];
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
  let n = fieldBytes.length / fieldSizeBytes;
  if (!Number.isInteger(n)) {
    throw Error('fieldsFromRustFlat: invalid bytes');
  }
  let fields: Field[] = Array(n);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let fieldView = new Uint8Array(fieldBytes.buffer, offset, fieldSizeBytes);
    fields[i] = fieldFromRust(fieldView);
  }
  return [0, ...fields];
}

function maybeFieldToRust(x?: Field): Uint8Array | undefined {
  return x && fieldToRust(x);
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
  let res = makeAffine();
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
function freeOnFinalize<T extends Freeable>(instance: T) {
  // This is an unfortunate hack: we're creating a second instance of the
  // class to be able to call free on it. We can't pass the value itself,
  // since the registry holds a strong reference to the representative value.
  //
  // However, the class is only really a wrapper around a pointer, with a
  // reference to the class' prototype as its __prototype__.
  //
  // It might seem cleaner to call the destructor here on the pointer
  // directly, but unfortunately the destructor name is some mangled internal
  // string generated by wasm_bindgen. For now, this is the best,
  // least-brittle way to free once the original class instance gets collected.
  let instanceRepresentative = wrap<T>(
    (instance as any).ptr,
    (instance as any).constructor
  );
  registry.register(instance, instanceRepresentative, instance);
  return instance;
}

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
