import {
  Bytes,
  Field,
  Gadgets,
  Provable,
  UInt32,
  UInt64,
  UInt8,
  ZkProgram,
} from 'o1js';

/* 
let SHA256 = ZkProgram({
  name: 'sha256',
  publicOutput: Bytes(32).provable,
  methods: {
    sha256: {
      privateInputs: [Bytes12.provable],
      method(xs: Bytes12) {
        return Gadgets.SHA256.hash(xs);
      },
    },
  },
});

await SHA256.compile(); */
class BytesN extends Bytes(58) {}

let preimage = BytesN.fromString('hello world!');

Gadgets.SHA256.hash(preimage);

function toHex(xs: UInt32[]) {
  let hex = '';
  for (let h = 0; h < xs.length; h++)
    hex = hex + ('00000000' + xs[h].toBigint().toString(16)).slice(-8);

  return hex;
}
