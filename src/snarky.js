import { initSnarkyJS } from './chrome_bindings/plonk_init.js';
export { Field, Bool, Circuit, Poseidon, Group, Scalar };

// for compat with node version
export { shutdown, isReady };
let shutdown = () => {};
let isReady = Promise.resolve();

// we should probably not do this
await initSnarkyJS();

let { Field, Bool, Circuit, Poseidon, Group, Scalar } = window.__snarky;
