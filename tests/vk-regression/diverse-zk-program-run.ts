import assert from 'node:assert';
import { diverse, Bytes128 } from './diverse-zk-program.js';

console.log('testing proof generation for diverse program');
await diverse.compile();

let { proof: proof1 } = await diverse.sha3(Bytes128.fromString('hello'));
assert(await diverse.verify(proof1), 'verifies');

let { proof: proof2 } = await diverse.recursive(proof1);
assert(await diverse.verify(proof2), 'verifies');
