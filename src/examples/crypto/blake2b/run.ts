import { Bytes12, BLAKE2BProgram } from './blake2b.js';
import { perfStart, perfEnd } from '../../../lib/testing/perf-regression.js';

const cs = await BLAKE2BProgram.analyzeMethods();
perfStart('compile', BLAKE2BProgram.name, cs);
await BLAKE2BProgram.compile();
perfEnd();

let preimage = Bytes12.fromString('hello world!');

console.log('blake2b rows:', (await BLAKE2BProgram.analyzeMethods()).blake2b.rows);

perfStart('prove', BLAKE2BProgram.name, cs, 'blake2b');
let { proof } = await BLAKE2BProgram.blake2b(preimage);
perfEnd();

let isValid = await BLAKE2BProgram.verify(proof);

console.log('digest:', proof.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !== '4fccfb4d98d069558aa93e9565f997d81c33b080364efd586e77a433ddffc5e2'
)
  throw new Error('Invalid blake2b digest!');
if (!isValid) throw new Error('Invalid proof');
