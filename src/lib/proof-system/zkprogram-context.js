import { Context } from '../util/global-context.js';
export { ZkProgramContext };
let context = Context.create();
const ZkProgramContext = {
    enter() {
        return context.enter({ proofs: [] });
    },
    leave: context.leave,
    has: context.has,
    declareProof(proof) {
        context.get().proofs.push(proof);
    },
    getDeclaredProofs() {
        return context.get().proofs;
    },
};
