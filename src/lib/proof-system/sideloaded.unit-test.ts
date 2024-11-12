import { VerificationKey, Void, ZkProgram } from './zkprogram.js';
import { DynamicProof } from './proof.js';
import { Field, SmartContract, Struct, method } from '../../index.js';
import { it, describe } from 'node:test';
import { expect } from 'expect';

const program1 = ZkProgram({
  name: 'program1',
  publicInput: Field,
  methods: {
    foo: {
      privateInputs: [Field],
      async method(publicInput: Field, field: Field) {
        publicInput.assertEquals(field);
      },
    },
  },
});

export class Program2Struct extends Struct({
  field1: Field,
  field2: Field,
}) {}

const program2 = ZkProgram({
  name: 'program2',
  publicInput: Program2Struct,
  publicOutput: Field,
  methods: {
    foo: {
      privateInputs: [Field],
      async method(publicInput: Program2Struct, field: Field) {
        return {
          publicOutput: publicInput.field1.add(publicInput.field2).add(field),
        };
      },
    },
  },
});

class SampleSideloadedProof extends DynamicProof<Field, Void> {
  static publicInputType = Field;
  static publicOutputType = Void;
  static maxProofsVerified = 0 as const;
}

class SampleSideloadedProof2 extends DynamicProof<Program2Struct, Field> {
  static publicInputType = Program2Struct;
  static publicOutputType = Field;
  static maxProofsVerified = 0 as const;
}

const sideloadedProgram = ZkProgram({
  name: 'sideloadedProgram',
  publicInput: Field,
  methods: {
    recurseOneSideloaded: {
      privateInputs: [SampleSideloadedProof, VerificationKey],
      async method(
        publicInput: Field,
        proof: SampleSideloadedProof,
        vk: VerificationKey
      ) {
        proof.verify(vk);

        proof.publicInput.assertEquals(publicInput, 'PublicInput not matching');
      },
    },
    recurseTwoSideloaded: {
      privateInputs: [
        SampleSideloadedProof,
        VerificationKey,
        SampleSideloadedProof2,
        VerificationKey,
      ],
      async method(
        publicInput: Field,
        proof1: SampleSideloadedProof,
        vk1: VerificationKey,
        proof2: SampleSideloadedProof2,
        vk2: VerificationKey
      ) {
        proof1.verify(vk1);
        proof2.verify(vk2);

        proof1.publicInput
          .add(proof2.publicInput.field1.add(proof2.publicInput.field2))
          .assertEquals(publicInput, 'PublicInput not matching');
      },
    },
  },
});

const sideloadedProgram2 = ZkProgram({
  name: 'sideloadedProgram2',
  publicInput: Field,
  methods: {
    recurseTwoSideloaded: {
      privateInputs: [
        SampleSideloadedProof,
        VerificationKey,
        SampleSideloadedProof2,
        VerificationKey,
      ],
      async method(
        publicInput: Field,
        proof1: SampleSideloadedProof,
        vk1: VerificationKey,
        proof2: SampleSideloadedProof2,
        vk2: VerificationKey
      ) {
        proof1.verify(vk1);
        proof2.verify(vk2);

        proof1.publicInput
          .add(proof2.publicInput.field1.add(proof2.publicInput.field2))
          .add(1)
          .assertEquals(publicInput, 'PublicInput not matching');
      },
    },
  },
});

export class SideloadedSmartContract extends SmartContract {
  @method async setValue(
    value: Field,
    proof: SampleSideloadedProof,
    vk: VerificationKey
  ) {
    proof.verify(vk);
    proof.publicInput.assertEquals(value);
  }
}

describe('sideloaded', async () => {
  let program1Vk = (await program1.compile()).verificationKey;
  let program2Vk = (await program2.compile()).verificationKey;

  // Generate sample proofs
  const { proof: program1Proof } = await program1.foo(Field(1), Field(1));
  const { proof: program2Proof } = await program2.foo(
    { field1: Field(1), field2: Field(2) },
    Field(3)
  );

  await sideloadedProgram.compile();

  it('should convert proof to DynamicProof', async () => {
    const proof = SampleSideloadedProof.fromProof(program1Proof);

    expect(proof instanceof DynamicProof).toBe(true);
    expect(proof instanceof SampleSideloadedProof).toBe(true);
    expect(proof.constructor.name).toStrictEqual(SampleSideloadedProof.name);
  });

  it('recurse one proof with zkprogram', async () => {
    const proof = SampleSideloadedProof.fromProof(program1Proof);

    const { proof: finalProof } = await sideloadedProgram.recurseOneSideloaded(
      Field(1),
      proof,
      program1Vk
    );

    expect(finalProof).toBeDefined();
    expect(finalProof.maxProofsVerified).toBe(2);
  });

  it('recurse two different proofs with zkprogram', async () => {
    const proof1 = SampleSideloadedProof.fromProof(program1Proof);
    const proof2 = SampleSideloadedProof2.fromProof(program2Proof);

    const finalProof = await sideloadedProgram.recurseTwoSideloaded(
      Field(4),
      proof1,
      program1Vk,
      proof2,
      program2Vk
    );

    expect(finalProof).toBeDefined();
  });

  it('should fail to prove with faulty vk', async () => {
    const proof1 = SampleSideloadedProof.fromProof(program1Proof);
    const proof2 = SampleSideloadedProof2.fromProof(program2Proof);

    // VK for proof2 wrong
    await expect(async () => {
      return await sideloadedProgram.recurseTwoSideloaded(
        Field(7),
        proof1,
        program1Vk,
        proof2,
        program1Vk
      );
    }).rejects.toThrow();
  });

  it('should work if SL Proof classes are used in different ZkPrograms', async () => {
    const proof1 = SampleSideloadedProof.fromProof(program1Proof);
    const proof2 = SampleSideloadedProof2.fromProof(program2Proof);

    await sideloadedProgram2.compile();

    const finalProof = await sideloadedProgram2.recurseTwoSideloaded(
      Field(5),
      proof1,
      program1Vk,
      proof2,
      program2Vk
    );
    expect(finalProof).toBeDefined();
  });

  it('different proof classes should have different tags', async () => {
    const tag1 = SampleSideloadedProof.tag();
    const tag2 = SampleSideloadedProof2.tag();

    expect(tag1).not.toStrictEqual(tag2);
  });

  it('should compile with SmartContracts', async () => {
    await SideloadedSmartContract.compile();
  });
});
