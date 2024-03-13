import { Bytes, Gadgets, ZkProgram } from 'o1js';

export { SHA256Program, Bytes12 };

class Bytes12 extends Bytes(12) {}

let SHA256Program = ZkProgram({
  name: 'sha256',
  publicOutput: Bytes(32).provable,
  methods: {
    sha256: {
      privateInputs: [Bytes12.provable],
      async method(xs: Bytes12) {
        return Gadgets.SHA256.hash(xs);
      },
    },
  },
});
