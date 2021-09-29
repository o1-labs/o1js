import init, * as plonk_wasm from './plonk_wasm.js';
await init();
await plonk_wasm.initThreadPool(navigator.hardwareConcurrency);
postMessage({ type: 'wasm_bindgen_rayon_threads_ready' });
