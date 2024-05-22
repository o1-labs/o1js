import { Bytes, Gadgets, ZkProgram } from 'o1js';

export { SHA256Program, Bytes12, SHA256UpdateProgram, Bytes6 };

class Bytes12 extends Bytes(12) {}
class Bytes6 extends Bytes(6) {}

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

let SHA256UpdateProgram = ZkProgram({
  name: 'sha256-update',
  publicOutput: Bytes(32).provable,
  methods: {
    update: {
      privateInputs: [Bytes6.provable, Bytes6.provable],
      async method(xs1: Bytes6, xs2: Bytes6) {
        return Gadgets.SHA256.update(xs1).update(xs2).digest();
      },
    },
  },
});
