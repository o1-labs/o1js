import { getSnarky, withThreadPool } from './bindings/js/wrapper.js';
import snarkySpec from './bindings/js/snarky-class-spec.js';
import { proxyClasses } from './bindings/js/proxy.js';

export { Snarky, Ledger, Pickles, Test, Rollup, withThreadPool };
let isReadyBoolean = true;
let isItReady = () => isReadyBoolean;

let { Snarky, Ledger, Pickles, Test, Rollup } = proxyClasses(
  getSnarky,
  isItReady,
  snarkySpec
);
