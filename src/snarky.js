import { getSnarky, shutdown, withThreadPool } from './snarky/wrapper.js';
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
  withThreadPool,
};
let isReadyBoolean = true;
let isReady = Promise.resolve();
let isItReady = () => isReadyBoolean;

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger, Pickles, Test } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
