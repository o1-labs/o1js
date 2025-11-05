import minimist from 'minimist';
import assert from 'node:assert';
import { Field } from 'o1js';
import { BigProgram, SmallProgram } from '../../examples/zkprogram/small-big/program-small-big.js';
import { CacheHarness } from './harness.js';

const { mode, tarball } = minimist(process.argv.slice(2));

const harness = await CacheHarness({ mode, tarball });

const { verificationKey: smallVk } = await SmallProgram.compile({ cache: harness.cache });
harness.check(smallVk, 'smallVk');

const { verificationKey: bigVk } = await BigProgram.compile({ cache: harness.cache });
harness.check(bigVk, 'bigVk');

{
  const { proof } = await SmallProgram.poseidonHash(Field.random());
  {
    const ok = await harness.verify(proof, 'smallVk');
    assert.equal(ok, true, 'small proof should verify');
  }

  const { proof: derived } = await BigProgram.combinedHash(proof);
  {
    const ok = await harness.verify(derived, 'bigVk');
    assert.equal(ok, true, 'derived proof should verify');
  }
}

await harness.finish();
