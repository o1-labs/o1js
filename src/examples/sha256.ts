import assert from 'assert';
import { Gadgets, Provable, UInt32 } from 'o1js';

const Parser = Gadgets.SHA256.processStringToMessageBlocks;

const Hash = Gadgets.SHA256.hash;

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

Provable.runAndCheck(() => {
  run(
    'duck',
    '2d2370db2447ff8cf4f3accd68c85aa119a9c893effd200a9b69176e9fc5eb98'
  );
  run(
    'doggo',
    '8aa89c66e2c453b71400ac832a345d872c33147150267be5402552ee19b3d4ce'
  );
  run(
    'frog',
    '74fa5327cc0f4e947789dd5e989a61a8242986a596f170640ac90337b1da1ee4'
  );
});

let cs = Provable.constraintSystem(() => {
  run(
    'duck',
    '2d2370db2447ff8cf4f3accd68c85aa119a9c893effd200a9b69176e9fc5eb98'
  );
  run(
    'doggo',
    '8aa89c66e2c453b71400ac832a345d872c33147150267be5402552ee19b3d4ce'
  );
  run(
    'frog',
    '74fa5327cc0f4e947789dd5e989a61a8242986a596f170640ac90337b1da1ee4'
  );
});

console.log(cs);

function toHex(xs: UInt32[]) {
  let hex = '';
  for (let h = 0; h < xs.length; h++)
    hex = hex + ('00000000' + xs[h].toBigint().toString(16)).slice(-8);

  return hex;
}
