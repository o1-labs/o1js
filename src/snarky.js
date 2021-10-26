import {Field, Bool, Circuit, Poseidon, Group, Scalar} from 'snarky.bindings.js'
export {Field, Bool, Circuit, Poseidon, Group, Scalar}

export const shutdown = () => {
  if (global.wasm_rayon_poolbuilder) {
    global.wasm_rayon_poolbuilder.free();
    return Promise.all(
      global.wasm_workers.map(async (worker) => {
        await worker.terminate();
      })
    );
  }
};