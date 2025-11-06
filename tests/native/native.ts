import native from '@o1js/native-darwin-arm64';
import assert from 'node:assert';

console.log(native);

assert(native.getNativeCalls() == 0n, 'native module starts with no calls');

// make any call
try {
  native.prover_index_fp_from_bytes(new Uint8Array());
} catch {}

assert(native.getNativeCalls() >= 1n, 'native module has become active');

console.log('assertion of native module activity ok');
