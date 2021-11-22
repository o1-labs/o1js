export * from './snarky';
export * from './lib/signature';
export * from './lib/circuit_value';
export * from './lib/merkle_proof';
import * as Snarky from './snarky';
import * as Foo from './examples/wip';

(async () => {
console.log('a');
await Snarky.isReady.catch((e) => console.log(e));
Foo.main();
console.log('b');


})().catch((e) => console.log(e))