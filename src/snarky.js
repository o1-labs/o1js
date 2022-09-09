import { getSnarky, snarky_ready, shutdown } from './snarky/wrapper.js';
import snarkySpec from './snarky/snarky-class-spec.js';
import { proxyClasses } from './snarky/proxy.js';

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
let isReadyBoolean = false;
let isReady = snarky_ready.then(() => (isReadyBoolean = true));
let isItReady = () => isReadyBoolean;

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger, Pickles } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
