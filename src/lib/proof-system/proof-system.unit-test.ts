import { Field, Bool } from '../provable/wrapped.js';
import { Struct } from '../provable/types/struct.js';
import { UInt64 } from '../provable/int.js';
import {
  CompiledTag,
  Empty,
  Void,
  ZkProgram,
  picklesRuleFromFunction,
  sortMethodArguments,
} from './zkprogram.js';
import { Proof } from './proof.js';
import { expect } from 'expect';
import { Pickles, Snarky } from '../../snarky.js';
import { AnyFunction } from '../util/types.js';
import { snarkContext } from '../provable/core/provable-context.js';
import { it } from 'node:test';
import { Provable } from '../provable/provable.js';
import { bool, equivalentAsync, field, record } from '../testing/equivalent.js';
import { FieldVar, FieldConst } from '../provable/core/fieldvar.js';
import { ProvablePure } from '../provable/types/provable-intf.js';

const EmptyProgram = ZkProgram({
  name: 'empty',
  publicInput: Field,
  methods: { run: { privateInputs: [], async method(_) {} } },
});

class EmptyProof extends EmptyProgram.Proof {}

// unit-test zkprogram creation helpers:
// -) sortMethodArguments
// -) picklesRuleFromFunction

it('pickles rule creation', async () => {
  // a rule that verifies a proof conditionally, and returns the proof's input as output
  function main(proof: EmptyProof, shouldVerify: Bool) {
    proof.verifyIf(shouldVerify);
    return {
      publicOutput: proof.publicInput,
    };
  }
  let privateInputs = [EmptyProof, Bool];

  // collect method interface
  let methodIntf = sortMethodArguments(
    'mock',
    'main',
    privateInputs,
    undefined,
    Proof
  );

  expect(methodIntf).toEqual({
    methodName: 'main',
    args: [EmptyProof, Bool],
  });

  // store compiled tag
  CompiledTag.store(EmptyProgram, 'mock tag');

  // create pickles rule
  let rule: Pickles.Rule = picklesRuleFromFunction(
    Empty as ProvablePure<any>,
    Field as ProvablePure<any>,
    main as AnyFunction,
    { name: 'mock' },
    methodIntf,
    [],
    [EmptyProof]
  );

  await equivalentAsync(
    { from: [field, bool], to: record({ field, bool }) },
    { runs: 5 }
  )(
    (field, bool) => ({ field, bool }),
    async (field, bool) => {
      let dummy = await EmptyProof.dummy(field, undefined, 0);
      let field_: FieldConst = [0, 0n];
      let bool_: FieldConst = [0, 0n];

      await Provable.runAndCheck(async () => {
        // put witnesses in snark context
        snarkContext.get().witnesses = [dummy, bool];

        // call pickles rule
        let {
          publicOutput: [, publicOutput],
          shouldVerify: [, shouldVerify],
        } = await rule.main([0]);

        // `publicOutput` and `shouldVerify` are as expected
        Snarky.field.assertEqual(publicOutput, dummy.publicInput.value);
        Snarky.field.assertEqual(shouldVerify, bool.value);

        Provable.asProver(() => {
          field_ = Snarky.field.readVar(publicOutput);
          bool_ = Snarky.field.readVar(shouldVerify);
        });
      });

      return { field: Field(field_), bool: Bool(FieldVar.constant(bool_)) };
    }
  );
});

class NestedProof extends Struct({ proof: EmptyProof, field: Field }) {}
const NestedProof2 = Provable.Array(NestedProof, 2);

// type inference
NestedProof satisfies Provable<{ proof: Proof<Field, void>; field: Field }>;

it('pickles rule creation: nested proof', async () => {
  function main([first, _second]: [NestedProof, NestedProof]) {
    // first proof should verify, second should not
    first.proof.verify();

    // deep type inference
    first.proof.publicInput satisfies Field;
    first.proof.publicOutput satisfies void;
  }

  // collect method interface
  let methodIntf = sortMethodArguments(
    'mock',
    'main',
    [NestedProof2],
    undefined,
    Proof
  );

  expect(methodIntf).toEqual({
    methodName: 'main',
    args: [NestedProof2],
  });

  // store compiled tag
  CompiledTag.store(EmptyProgram, 'mock tag');

  // create pickles rule
  let rule: Pickles.Rule = picklesRuleFromFunction(
    Empty as ProvablePure<any>,
    Void as ProvablePure<any>,
    main as AnyFunction,
    { name: 'mock' },
    methodIntf,
    [],
    [EmptyProof, EmptyProof]
  );

  let dummy = await EmptyProof.dummy(Field(0), undefined, 0);
  let nested1 = new NestedProof({ proof: dummy, field: Field(0) });
  let nested2 = new NestedProof({ proof: dummy, field: Field(0) });
  let nested = [nested1, nested2];

  await Provable.runAndCheck(async () => {
    // put witnesses in snark context
    snarkContext.get().witnesses = [nested];

    // call pickles rule
    let {
      shouldVerify: [, shouldVerify1, shouldVerify2],
      previousStatements: [, ...previousStatements],
    } = await rule.main([0]);

    expect(previousStatements.length).toBe(2);

    // `shouldVerify` are as expected
    expect(Bool(shouldVerify1).isConstant()).toBe(true);
    expect(Bool(shouldVerify2).isConstant()).toBe(true);
    // first proof should verify, second should not
    Bool(shouldVerify1).assertTrue();
    Bool(shouldVerify2).assertFalse();
  });
});

it('fails with more than two (nested) proofs', async () => {
  expect(() => {
    sortMethodArguments(
      'mock',
      'main',
      [NestedProof2, NestedProof],
      undefined,
      Proof
    );
  }).toThrowError('mock.main() has more than two proof arguments');
});

// compile works with large inputs

const N = 100_000;

const program = ZkProgram({
  name: 'large-array-program',
  methods: {
    baseCase: {
      privateInputs: [Provable.Array(Field, N)],
      async method(_: Field[]) {},
    },
  },
});

it('can compile program with large input', async () => {
  await program.compile();
});

// regression tests for some zkprograms
const emptyMethodsMetadata = await EmptyProgram.analyzeMethods();
expect(emptyMethodsMetadata.run).toEqual(
  expect.objectContaining({
    rows: 0,
    digest: '4f5ddea76d29cfcfd8c595f14e31f21b',
    gates: [],
    publicInputSize: 0,
  })
);

class CounterPublicInput extends Struct({
  current: UInt64,
  updated: UInt64,
}) {}
const CounterProgram = ZkProgram({
  name: 'counter',
  publicInput: CounterPublicInput,
  methods: {
    increment: {
      privateInputs: [UInt64],
      async method(
        { current, updated }: CounterPublicInput,
        incrementBy: UInt64
      ) {
        const newCount = current.add(incrementBy);
        newCount.assertEquals(updated);
      },
    },
  },
});

const incrementMethodMetadata = (await CounterProgram.analyzeMethods())
  .increment;
expect(incrementMethodMetadata).toEqual(expect.objectContaining({ rows: 18 }));
