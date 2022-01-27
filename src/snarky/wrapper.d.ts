import * as wasm from '../node_bindings/plonk_wasm';

export { WasmModule, getWasm };

type WasmModule = typeof wasm;

declare function getWasm(): WasmModule;
