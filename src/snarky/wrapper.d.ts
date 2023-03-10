import * as wasm from '../node_bindings/plonk_wasm.js';

export {
  WasmModule,
  getWasm,
  getSnarky,
  snarkyReady,
  shutdown,
  initThreadPool,
  exitThreadPool,
};

type WasmModule = typeof wasm;

declare function getWasm(): WasmModule;

declare function getSnarky(): any;

declare let snarkyReady: Promise<undefined>;

declare function shutdown(): Promise<undefined>;

declare function initThreadPool(): Promise<void>;
declare function exitThreadPool(): Promise<void>;
