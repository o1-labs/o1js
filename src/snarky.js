import { initSnarkyJS } from './chrome_bindings/plonk_init.js';

export { Field, Bool, Circuit, Poseidon, Group, Scalar, snarkyReady };
let Field, Bool, Circuit, Poseidon, Group, Scalar;

let snarkyReady = initSnarkyJS().then(() => {
  Field = window.__snarky.Field;
  Bool = window.__snarky.Bool;
  Circuit = window.__snarky.Circuit;
  Poseidon = window.__snarky.Poseidon;
  Group = window.__snarky.Group;
  Scalar = window.__snarky.Scalar;
});
