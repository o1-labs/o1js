import { ProvableType } from './provable-intf.js';
import { witness } from './witness.js';
export { emptyWitness };
function emptyWitness(type) {
    return witness(type, () => ProvableType.synthesize(type));
}
