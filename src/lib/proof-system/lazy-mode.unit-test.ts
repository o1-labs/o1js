import { Field } from '../provable/field.js';
import { ZkProgram } from '../proof-system/zkprogram.js';
import { Spec, fieldWithRng } from '../testing/equivalent.js';
import { Random } from '../testing/property.js';
import { assert } from '../provable/gadgets/common.js';
import { Gadgets } from '../provable/gadgets/gadgets.js';

//import { wasm_memory_byte_length } from '../../../src/mina/src/lib/crypto/proof-systems/plonk-wasm/nodejs/plonk_wasm.js';

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Convert `import.meta.url` (e.g., 'file:///home/...') into __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(__filename);

// From this test file: dist/node/lib/proof-system/lazy-mode.unit-test.js
// We want to reach: src/mina/src/lib/crypto/proof-systems/plonk-wasm/nodejs/plonk_wasm.js
const wasmPath = path.resolve(
  __dirname,
  '../../../../src/mina/src/lib/crypto/proof-systems/plonk-wasm/nodejs/plonk_wasm.js'
);

// Convert to a file URL for dynamic import
const wasmUrl = pathToFileURL(wasmPath).href;

const { get_memory, get_memory_byte_length } = await import(wasmUrl);


let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

function logWasmMemoryByteLength(label: string) {
    let bytes = get_memory_byte_length();
    console.log(`[WASM Memory] ${label}: ${bytes} bytes`);
}

function logWasmMemory(label: string) {
    const memory = get_memory() as WebAssembly.Memory;
    const bytes = memory.buffer.byteLength;
    const pages = bytes / 65536;
    console.log(`[WASM Memory] ${label}: ${bytes} bytes (${pages} pages)`);
}

logWasmMemory('Before compile');

// dummy circuit
  let LazyMode = ZkProgram({
    name: 'lazy-mode',
    methods: {
      dummy: {
        privateInputs: [Field],
        async method(v: Field) {
            for (let i = 0; i < 1 << 16; i++) {
                let w = v.add(new Field(i));
                Gadgets.rangeCheck64(w);
            }
        },
      },
    },
  });

  {

  await LazyMode.compile({
    lazyMode: true,
  });

  logWasmMemory('After compile');

  let methods = await LazyMode.analyzeMethods();
  console.log(methods);

  let { proof } = await LazyMode.dummy(new Field(1n));

  logWasmMemory('After proof');

  let isValid = await LazyMode.verify(proof);

  logWasmMemory('After verify');

  assert(isValid);

  }
