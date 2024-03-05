import { Snarky } from '../../snarky.js';
import { FieldConst, type VarFieldVar } from '../field.js';
import { MlArray, MlOption } from '../ml/base.js';

export { existsAsync };

async function existsAsync(
  size: number,
  compute: (() => Promise<bigint[]>) | (() => bigint[])
): Promise<VarFieldVar[]> {
  // enter prover block
  let finish = Snarky.run.enterAsProver(size);

  if (!Snarky.run.inProver()) {
    return MlArray.from(finish(MlOption()));
  }

  // TODO would be nice to be able to step outside the as_prover block
  // with a try-catch if the callback throws an error

  // run the async callback to get values to witness
  let values = await compute();
  if (values.length !== size)
    throw Error(
      `Expected witnessed values of length ${size}, got ${values.length}.`
    );

  let inputValues = MlArray.mapTo(values, FieldConst.fromBigint);
  let vars = finish(MlOption(inputValues));
  return MlArray.from(vars);
}
