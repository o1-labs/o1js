import { Bytes, Gadgets, ZkProgram } from 'o1js';

export {
  SHA256Program,
  Bytes12,
  Bytes400,
  SHA256ProgramEntire,
  SHA256ProgramPartial,
};

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

class Bytes400 extends Bytes(400) {}

let SHA256ProgramEntire = ZkProgram({
  name: 'sha256-entire',
  publicOutput: Bytes(32).provable,
  methods: {
    sha256: {
      privateInputs: [Bytes400.provable],
      async method(xs: Bytes400) {
        return Gadgets.SHA256.hash(xs);
      },
    },
  },
});

let SHA256ProgramPartial = ZkProgram({
  name: 'sha256-partial',
  publicOutput: Bytes(32).provable,
  methods: {
    sha256: {
      privateInputs: [Bytes400.provable],
      async method(xs: Bytes400) {
        return Gadgets.SHA256.partialHash(xs);
      },
    },
  },
});
