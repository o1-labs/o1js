import { Snarky } from '../snarky.js';
import type { FieldVar } from './field.js';

const SnarkyState = Snarky.run.state;

async function existsAsync(
  size: number,
  compute: () => Promise<bigint[]>
): Promise<FieldVar[]> {
  let state = SnarkyState.state[1];

  if (SnarkyState.hasWitness(state)) {
    // TODO
  } else {
    return Array.from({ length: size }, () => SnarkyState.allocVar(state));
  }
}
