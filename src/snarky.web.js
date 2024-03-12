import './bindings/crypto/bindings.js';
import { initO1, withThreadPool } from './bindings/js/web/web-backend.js';

await initO1();

let snarky = globalThis.__snarky;
let wasm = globalThis.plonk_wasm;

let { Snarky, Ledger, Pickles, Test } = snarky;

export { Snarky, Ledger, Pickles, Test, withThreadPool, wasm };
