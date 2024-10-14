import { Bytes12, BLAKE2BProgram } from './blake2b.js';

console.time('compile');
await BLAKE2BProgram.compile();
console.timeEnd('compile');

let preimage = Bytes12.fromString('hello world!');

console.log('blake2b rows:', (await BLAKE2BProgram.analyzeMethods()).blake2b.rows);

console.time('prove');
let { proof } = await BLAKE2BProgram.blake2b(preimage);
console.timeEnd('prove');
let isValid = await BLAKE2BProgram.verify(proof);

console.log('digest:', proof.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !==
  '4fccfb4d98d069558aa93e9565f997d81c33b080364efd586e77a433ddffc5e2'
)
  throw new Error('Invalid blake2b digest!');
if (!isValid) throw new Error('Invalid proof');
