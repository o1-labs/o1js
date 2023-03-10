import * as wasm from '../node_bindings/plonk_wasm.js';

export {
  WasmModule,
  getWasm,
  getSnarky,
  snarkyReady,
  shutdown,
  withThreadPool,
};

type WasmModule = typeof wasm;

declare function getWasm(): WasmModule;

declare function getSnarky(): any;

declare let snarkyReady: Promise<undefined>;

declare function shutdown(): Promise<undefined>;

declare function withThreadPool<T>(run: () => Promise<T>): Promise<T>;
