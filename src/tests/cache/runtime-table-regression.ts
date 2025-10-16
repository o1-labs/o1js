import minimist from 'minimist';
import assert from 'node:assert';
import { Field } from 'o1js';
import { PayrollRuntimeTableZkProgram } from '../../examples/zkprogram/runtime-table/payroll.js';
import { CacheHarness } from './harness.js';

const { mode, tarball } = minimist(process.argv.slice(2));

const harness = await CacheHarness({ mode, tarball });

const { verificationKey: vk } = await PayrollRuntimeTableZkProgram.compile({
  withRuntimeTables: true,
  cache: harness.cache,
});

harness.check(vk, 'vk');

const { proof } = await PayrollRuntimeTableZkProgram.verifyPayroll(
  Field(1600_00),
  Field(1000_00),
  Field(2000_00),
  Field(3000_00),
  Field(2_000),
  Field(2_500),
  Field(3_000)
);

const ok = await harness.verify(proof, 'vk');
assert.equal(ok, true, 'proof should verify');

await harness.finish();
