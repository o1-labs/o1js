import { Field } from './core.js';
import { Struct } from './circuit_value.js';
import { UInt64 } from './int.js';
import { ZkProgram } from './proof_system.js';
import { expect } from 'expect';

const EmptyProgram = ZkProgram({
  publicInput: Field,
  methods: {
    run: {
      privateInputs: [],
      method: (publicInput: Field) => {},
    },
  },
});

const emptyMethodsMetadata = EmptyProgram.analyzeMethods();
emptyMethodsMetadata.forEach((methodMetadata) => {
  expect(methodMetadata).toEqual({
    rows: 0,
    digest: '4f5ddea76d29cfcfd8c595f14e31f21b',
    result: undefined,
    gates: [],
    publicInputSize: 0,
  });
});

class CounterPublicInput extends Struct({
  current: UInt64,
  updated: UInt64,
}) {}
const CounterProgram = ZkProgram({
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

const incrementMethodMetadata = CounterProgram.analyzeMethods()[0];
expect(incrementMethodMetadata).toEqual(
  expect.objectContaining({
    rows: 18,
    digest: '62d893f727b12d540bdc483427cbd70b',
  })
);
