import { Bytes, Gadgets, ZkProgram } from 'o1js';

export { SHA256Program };

class Bytes12 extends Bytes(12) {}

let SHA256Program = ZkProgram({
  name: 'sha256',
  publicOutput: Bytes(32).provable,
  methods: {
    sha256: {
      privateInputs: [Bytes12.provable],
      method(xs: Bytes12) {
        return Gadgets.SHA256.hash(xs);
      },
    },
  },
});

console.time('compile');
await SHA256Program.compile();
console.timeEnd('compile');

let preimage = Bytes12.fromString('hello world!');

console.log('sha256 rows:', SHA256Program.analyzeMethods().sha256.rows);

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
