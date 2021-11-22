export * from './snarky';
export * from './lib/signature';
export * from './lib/circuit_value';
export * from './lib/merkle_proof';
import * as Foo from './examples/wip';
// export * as Ex00 from './examples/ex00_preimage';
// export * as Ex01 from './examples/ex01_small_preimage';

console.log('a');
Foo.main();
console.log('b');

import { shutdown } from './snarky';
if (typeof window === 'undefined') {
  shutdown();
}
