import { getSnarky, snarky_ready, shutdown } from './wrapper';
import snarkySpec from './snarky-class-spec.json';
import { proxyClasses, proxyFunctions } from './proxy.js';

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
  picklesCompile,
};

let isReadyBoolean = false;
let isReady = snarky_ready.then(() => (isReadyBoolean = true));
let isItReady = () => isReadyBoolean;

let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger } = proxyClasses(
  getSnarky,
  isItReady,
  snarkySpec
);

let { picklesCompile } = proxyFunctions(getSnarky, isItReady, [
  'picklesCompile',
]);
