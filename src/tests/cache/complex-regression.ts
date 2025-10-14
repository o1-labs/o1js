import minimist from 'minimist';
import assert from 'node:assert';
import { Field, Provable, Struct, UInt64, Unconstrained, ZkProgram } from 'o1js';
import { CacheHarness } from './harness.js';

const { mode, tarball } = minimist(process.argv.slice(2));

const harness = await CacheHarness({ mode, tarball });

const RealProgram = ZkProgram({
  name: 'real',
  publicOutput: UInt64,
  methods: {
    make: {
      privateInputs: [UInt64],
      async method(value: UInt64) {
        let expected = UInt64.from(35);
        value.assertEquals(expected);
        return { publicOutput: value.add(1) };
      },
    },
  },
});

class RealProof extends RealProgram.Proof {}
class Nested extends Struct({ inner: RealProof }) {}

const RecursiveProgram = ZkProgram({
  name: 'recursive',
  methods: {
    verifyReal: {
      privateInputs: [RealProof],
      async method(proof: RealProof) {
        proof.verify();
      },
    },
    verifyNested: {
      privateInputs: [Field, Nested],
      async method(_unrelated, { inner }: Nested) {
        inner.verify();
      },
    },
    verifyInternal: {
      privateInputs: [Unconstrained.withEmpty<RealProof | undefined>(undefined)],
      async method(fakeProof: Unconstrained<RealProof | undefined>) {
        // witness either fake proof from input, or real proof
        let proof = await Provable.witnessAsync(RealProof, async () => {
          let maybeFakeProof = fakeProof.get();
          if (maybeFakeProof !== undefined) return maybeFakeProof;

          let { proof } = await RealProgram.make(35);
          return proof;
        });

        proof.declare();
        proof.verify();
      },
    },
  },
});

const { verificationKey: realVk } = await RealProgram.compile({ cache: harness.cache });
harness.check(realVk, 'realVk');
const { verificationKey: vk } = await RecursiveProgram.compile({ cache: harness.cache });
harness.check(vk, 'vk');
const { proof: realProof } = await RealProgram.make(35);
{
  const ok = await harness.verify(realProof, 'realVk');
  assert.equal(ok, true, 'expected real proof to verify with realVk');
}
const { proof: recursiveProof } = await RecursiveProgram.verifyReal(realProof);

{
  const ok = await harness.verify(recursiveProof, 'vk');
  assert.equal(ok, true, 'expected recursive proof to verify with vk');
}

const { proof: nestedProof } = await RecursiveProgram.verifyNested(0, { inner: realProof });
{
  const ok = await harness.verify(nestedProof, 'vk');
  assert.equal(ok, true, 'expected nested proof to verify with vk');
}
const { proof: internalProof } = await RecursiveProgram.verifyInternal(undefined);

{
  const ok = await harness.verify(internalProof, 'vk');
  assert.equal(ok, true, 'expected internal proof to verify with vk');
}

await harness.finish();
