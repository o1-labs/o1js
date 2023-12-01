import assert from 'assert';
import { Gadgets, Provable, UInt32 } from 'o1js';

const Parser = Gadgets.SHA256.processStringToMessageBlocks;
const Hash = Gadgets.SHA256.hash;

const testVectors = [
  {
    msg: '',
    expected:
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    msg: 'duck',
    expected:
      '2d2370db2447ff8cf4f3accd68c85aa119a9c893effd200a9b69176e9fc5eb98',
  },
  {
    msg: 'doggo',
    expected:
      '8aa89c66e2c453b71400ac832a345d872c33147150267be5402552ee19b3d4ce',
  },
  {
    msg: 'frog',
    expected:
      '74fa5327cc0f4e947789dd5e989a61a8242986a596f170640ac90337b1da1ee4',
  },
];

const run = (msg: string, expected: string) => {
  let messageBlocks = Provable.witness(
    Provable.Array(Provable.Array(UInt32, 16), 1),
    () => Parser(msg)
  );
  let digest = Hash(messageBlocks);
  Provable.asProver(() => {
    let y = toHex(digest);
    assert(expected === y, `expected ${expected} got ${y}`);
  });
};

console.log('running plain');
testVectors.forEach((v) => {
  run(v.msg, v.expected);
});

console.log('run and check');
Provable.runAndCheck(() => {
  testVectors.forEach((v) => {
    run(v.msg, v.expected);
  });
});

console.log('constraint system');
let cs = Provable.constraintSystem(() => {
  testVectors.forEach((v) => {
    run(v.msg, v.expected);
  });
});

console.log(cs);

function toHex(xs: UInt32[]) {
  let hex = '';
  for (let h = 0; h < xs.length; h++)
    hex = hex + ('00000000' + xs[h].toBigint().toString(16)).slice(-8);

  return hex;
}
