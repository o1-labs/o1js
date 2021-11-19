import { initSnarkyJS } from './chrome_bindings/plonk_init.js';
export { Field, Bool, Circuit, Poseidon, Group, Scalar };

// for compat with node version
export { shutdown, snarkyReady, isSnarkyReady };
let shutdown = () => {};
let snarkyReady = Promise.resolve();
let isSnarkyReady = true;

// we should probably not do this
await initSnarkyJS();

let { Field, Bool, Circuit, Poseidon, Group, Scalar } = window.__snarky;
