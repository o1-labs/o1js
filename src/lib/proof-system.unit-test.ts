import { Field, Bool } from './core.js';
import { Struct } from './circuit-value.js';
import { UInt64 } from './int.js';
import {
  CompiledTag,
  Empty,
  Proof,
  ZkProgram,
  picklesRuleFromFunction,
  sortMethodArguments,
} from './proof-system.js';
import { expect } from 'expect';
import { Pickles, ProvablePure, Snarky } from '../snarky.js';
import { AnyFunction } from './util/types.js';
import { snarkContext } from './provable-context.js';
import { it } from 'node:test';
import { Provable } from './provable.js';
import { bool, equivalentAsync, field, record } from './testing/equivalent.js';
import { FieldConst, FieldVar } from './field.js';

const EmptyProgram = ZkProgram({
  name: 'empty',
  publicInput: Field,
  methods: { run: { privateInputs: [], method: (_) => {} } },
});

class EmptyProof extends ZkProgram.Proof(EmptyProgram) {}

// unit-test zkprogram creation helpers:
// -) sortMethodArguments
// -) picklesRuleFromFunction

it('pickles rule creation', async () => {
  // a rule that verifies a proof conditionally, and returns the proof's input as output
  function main(proof: EmptyProof, shouldVerify: Bool) {
    proof.verifyIf(shouldVerify);
    return proof.publicInput;
  }
  let privateInputs = [EmptyProof, Bool];

  // collect method interface
  let methodIntf = sortMethodArguments('mock', 'main', privateInputs, Proof);

  expect(methodIntf).toEqual({
    methodName: 'main',
    witnessArgs: [Bool],
    proofArgs: [EmptyProof],
    allArgs: [
      { type: 'proof', index: 0 },
      { type: 'witness', index: 0 },
    ],
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
    []
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

      Provable.runAndCheck(() => {
        // put witnesses in snark context
        snarkContext.get().witnesses = [dummy, bool];

        // call pickles rule
        let {
          publicOutput: [, publicOutput],
          shouldVerify: [, shouldVerify],
        } = rule.main([0]);

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

// compile works with large inputs

const N = 100_000;

const program = ZkProgram({
  name: 'large-array-program',
  methods: {
    baseCase: {
      privateInputs: [Provable.Array(Field, N)],
      method(_: Field[]) {},
    },
  },
});

it('can compile program with large input', async () => {
  await program.compile();
});

// regression tests for some zkprograms
const emptyMethodsMetadata = EmptyProgram.analyzeMethods();
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
      method: (
        { current, updated }: CounterPublicInput,
        incrementBy: UInt64
      ) => {
        const newCount = current.add(incrementBy);
        newCount.assertEquals(updated);
      },
    },
  },
});

const incrementMethodMetadata = CounterProgram.analyzeMethods().increment;
expect(incrementMethodMetadata).toEqual(expect.objectContaining({ rows: 18 }));
