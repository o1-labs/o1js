import { MlArray, MlOption, MlTuple } from '../../../lib/ml/base.js';
import { fieldFromRust, fieldToRust } from './conversion-base.js';
import type { Field, PointEvaluations, ProofEvaluations } from './kimchi-types.js';

export {
  fieldToRust_,
  proofEvaluationsToRust,
  proofEvaluationsFromRust,
  pointEvalsOptionToRust,
  pointEvalsOptionFromRust,
  createMapPointEvals,
  mapPointEvalsOption,
  mapProofEvaluations,
};

const fieldToRust_ = (x: Field) => fieldToRust(x);
const proofEvaluationsToRust = mapProofEvaluations(fieldToRust_);
const proofEvaluationsFromRust = mapProofEvaluations(fieldFromRust);
const pointEvalsOptionToRust = mapPointEvalsOption(fieldToRust_);
const pointEvalsOptionFromRust = mapPointEvalsOption(fieldFromRust);

function createMapPointEvals<Field1, Field2>(map: (x: Field1) => Field2) {
  return (evals: PointEvaluations<Field1>): PointEvaluations<Field2> => {
    let [, zeta, zeta_omega] = evals;
    return [0, MlArray.map(zeta, map), MlArray.map(zeta_omega, map)];
  };
}

function mapPointEvalsOption<Field1, Field2>(map: (x: Field1) => Field2) {
  return (evals: MlOption<PointEvaluations<Field1>>) =>
    MlOption.map(evals, createMapPointEvals(map));
}

function mapProofEvaluations<Field1, Field2>(map: (x: Field1) => Field2) {
  const mapPointEvals = createMapPointEvals(map);

  const mapPointEvalsOption = (
    evals: MlOption<PointEvaluations<Field1>>
  ): MlOption<PointEvaluations<Field2>> => MlOption.map(evals, mapPointEvals);

  return function mapProofEvaluations(evals: ProofEvaluations<Field1>): ProofEvaluations<Field2> {
    let [
      ,
      w,
      z,
      s,
      coeffs,
      genericSelector,
      poseidonSelector,
      completeAddSelector,
      mulSelector,
      emulSelector,
      endomulScalarSelector,
      rangeCheck0Selector,
      rangeCheck1Selector,
      foreignFieldAddSelector,
      foreignFieldMulSelector,
      xorSelector,
      rotSelector,
      lookupAggregation,
      lookupTable,
      lookupSorted,
      runtimeLookupTable,
      runtimeLookupTableSelector,
      xorLookupSelector,
      lookupGateLookupSelector,
      rangeCheckLookupSelector,
      foreignFieldMulLookupSelector,
    ] = evals;
    return [
      0,
      MlTuple.map(w, mapPointEvals),
      mapPointEvals(z),
      MlTuple.map(s, mapPointEvals),
      MlTuple.map(coeffs, mapPointEvals),
      mapPointEvals(genericSelector),
      mapPointEvals(poseidonSelector),
      mapPointEvals(completeAddSelector),
      mapPointEvals(mulSelector),
      mapPointEvals(emulSelector),
      mapPointEvals(endomulScalarSelector),
      mapPointEvalsOption(rangeCheck0Selector),
      mapPointEvalsOption(rangeCheck1Selector),
      mapPointEvalsOption(foreignFieldAddSelector),
      mapPointEvalsOption(foreignFieldMulSelector),
      mapPointEvalsOption(xorSelector),
      mapPointEvalsOption(rotSelector),
      mapPointEvalsOption(lookupAggregation),
      mapPointEvalsOption(lookupTable),
      MlArray.map(lookupSorted, mapPointEvalsOption),
      mapPointEvalsOption(runtimeLookupTable),
      mapPointEvalsOption(runtimeLookupTableSelector),
      mapPointEvalsOption(xorLookupSelector),
      mapPointEvalsOption(lookupGateLookupSelector),
      mapPointEvalsOption(rangeCheckLookupSelector),
      mapPointEvalsOption(foreignFieldMulLookupSelector),
    ];
  };
}
