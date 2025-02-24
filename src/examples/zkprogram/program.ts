import {
  SelfProof,
  Field,
  ZkProgram,
  verify,
  Proof,
  JsonProof,
  Provable,
  Empty,
  Cache,
  VerificationKey,
} from 'o1js';
let vk = VerificationKey.dummySync();
console.log(vk.data);
console.log(vk.hash.toString());
