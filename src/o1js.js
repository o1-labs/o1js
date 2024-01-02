import './bindings/crypto/bindings.js';
import { getSnarky, getWasm, withThreadPool } from './bindings/js/wrapper.js';
import snarkySpec from './bindings/js/snarky-class-spec.js';
import { proxyClasses } from './bindings/js/proxy.js';

export { Snarky, Ledger, Pickles, Test, withThreadPool, getWasm };
let isReadyBoolean = true;
let isItReady = () => isReadyBoolean;

let { Snarky, Ledger, Pickles, Test } = proxyClasses(
  getSnarky,
  isItReady,
  snarkySpec
);
