import minimist from "minimist";
import assert from "node:assert";
import { Field, ZkProgram } from "o1js";
import { CacheHarness } from "./harness.js";

const {
  mode,
  tarball,
} = minimist(process.argv.slice(2))

const harness = await CacheHarness({ mode, tarball })

const SimpleProgram = ZkProgram({
  name: "simple-program",
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return {
          publicOutput: Field(1),
        }
      }
    }
  }
})

const { verificationKey: vk } = await SimpleProgram.compile({ cache: harness.cache });
const { proof } = await SimpleProgram.baseCase();
harness.check(vk, "vk");
const ok = await harness.verify(proof, "vk");
assert.equal(ok, true, "expected proof to verify");
await harness.finish()