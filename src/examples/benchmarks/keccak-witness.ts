import { Hash, Bytes, Provable } from 'o1js';

let Bytes32 = Bytes(32);

console.time('keccak witness');
await Provable.runAndCheck(() => {
  let bytes = Provable.witness(Bytes32.provable, () => Bytes32.random());
  Hash.Keccak256.hash(bytes);
});
console.timeEnd('keccak witness');
