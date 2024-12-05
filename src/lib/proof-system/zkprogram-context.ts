import { Context } from '../util/global-context.js';
import type { Subclass } from '../util/types.js';
import type { ProofBase } from './proof.js';

export { ZkProgramContext, DeclaredProof };

type DeclaredProof = {
  ProofClass: Subclass<typeof ProofBase<any, any>>;
  proofInstance: ProofBase<any, any>;
};
type ZkProgramContext = {
  proofs: DeclaredProof[];
};
let context = Context.create<ZkProgramContext>();

const ZkProgramContext = {
  enter() {
    return context.enter({ proofs: [] });
  },
  leave: context.leave,
  has: context.has,

  declareProof(proof: DeclaredProof) {
    context.get().proofs.push(proof);
  },
  getDeclaredProofs() {
    return context.get().proofs;
  },
};
