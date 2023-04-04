import { getSnarky, withThreadPool } from './snarkyjs-bindings/js/wrapper.js';
import snarkySpec from './snarkyjs-bindings/js/snarky-class-spec.js';
import { proxyClasses } from './snarkyjs-bindings/js/proxy.js';

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

function shutdown() {}

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger, Pickles, Test } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
