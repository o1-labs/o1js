import { getSnarky, shutdown, initThreadPool } from './snarky/wrapper.js';
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
  initThreadPool,
};
let isReady = Promise.resolve();
let isItReady = () => true;

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger, Pickles, Test } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
