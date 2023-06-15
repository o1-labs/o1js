import {
  Sha3_224,
  Sha3_256,
  Sha3_385,
  Sha3_512,
  Keccak,
  Field,
  Provable,
} from 'snarkyjs';

Provable.runAndCheck(() => {
  let digest = Sha3_224.hash([Field(1), Field(1), Field(2)]);
  Provable.log(digest);
});
