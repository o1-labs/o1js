import { Performance } from '../../../lib/testing/perf-regression.js';
import { rsaZkProgram } from './program.js';
import { Bigint2048 } from './rsa.js';
import { generateRsaParams, rsaSign, sha256Bigint } from './utils.js';

let cs = await rsaZkProgram.analyzeMethods();

console.log(cs.verifyRsa65537.summary());

const forceRecompileEnabled = false;

const perfRsa = Performance.create(rsaZkProgram.name, cs);

perfRsa.start('compile');
await rsaZkProgram.compile({ forceRecompile: forceRecompileEnabled });
perfRsa.end();

console.time('generate RSA parameters and inputs (2048 bits)');
const input = await sha256Bigint('How are you!');
const params = generateRsaParams(2048);
const message = Bigint2048.from(input);
const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
const modulus = Bigint2048.from(params.n);
console.timeEnd('generate RSA parameters and inputs (2048 bits)');

perfRsa.start('prove', 'verifyRsa65537');
let { proof } = await rsaZkProgram.verifyRsa65537(message, signature, modulus);
perfRsa.end();

perfRsa.start('verify', 'verifyRsa65537');
await rsaZkProgram.verify(proof);
perfRsa.end();
