import { Bytes, Field, Gadgets, Provable, UInt32, UInt64, UInt8 } from 'o1js';

type FlexibleBytes = Bytes | (UInt8 | bigint | number)[] | Uint8Array;

Provable.runAndCheck(() => {
  let digest = Gadgets.SHA256.hash(Bytes.fromString('Hello world!'));

  Provable.asProver(() => {
    console.log(toHex(digest));
  });
});
function toHex(xs: UInt32[]) {
  let hex = '';
  for (let h = 0; h < xs.length; h++)
    hex = hex + ('00000000' + xs[h].toBigint().toString(16)).slice(-8);

  return hex;
}
