import { Field } from '../provable/field.js';
import { Cache } from '../proof-system/cache.js';
import { ZkProgram } from '../proof-system/zkprogram.js';
import { Spec, fieldWithRng } from '../testing/equivalent.js';
import { Random } from '../testing/property.js';
import { assert } from '../provable/gadgets/common.js';
import { Gadgets } from '../provable/gadgets/gadgets.js';
import { wasm } from '../../bindings.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

// Path resolution for subprocess execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(__dirname, basename(__filename));

function getMemory() {
  return {
    wasm: (wasm as any).__wasm.memory.buffer.byteLength / (1024 * 1024),
    js: process.memoryUsage().heapTotal / (1024 * 1024),
  };
}

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

// Dummy circuit
let LazyMode = ZkProgram({
  name: 'lazy-mode',
  methods: {
    baseCase: {
      privateInputs: [Field],
      async method(v: Field) {
        for (let i = 0; i < 1 << 15; i++) {
          let w = v.add(new Field(i));
          Gadgets.rangeCheck64(w);
        }
      },
    },
  },
});

export async function testLazyMode(lazyMode: boolean) {
  console.log(`(${lazyMode ? 'Lazy' : 'Eager'}) Memory before compilation`, getMemory());

  await LazyMode.compile({
    lazyMode,
    cache: Cache.None,
    forceRecompile: true,
  });

  console.log(`(${lazyMode ? 'Lazy' : 'Eager'}) Memory after compilation`, getMemory());
  console.log(' ');
  console.log(`(${lazyMode ? 'Lazy' : 'Eager'}) Memory before proof`, getMemory());

  let { proof } = await LazyMode.baseCase(new Field(1n));

  console.log(`(${lazyMode ? 'Lazy' : 'Eager'}) Memory after proof`, getMemory());
  console.log(' ');

  let isValid = await LazyMode.verify(proof);

  console.log(`(${lazyMode ? 'Lazy' : 'Eager'}) Memory after verify`, getMemory());

  assert(isValid);
}

// If launched as subprocess: run the actual test
if (process.argv[2] === 'true' || process.argv[2] === 'false') {
  const lazyMode = process.argv[2] === 'true';
  await testLazyMode(lazyMode);
  process.exit(0);
}

// Parent process logic: spawn two subprocesses
function runSubprocess(lazyMode: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, String(lazyMode)], {
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      console.log(`(Parent) Process lazyMode=${lazyMode} exited with code ${code}`);
      code === 0 ? resolve() : reject(new Error(`Test failed for lazyMode=${lazyMode}`));
    });
  });
}

await Promise.all([runSubprocess(true), runSubprocess(false)]);
