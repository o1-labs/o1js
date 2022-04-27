// Toy implementation of Pickles in JS
import { Bool, Field, Group, Scalar } from '../../snarky';
import { hashMeOnly, verifyOne } from './stepverifier';
import {
  CompiledBasic,
  DeferredValuesPlonk,
  ForStep,
  PerProofWitness,
  PlonkVerificationEvals,
  StepStatement,
  typesMap,
  UnfinalizedProof,
} from './types';

function compile(choices: Rule[]) {
  // TODO: figure out evaluation domain (powers of unity)
}

type Rule = {
  main: Function;
  label: string;
};

// return a witness for a type. TODO replace this with something real, like Circuit.witness
function exists<T>(): T {
  return {} as never;
}
type Tag = {
  id: string;
  kind: string;
};
type InductiveRule = {
  prevs: Tag[];
  main: (prevStatements: unknown, statement: unknown) => Bool[];
};

// step_main
// a single circuit (created from a main function)
function stepMain<A>({
  rule,
  basic,
  selfBranches,
  branching,
  maxBranching,
  self, // don't override JS keyword self
}: {
  rule: InductiveRule;
  basic: CompiledBasic<A>;
  selfBranches: number;
  branching: number;
  maxBranching: number;
  self: Tag;
}) {
  if (rule.prevs.length !== branching) throw Error('Assertion failed');

  return function main(stmt: StepStatement) {
    // TODO: implement witness creation. need to implement AsFields for every type
    let dlogPlonkIndex = exists<PlonkVerificationEvals<Group>>();
    let appState = exists<A>();
    let prevs = exists<PerProofWitness<A>[]>();
    let prevStatements = prevs.map((prev) => prev[0]);
    // create bulletproof challenges
    let bulletproofChallenges: Field[][] = [];
    {
      let verifieds: Bool[] = [];
      let passThroughs = stmt.passThrough.slice(branching); // OK??
      // this is where we execute the user function!
      let proofsShouldVerify = rule.main(prevStatements, appState);
      let unfinalizedProofs =
        stmt.proofState.unfinalizedProofs.slice(branching);
      let selfData: ForStep<A> = {
        branchings: basic.branchings.map((int) => Field(int)),
        branches: selfBranches,
        maxBranching,
        maxWidth: undefined,
        typ: 'TODO',
        valueToFieldElements: basic.valueToFieldElements,
        wrapDomains: basic.wrapDomains,
        stepDomains: ['known', basic.stepDomains],
        wrapKey: dlogPlonkIndex,
      };
      let datas = rule.prevs.map((tag) => {
        if (self.id === tag.id) return selfData;
        if (tag.kind === 'compiled') {
          return typesMap.forStep.ofCompiled(typesMap.lookupCompiled(tag.id));
        }
        if (tag.kind === 'sideLoaded') {
          throw 'TODO';
          return typesMap.forStep.ofCompiled(typesMap.lookupSideLoaded(tag.id));
        }
      });
      for (let i = 0; i < branching; i++) {
        let [challenges, verified] = verifyOne({
          proof: prevs[i],
          data: datas[i],
          passThrough: passThroughs[i],
          unfinalizedProof: unfinalizedProofs[i],
          shouldVerify: proofsShouldVerify[i],
        });
        bulletproofChallenges.push(challenges);
        verifieds.push(verified);
      }
      verifieds.reduce(Bool.and).assertEquals(true);
    }
    let sgs = prevs.map(([, , , , , [opening]]) => opening.sg);
    let hash = hashMeOnly(dlogPlonkIndex, basic.valueToFieldElements);
    hash({
      appState,
      dlogPlonkIndex,
      sg: sgs,
      oldBulletproofChallenges: bulletproofChallenges,
    }).assertEquals(stmt.proofState.meOnly);
  };
}
