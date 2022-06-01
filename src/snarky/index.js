import { getSnarky, snarky_ready, shutdown } from './wrapper';
import snarkySpec from './snarky-class-spec.json';
import { proxyClasses } from './proxy.js';

export {
  Field,
  Bool,
  Circuit,
  Poseidon,
  Group,
  Scalar,
  Ledger,
  shutdown,
  isReady,
  Pickles,
};
export * as Types from './gen/parties';
export { jsLayout } from './gen/js-layout';

let isReadyBoolean = false;
let isReady = snarky_ready.then(() => (isReadyBoolean = true));
let isItReady = () => isReadyBoolean;

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger, Pickles } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
