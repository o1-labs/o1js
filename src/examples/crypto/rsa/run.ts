import { ZkProgram } from 'o1js';
import { Bigint2048, rsaVerify65537 } from './rsa.js';
import { sha256Bigint, generateRsaParams, rsaSign } from './utils.js';
import { perfStart, perfEnd } from '../../../lib/testing/perf-regression.js';

let rsaZkProgram = ZkProgram({
  name: 'rsa-verify',

  methods: {
    verifyRsa65537: {
      privateInputs: [Bigint2048, Bigint2048, Bigint2048],

      async method(message: Bigint2048, signature: Bigint2048, modulus: Bigint2048) {
        rsaVerify65537(message, signature, modulus);
      },
    },
  },
});

let cs = await rsaZkProgram.analyzeMethods();

console.log(cs.verifyRsa65537.summary());

const forceRecompileEnabled = false;

perfStart('compile', rsaZkProgram.name);
await rsaZkProgram.compile({ forceRecompile: forceRecompileEnabled });
perfEnd();

console.time('generate RSA parameters and inputs (2048 bits)');
const input = await sha256Bigint('How are you!');
const params = generateRsaParams(2048);
const message = Bigint2048.from(input);
const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
const modulus = Bigint2048.from(params.n);
console.timeEnd('generate RSA parameters and inputs (2048 bits)');

perfStart('prove', rsaZkProgram.name, cs, 'verifyRsa65537');
let { proof } = await rsaZkProgram.verifyRsa65537(message, signature, modulus);
perfEnd();

console.time('verify');
await rsaZkProgram.verify(proof);
console.timeEnd('verify');
