import { Field } from '../field.js';
import { ZkProgram } from '../proof_system.js';
import { Bytes } from '../provable-types/provable-types.js';
import { Gadgets } from './gadgets.js';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { bytes } from './test-utils.js';
import { equivalent } from '../testing/equivalent.js';
import { Random, sample } from '../testing/random.js';

sample(Random.nat(400), 25).forEach((preimageLength) => {
  let inputBytes = bytes(preimageLength);
  let outputBytes = bytes(256 / 8);

  equivalent({ from: [inputBytes], to: outputBytes, verbose: true })(
    (x) => nobleSha256(x),
    (x) => Gadgets.SHA256.hash(x),
    `sha256 preimage length ${preimageLength}`
  );
});
