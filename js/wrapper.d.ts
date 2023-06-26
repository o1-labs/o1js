import * as wasm from '../compiled/node_bindings/plonk_wasm.cjs';

export { WasmModule, getWasm, getSnarky, withThreadPool };

type WasmModule = typeof wasm;

declare function getWasm(): WasmModule;

declare function getSnarky(): any;

declare function withThreadPool<T>(run: () => Promise<T>): Promise<T>;
