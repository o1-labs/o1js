import {
  Bytes12,
  SHA256Program,
  SHA256UpdateProgram,
  Bytes6,
} from './sha256.js';

console.log('SHA256Program Benchmarks');
console.time('compile');
await SHA256Program.compile();
console.timeEnd('compile');

let preimage = Bytes12.fromString('hello world!');

console.log('sha256 rows:', (await SHA256Program.analyzeMethods()).sha256.rows);

console.time('prove');
let proof = await SHA256Program.sha256(preimage);
console.timeEnd('prove');
let isValid = await SHA256Program.verify(proof);

console.log('digest:', proof.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !==
  '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9'
)
  throw new Error('Invalid sha256 digest!');
if (!isValid) throw new Error('Invalid proof');

console.log('\nSHA256UpdateProgram Benchmarks');
console.time('compile');
await SHA256UpdateProgram.compile();
console.timeEnd('compile');

console.log(
  'dynamic sha256 rows:',
  (await SHA256UpdateProgram.analyzeMethods()).update.rows
);

let preimage1 = Bytes6.fromString('hello ');
let preimage2 = Bytes6.fromString('world!');

console.time('prove');
let proofHasher = await SHA256UpdateProgram.update(preimage1, preimage2);
console.timeEnd('prove');
let isValidProof = await SHA256UpdateProgram.verify(proofHasher);

console.log('digest:', proofHasher.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !==
  '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9'
)
  throw new Error('Invalid sha256 digest!');
if (!isValidProof) throw new Error('Invalid proof');