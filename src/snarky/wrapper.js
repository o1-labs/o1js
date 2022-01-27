import { initSnarkyJS } from '../chrome_bindings/plonk_init.js';

export { getSnarky, snarky_ready, shutdown };

let getSnarky = () => window.__snarky;
let snarky_ready = initSnarkyJS();
let shutdown = () => {};
