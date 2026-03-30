import { Bytes, Hash, ZkProgram } from 'o1js';

export { Bytes12, SHA256Program };

class Bytes12 extends Bytes(12) {}

let SHA256Program = ZkProgram({
  name: 'sha256',
  publicOutput: Bytes(32),
  methods: {
    sha256: {
      privateInputs: [Bytes12],
      async method(xs: Bytes12) {
        return {
          publicOutput: Hash.SHA2_256.hash(xs),
        };
      },
    },
  },
});
