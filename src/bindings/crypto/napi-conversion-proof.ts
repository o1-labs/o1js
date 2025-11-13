import type {
  WasmFpRuntimeTable,
  WasmPastaFpRuntimeTableCfg,
  WasmPastaFpLookupTable,
  WasmFqRuntimeTable,
  WasmPastaFqRuntimeTableCfg,
  WasmPastaFqLookupTable,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../compiled/node_bindings/plonk_wasm.cjs';
import type * as napiNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import type { RuntimeTable, RuntimeTableCfg, LookupTable } from './bindings/kimchi-types.js';
import { MlArray } from '../../lib/ml/base.js';
import { fieldsToRustFlat } from './bindings/conversion-base.js';
import { ConversionCore, ConversionCores } from './napi-conversion-core.js';

export { napiProofConversion };

type napi = typeof napiNamespace;

type NapiRuntimeTable = WasmFpRuntimeTable | WasmFqRuntimeTable;
type NapiRuntimeTableCfg = WasmPastaFpRuntimeTableCfg | WasmPastaFqRuntimeTableCfg;
type NapiLookupTable = WasmPastaFpLookupTable | WasmPastaFqLookupTable;

type NapiClasses = {
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  RuntimeTable: typeof WasmFpRuntimeTable | typeof WasmFqRuntimeTable;
  RuntimeTableCfg: typeof WasmPastaFpRuntimeTableCfg | typeof WasmPastaFqRuntimeTableCfg;
  LookupTable: typeof WasmPastaFpLookupTable | typeof WasmPastaFqLookupTable;
};

function napiProofConversion(napi: napi, core: ConversionCores) {
  return {
    fp: proofConversionPerField(core.fp, {
      VecVec: napi.WasmVecVecFp,
      RuntimeTable: napi.WasmFpRuntimeTable,
      RuntimeTableCfg: napi.WasmPastaFpRuntimeTableCfg,
      LookupTable: napi.WasmPastaFpLookupTable,
    }),
    fq: proofConversionPerField(core.fq, {
      VecVec: napi.WasmVecVecFq,
      RuntimeTable: napi.WasmFqRuntimeTable,
      RuntimeTableCfg: napi.WasmPastaFqRuntimeTableCfg,
      LookupTable: napi.WasmPastaFqLookupTable,
    }),
  };
}

function proofConversionPerField(
  core: ConversionCore,
  { VecVec, RuntimeTable, RuntimeTableCfg, LookupTable }: NapiClasses
) {
  function runtimeTableToRust([, id, data]: RuntimeTable): NapiRuntimeTable {
    return new RuntimeTable(id, core.vectorToRust(data));
  }

  function runtimeTableCfgToRust([, id, firstColumn]: RuntimeTableCfg): NapiRuntimeTableCfg {
    return new RuntimeTableCfg(id, core.vectorToRust(firstColumn));
  }

  function lookupTableToRust([, id, [, ...data]]: LookupTable): NapiLookupTable {
    let n = data.length;
    let wasmData = new VecVec(n);
    for (let i = 0; i < n; i++) {
      wasmData.push(fieldsToRustFlat(data[i]));
    }
    return new LookupTable(id, wasmData);
  }

  return {
    runtimeTablesToRust([, ...tables]: MlArray<RuntimeTable>): NapiRuntimeTable[] {
      return tables.map(runtimeTableToRust);
    },

    runtimeTableCfgsToRust([, ...tableCfgs]: MlArray<RuntimeTableCfg>): NapiRuntimeTableCfg[] {
      return tableCfgs.map(runtimeTableCfgToRust);
    },

    lookupTablesToRust([, ...tables]: MlArray<LookupTable>): NapiLookupTable[] {
      return tables.map(lookupTableToRust);
    },
  };
}
