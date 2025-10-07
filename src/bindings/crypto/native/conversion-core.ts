import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';

import { conversionCore as conversionCoreWasm, ConversionCores } from '../bindings/conversion-core.js';

export type NativeConversionCores = ConversionCores;

type Wasm = typeof wasmNamespace;

export function conversionCore(wasm: Wasm): NativeConversionCores {
  return conversionCoreWasm(wasm);
}
