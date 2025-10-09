import { Performance } from '../../../lib/testing/perf-regression.js';
import { Bytes12, SHA256Program } from './sha256.js';

const cs = await SHA256Program.analyzeMethods();
const perfSha256 = Performance.create(SHA256Program.name, cs);

perfSha256.start('compile');
await SHA256Program.compile();
perfSha256.end();

let preimage = Bytes12.fromString('hello world!');

console.log('sha256 rows:', (await SHA256Program.analyzeMethods()).sha256.rows);

perfSha256.start('prove', 'sha256');
let { proof } = await SHA256Program.sha256(preimage);
perfSha256.end();

let isValid = await SHA256Program.verify(proof);

console.log('digest:', proof.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !== '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9'
)
  throw new Error('Invalid sha256 digest!');
if (!isValid) throw new Error('Invalid proof');
