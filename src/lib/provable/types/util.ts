import { ProvableType } from './provable-intf.js';
import { witness } from './witness.js';

export { emptyWitness };

function emptyWitness<T>(type: ProvableType<T>) {
  return witness(type, () => ProvableType.synthesize(type));
}
