import { Bytes12, Blake2bProgram } from './blake2b.js';

console.time('compile');
await Blake2bProgram.compile();
console.timeEnd('compile');

let preimage = Bytes12.fromString('hello world!');

console.log('blake2b rows:', (await Blake2bProgram.analyzeMethods()).blake2b.rows);

console.time('prove');
let proof = await Blake2bProgram.blake2b(preimage);
console.timeEnd('prove');
let isValid = await Blake2bProgram.verify(proof);

console.log('digest:', proof.publicOutput.toHex());

if (
  proof.publicOutput.toHex() !==
  'fa02d55d26bc5cda1e2d67fb7424f6132c58fed81a52816342795de54d3b2d8b91749f267d2491ed05ca0cbbd0e641cc1758b92e99eb1d8771060ebacbc83c25'
)
  throw new Error('Invalid blake2b digest!');
if (!isValid) throw new Error('Invalid proof');
