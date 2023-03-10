import * as wasm from '../node_bindings/plonk_wasm.js';

export {
  WasmModule,
  getWasm,
  getSnarky,
  snarkyReady,
  shutdown,
  initThreadPool,
};

type WasmModule = typeof wasm;

declare function getWasm(): WasmModule;

declare function getSnarky(): any;

declare let snarkyReady: Promise<undefined>;

declare function shutdown(): Promise<undefined>;

declare function initThreadPool(): any;
