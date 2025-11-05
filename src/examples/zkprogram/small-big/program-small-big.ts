import { Bytes, Field, Hash, Poseidon, UInt8, ZkProgram } from 'o1js';

export const SmallProgram = ZkProgram({
  name: 'small-program',
  publicOutput: Field,

  methods: {
    poseidonHash: {
      privateInputs: [Field],
      async method(preimage: Field) {
        const digest = Poseidon.hash([preimage]);

        return { publicOutput: digest };
      },
    },
  },
});

class PoseidonProof extends SmallProgram.Proof {}
class Bytes32 extends Bytes(32) {}

export const BigProgram = ZkProgram({
  name: 'big-program',
  publicOutput: Bytes32,

  methods: {
    combinedHash: {
      privateInputs: [PoseidonProof],
      async method(poseidonProof: PoseidonProof) {
        poseidonProof.verify();

        const poseidonOutput = poseidonProof.publicOutput;
        const outputBits = poseidonOutput.toBits();

        const byteChunks = Array.from({ length: 32 }, (_, i) => outputBits.slice(i * 8, i * 8 + 8));
        const outputBytes = byteChunks.map((byteChunks) => UInt8.fromBits(byteChunks));

        const hash1 = Hash.SHA2_256.hash(outputBytes);
        const hash2 = Hash.BLAKE2B.hash(hash1);
        const hash3 = Hash.SHA3_512.hash(Bytes.from([...hash1.bytes, ...hash2.bytes]));
        const hash4 = Hash.Keccak256.hash(hash3);

        return { publicOutput: hash4 };
      },
    },
  },
});
