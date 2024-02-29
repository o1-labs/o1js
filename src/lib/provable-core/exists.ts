import { Snarky } from '../../snarky.js';
import { FieldConst, FieldVar } from '../field.js';
import { MlBool } from '../ml/base.js';

export { existsAsync };

const SnarkyState = Snarky.run.state;

async function existsAsync(
  size: number,
  compute: (() => Promise<bigint[]>) | (() => bigint[])
): Promise<FieldVar[]> {
  let state = SnarkyState.state[1];

  if (SnarkyState.hasWitness(state)) {
    let oldAsProver = SnarkyState.asProver(state);
    SnarkyState.setAsProver(state, MlBool(true));

    try {
      // run the async callback to get values to witness
      let values = await compute();
      if (values.length !== size)
        throw Error(
          `Expected witnessed values of length ${size}, got ${values.length}.`
        );

      // if we're nested in a prover block, return constants instead of storing
      if (oldAsProver) return values.map(FieldVar.constant);

      // store the values as witnesses and return them
      return values.map((x) =>
        SnarkyState.storeFieldElt(state, FieldConst.fromBigint(x))
      );
    } finally {
      SnarkyState.setAsProver(state, oldAsProver);
    }
  } else {
    // if we're in compile mode (no witness), just allocate "empty" variables
    return Array.from({ length: size }, () => SnarkyState.allocVar(state));
  }
}
