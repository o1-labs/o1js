import { Performance } from '../../../lib/testing/perf-regression.js';
import { BLAKE2BProgram, Bytes12 } from './blake2b.js';

const cs = await BLAKE2BProgram.analyzeMethods();
const perfBlake2b = Performance.create(BLAKE2BProgram.name, cs);
perfBlake2b.start('compile');
await BLAKE2BProgram.compile();
perfBlake2b.end();

let preimage = Bytes12.fromString('hello world!');

console.log('blake2b rows:', (await BLAKE2BProgram.analyzeMethods()).blake2b.rows);

perfBlake2b.start('prove', 'blake2b');
let { proof } = await BLAKE2BProgram.blake2b(preimage);
perfBlake2b.end();

perfBlake2b.start('verify', 'blake2b');
let isValid = await BLAKE2BProgram.verify(proof);
perfBlake2b.end();

console.log('digest:', proof.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !== '4fccfb4d98d069558aa93e9565f997d81c33b080364efd586e77a433ddffc5e2'
)
  throw new Error('Invalid blake2b digest!');
if (!isValid) throw new Error('Invalid proof');
