import { getSnarky, snarkyReady, shutdown } from './snarky/wrapper.js';
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
  Test,
};
let isReadyBoolean = false;
let isReady = snarkyReady.then(() => (isReadyBoolean = true));
let isItReady = () => isReadyBoolean;

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger, Pickles, Test } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
