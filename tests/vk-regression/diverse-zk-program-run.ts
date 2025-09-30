import assert from 'node:assert';
import { diverse, Bytes128 } from './diverse-zk-program.js';
import { perfStart, perfEnd } from '../../src/lib/testing/perf-regression.js';

const cs = await diverse.analyzeMethods();

perfStart('compile', diverse.name, cs);
await diverse.compile();
perfEnd();

perfStart('prove', diverse.name, cs, 'sha3');
let { proof: proof1 } = await diverse.sha3(Bytes128.fromString('hello'));
perfEnd();

perfStart('prove', diverse.name, cs, 'recursive');
let { proof: proof2 } = await diverse.recursive(proof1);
perfEnd();

assert(await diverse.verify(proof2), 'verifies');
