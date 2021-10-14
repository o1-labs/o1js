export * from './snarky';
export * from './lib/signature';
export * from './lib/circuit_value';
export * from './lib/merkle_proof';

import * as preimage from './examples/ex01_small_preimage';
preimage.default();

// import * as small_preimage from './examples/ex01_small_preimage';
// small_preimage.default()

import { shutdown } from './snarky';
if (typeof window === 'undefined') {
  shutdown();
}
