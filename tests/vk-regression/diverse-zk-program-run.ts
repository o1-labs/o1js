import assert from 'node:assert';
import { verify } from 'o1js';
import { Performance } from '../../src/lib/testing/perf-regression.js';
import { Bytes128, diverse } from './diverse-zk-program.js';

const cs = await diverse.analyzeMethods();
const perfDiverse = Performance.create(diverse.name, cs);

perfDiverse.start('compile');
const { verificationKey } = await diverse.compile();
perfDiverse.end();

perfDiverse.start('prove', 'sha3');
let { proof: proof1 } = await diverse.sha3(Bytes128.fromString('hello'));
perfDiverse.end();

perfDiverse.start('verify', 'sha3');
const isValid1 = await verify(proof1, verificationKey);
perfDiverse.end();
assert(isValid1, 'proof1 verification failed!');

perfDiverse.start('prove', 'recursive');
let { proof: proof2 } = await diverse.recursive(proof1);
perfDiverse.end();

perfDiverse.start('verify', 'recursive');
const isValid2 = await verify(proof2, verificationKey);
perfDiverse.end();
assert(isValid2, 'proof2 verification failed!');
