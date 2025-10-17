import minimist from 'minimist';
import assert from 'node:assert';
import { rsaZkProgram } from '../../examples/crypto/rsa/program.js';
import { Bigint2048 } from '../../examples/crypto/rsa/rsa.js';
import { generateRsaParams, rsaSign, sha256Bigint } from '../../examples/crypto/rsa/utils.js';
import { CacheHarness } from './harness.js';

const { mode, tarball } = minimist(process.argv.slice(2));

const harness = await CacheHarness({ mode, tarball });

const { verificationKey: vk } = await rsaZkProgram.compile({ cache: harness.cache });
harness.check(vk, 'vk');

const input = await sha256Bigint('How are you!');
const params = generateRsaParams(2048);
const message = Bigint2048.from(input);
const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
const modulus = Bigint2048.from(params.n);

const { proof } = await rsaZkProgram.verifyRsa65537(message, signature, modulus);
const ok = await harness.verify(proof, 'vk');
assert.equal(ok, true, 'expected proof to verify');
await harness.finish();
