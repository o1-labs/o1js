import { assert } from 'console';
import { VerificationKey } from './verification-key.js';
import { Provable } from '../provable/provable.js';

console.log('verification key consistency check (generated and cached)');
let generated = await VerificationKey.dummy();
let cached = VerificationKey.dummySync();

assert(generated.data === cached.data, 'data equals');
assert(generated.hash.equals(cached.hash).toBoolean(), 'hash equals');
