import { Bytes, Gadgets, ZkProgram } from 'o1js';

class Bytes12 extends Bytes(12) {}

let SHA256 = ZkProgram({
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

await SHA256.compile();
let preimage = Bytes12.fromString('hello world!');

let proof = await SHA256.sha256(preimage);

let isValid = await SHA256.verify(proof);

if (
  proof.publicOutput.toHex() !==
  '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9'
)
  throw new Error('Invalid sha256 digest!');
if (!isValid) throw new Error('Invalid proof');
