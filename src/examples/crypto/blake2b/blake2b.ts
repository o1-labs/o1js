import { Bytes, Gadgets, ZkProgram } from 'o1js';

export { BLAKE2BProgram, Bytes12 };

class Bytes12 extends Bytes(12) {}

let BLAKE2BProgram = ZkProgram({
  name: 'blake2b',
  publicOutput: Bytes(64).provable,
  methods: {
    blake2b: {
      privateInputs: [Bytes12.provable],
      async method(xs: Bytes12) {
        return Gadgets.BLAKE2B.hash(xs);
      },
    },
  },
});
