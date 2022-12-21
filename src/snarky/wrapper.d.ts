import * as wasm from '../node_bindings/plonk_wasm.js';

export { WasmModule, getWasm, getSnarky, snarky_ready, shutdown };

type WasmModule = typeof wasm;

declare function getWasm(): WasmModule;

declare function getSnarky(): any;

declare let snarky_ready: Promise<undefined>;

declare function shutdown(): Promise<undefined>;
