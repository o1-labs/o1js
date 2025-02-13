import { Field } from '../provable/wrapped.js';
import { ZkProgram } from './zkprogram.js';

const methodCount = 30;

let MyProgram = ZkProgram({
  name: 'large-program',
  publicOutput: Field,
  methods: nMethods(methodCount),
});

function nMethods(i: number) {
  let methods: Record<string, any> = {};
  for (let j = 0; j < i; j++) {
    methods['method' + j] = {
      privateInputs: [Field],
      async method(a: Field) {
        return {
          publicOutput: a.mul(1),
        };
      },
    };
  }
  return methods;
}

try {
  await MyProgram.compile();
} catch (error) {
  throw Error(
    `Could not compile zkProgram with ${methodCount} branches: ${error}`
  );
}
