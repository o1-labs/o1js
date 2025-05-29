import { Field } from '../provable/field.js';
import { Cache } from '../proof-system/cache.js';
import { ZkProgram } from '../proof-system/zkprogram.js';
import { Spec, fieldWithRng } from '../testing/equivalent.js';
import { Random } from '../testing/property.js';
import { assert } from '../provable/gadgets/common.js';
import { Gadgets } from '../provable/gadgets/gadgets.js';
import { wasm } from '../../bindings.js';


function getMemory() {
  return {
    wasm: (wasm as any).__wasm.memory.buffer.byteLength / (1024 * 1024),
    js: process.memoryUsage().heapTotal / (1024 * 1024),
  };
}

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};


// dummy circuit
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


async function testLazyMode(lazyMode: boolean) {

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

  await testLazyMode(false);