import assert from 'node:assert';
import { diverse, Bytes128 } from './diverse-zk-program.js';
import { Performance } from '../../src/lib/testing/perf-regression.js';

const cs = await diverse.analyzeMethods();
const perfDiverse = Performance.create(diverse.name, cs);

perfDiverse.start('compile');
await diverse.compile();
perfDiverse.end();

perfDiverse.start('prove', 'sha3');
let { proof: proof1 } = await diverse.sha3(Bytes128.fromString('hello'));
perfDiverse.end();

perfDiverse.start('prove', 'recursive');
let { proof: proof2 } = await diverse.recursive(proof1);
perfDiverse.end();

assert(await diverse.verify(proof2), 'verifies');
