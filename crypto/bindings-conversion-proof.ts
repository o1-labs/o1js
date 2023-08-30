import type {
  LookupEvaluations,
  PointEvaluations,
  ProofEvaluations,
} from './bindings-kimchi-types.js';
import { mapMlTuple } from './bindings-util.js';
import { MlArray, MlOption } from '../../lib/ml/base.js';
import { fieldToRust, fieldFromRust } from './bindings-conversion-base.js';

export { proofEvaluationsToRust, proofEvaluationsFromRust };

const proofEvaluationsToRust = mapProofEvaluations(fieldToRust);
const proofEvaluationsFromRust = mapProofEvaluations(fieldFromRust);

function mapProofEvaluations<Field1, Field2>(map: (x: Field1) => Field2) {
  const mapPointEvals = (
    evals: PointEvaluations<Field1>
  ): PointEvaluations<Field2> => {
    let [, zeta, zeta_omega] = evals;
    return [0, MlArray.map(zeta, map), MlArray.map(zeta_omega, map)];
  };

  const mapLookupEvals = (
    evals: LookupEvaluations<Field1>
  ): LookupEvaluations<Field2> => {
    let [, sorted, aggreg, table, runtime] = evals;
    return [
      0,
      MlArray.map(sorted, mapPointEvals),
      mapPointEvals(aggreg),
      mapPointEvals(table),
      MlOption.map(runtime, mapPointEvals),
    ];
  };

  return function mapProofEvaluations(
    evals: ProofEvaluations<Field1>
  ): ProofEvaluations<Field2> {
    let [, w, z, s, coeffs, lookup, genericSelector, poseidonSelector] = evals;
    return [
      0,
      mapMlTuple(w, mapPointEvals),
      mapPointEvals(z),
      mapMlTuple(s, mapPointEvals),
      mapMlTuple(coeffs, mapPointEvals),
      MlOption.map(lookup, mapLookupEvals),
      mapPointEvals(genericSelector),
      mapPointEvals(poseidonSelector),
    ];
  };
}
