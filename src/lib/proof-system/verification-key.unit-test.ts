import { assert } from 'console';
import { VerificationKey } from './verification-key.js';

it('verification key consistency check (generated and cached)', async () => {
  let generated = await VerificationKey.dummy();
  let cached = await VerificationKey.dummySync();

  assert(generated.data === cached.data, 'data equals');
  assert(generated.hash.equals(cached.data).toBoolean(), 'hash equals');
});
