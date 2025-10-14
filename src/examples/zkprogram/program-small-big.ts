import { Bytes, Field, Hash, Poseidon, UInt8, ZkProgram, verify } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

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

const perfSmall = Performance.create(SmallProgram.name, csSmall);
const perfBig = Performance.create(BigProgram.name, csBig);

perfSmall.start('compile');
await SmallProgram.compile();
perfSmall.end();

perfBig.start('compile');
const { verificationKey: verificationKeyBig } = await BigProgram.compile();
perfBig.end();

perfSmall.start('prove', 'poseidonHash');
const proofSmall = await SmallProgram.poseidonHash(Field.random());
perfSmall.end();

perfBig.start('prove', 'combinedHash');
const { proof: proofBig } = await BigProgram.combinedHash(proofSmall.proof);
perfBig.end();

perfBig.start('verify', 'combinedHash');
await verify(proofBig, verificationKeyBig);
perfBig.end();

console.log('Final Digest: ', proofBig.publicOutput.toHex());
