import { Bytes, UInt8, Field, ZkProgram, Poseidon, Hash, verify } from 'o1js';

const SmallProgram = ZkProgram({
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

const BigProgram = ZkProgram({
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

const csSmall = await SmallProgram.analyzeMethods();
console.log('small program rows: ', csSmall.poseidonHash.rows);

const csBig = await BigProgram.analyzeMethods();
console.log('big program rows: ', csBig.combinedHash.rows, '\n');

console.time('compile small');
await SmallProgram.compile();
console.timeEnd('compile small');

console.time('compile big');
const { verificationKey: verificationKeyBig } = await BigProgram.compile();
console.timeEnd('compile big');

console.time('prove small');
const proofSmall = await SmallProgram.poseidonHash(Field.random());
console.timeEnd('prove small');

console.time('prove big');
const { proof: proofBig } = await BigProgram.combinedHash(proofSmall.proof);
console.timeEnd('prove big');

console.time('verify big');
await verify(proofBig, verificationKeyBig);
console.timeEnd('verify big');

console.log('Final Digest: ', proofBig.publicOutput.toHex());
