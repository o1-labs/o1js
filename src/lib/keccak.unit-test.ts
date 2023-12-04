import { Field } from './field.js';
import { Provable } from './provable.js';
import { preNist, nistSha3, ethereum } from './keccak.js';
import { sha3_256, keccak_256 } from '@noble/hashes/sha3';
import { ZkProgram } from './proof_system.js';


let Keccak = ZkProgram({
  name: 'keccak',
  publicInput: Provable.Array(Field, 100),
  publicOutput: Provable.Array(Field, 32),
  methods: {
    preNist: {
      privateInputs: [],
      method(preImage) {
        return preNist(256, preImage);
      },
    },
    nistSha3: {
      privateInputs: [],
      method(preImage) {
        return nistSha3(256, preImage);
      },
    },
    ethereum: {
      privateInputs: [],
      method(preImage) {
        return ethereum(preImage);
      },
    },
  },
});

console.log("compiling keccak");
await Keccak.compile();
console.log("done compiling keccak");

const runs = 2;

let preImage = [
  236, 185, 24, 61, 138, 249, 61, 13, 226, 103, 152, 232, 104, 234, 170, 26,
  46, 54, 157, 146, 17, 240, 10, 193, 214, 110, 134, 47, 97, 241, 172, 198,
  80, 95, 136, 185, 62, 156, 246, 210, 207, 129, 93, 162, 215, 77, 3, 38,
  194, 86, 75, 100, 64, 87, 6, 18, 4, 159, 235, 53, 87, 124, 216, 241, 179,
  201, 111, 168, 72, 181, 28, 65, 142, 243, 224, 69, 58, 178, 114, 3, 112,
  23, 15, 208, 103, 231, 114, 64, 89, 172, 240, 81, 27, 215, 129, 3, 16,
  173, 133, 160,
]

let preNistProof = await Keccak.preNist(preImage.map(Field.from));
console.log(preNistProof.publicOutput.toString());
console.log(keccak_256(new Uint8Array(preImage)));
let nistSha3Proof = await Keccak.nistSha3(preImage.map(Field.from));
console.log(nistSha3Proof.publicOutput.toString());
console.log(sha3_256(new Uint8Array(preImage)));
let ethereumProof = await Keccak.ethereum(preImage.map(Field.from));
console.log(ethereumProof.publicOutput.toString());

console.log('verifying');
preNistProof.verify();
nistSha3Proof.verify();
ethereumProof.verify();
console.log('done verifying');
