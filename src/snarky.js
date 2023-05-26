import { getSnarky, withThreadPool } from './bindings/js/wrapper.js';
import snarkySpec from './bindings/js/snarky-class-spec.js';
import { proxyClasses } from './bindings/js/proxy.js';

export {
  Field,
  Bool,
  Snarky,
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

let { Field, Bool, Snarky, Poseidon, Group, Scalar, Ledger, Pickles, Test } =
  proxyClasses(getSnarky, isItReady, snarkySpec);
