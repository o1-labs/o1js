import assert from "node:assert";
import { describe, it } from "node:test";
import { Field } from 'o1js';
import { ZKDriver } from "./zkdriver.js";
import { ZkProgram } from "./zkprogram.js";


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

describe("zkDriver", () => {
  it("should drive properly with no options", async () => {
    const driver = new ZKDriver()
    const { verificationKey: vk } = await driver.compile(SimpleProgram)
    const result = await SimpleProgram.baseCase();
    const ok = await driver.verify(result.proof, vk);
    assert.equal(ok, true, "driver should prove properly");
  })
})