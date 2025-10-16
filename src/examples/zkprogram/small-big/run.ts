import { Field, verify } from 'o1js';
import { Performance } from '../../../lib/testing/perf-regression.js';
import { BigProgram, SmallProgram } from './program-small-big.js';

const csSmall = await SmallProgram.analyzeMethods();
console.log('small program rows: ', csSmall.poseidonHash.rows);

const csBig = await BigProgram.analyzeMethods();
console.log('big program rows: ', csBig.combinedHash.rows, '\n');

const perfSmall = Performance.create(SmallProgram.name, csSmall);
const perfBig = Performance.create(BigProgram.name, csBig);

perfSmall.start('compile');
await SmallProgram.compile();
perfSmall.end();

perfBig.start('compile');
const { verificationKey: verificationKeyBig } = await BigProgram.compile();
perfBig.end();

perfSmall.start('prove', 'poseidonHash');
const proofSmall = await SmallProgram.poseidonHash(Field.random());
perfSmall.end();

perfBig.start('prove', 'combinedHash');
const { proof: proofBig } = await BigProgram.combinedHash(proofSmall.proof);
perfBig.end();

perfBig.start('verify', 'combinedHash');
await verify(proofBig, verificationKeyBig);
perfBig.end();

console.log('Final Digest: ', proofBig.publicOutput.toHex());
