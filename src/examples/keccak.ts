import { Hash, Field, Provable, UInt8 } from 'snarkyjs';

console.log('Running SHA224 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA224.hash([new UInt8(1), new UInt8(2), new UInt8(3)]);
  Provable.log(digest);
});

console.log('Running SHA256 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA256.hash([new UInt8(1), new UInt8(1), new UInt8(2)]);
  Provable.log(digest);
});

console.log('Running SHA384 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA384.hash([new UInt8(1), new UInt8(1), new UInt8(2)]);
  Provable.log(digest);
});

console.log('Running SHA512 test');
Provable.runAndCheck(() => {
  let digest = Hash.SHA512.hash([new UInt8(1), new UInt8(1), new UInt8(2)]);
  Provable.log(digest);
});

console.log('Running Poseidon test');
Provable.runAndCheck(() => {
  let digest = Hash.Poseidon.hash([Field(1), Field(1), Field(2)]);
  Provable.log(digest);
});

console.log('Running default hash test');
Provable.runAndCheck(() => {
  let digest = Hash.default([Field(1), Field(1), Field(2)]);
  Provable.log(digest);
});

console.log('Running keccack hash test');
Provable.runAndCheck(() => {
  let digest = Hash.Keccack256.hash([new UInt8(1), new UInt8(1), new UInt8(2)]);
  Provable.log(digest);
});
