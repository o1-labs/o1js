import { assert } from 'console';
import { VerificationKey } from './verification-key.js';
import { Field } from '../provable/wrapped.js';

console.log('verification key consistency check (generated and cached)');
let generated = await VerificationKey.dummy();
let cached = VerificationKey.dummySync();

assert(generated.data === cached.data, 'data equals');
assert(generated.hash.equals(cached.hash).toBoolean(), 'hash equals');

let vkIsValid = await VerificationKey.checkValidity(generated);
assert(vkIsValid, 'valid verification key is being rejected as invalid');

const invalidVerificationKey = new VerificationKey({
  data: generated.data,
  hash: Field.random(),
});

let vkIsNotValid = await VerificationKey.checkValidity(invalidVerificationKey);
assert(vkIsNotValid === false, 'invalid verification key is being accepted as valid');
