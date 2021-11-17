import { initSnarkyJS } from './chrome_bindings/plonk_init.js';
export { Field, Bool, Circuit, Poseidon, Group, Scalar };

await initSnarkyJS();
let { Field, Bool, Circuit, Poseidon, Group, Scalar } = window.__snarky;
