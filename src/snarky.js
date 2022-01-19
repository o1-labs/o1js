import { proxyClasses } from 'proxyClasses.js';
import { initSnarkyJS } from './chrome_bindings/plonk_init.js';
import snarkySpec from './snarky-class-spec.json';
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
};

let isReadyBoolean = false;
let isReady = initSnarkyJS().then(() => {
  isReadyBoolean = true;
});

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger } = proxyClasses(
  () => window.__snarky,
  snarkySpec,
  () => isReadyBoolean
);

// for compat with node version
let shutdown = () => {};
