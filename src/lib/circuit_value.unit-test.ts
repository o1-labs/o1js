import { Circuit, Field, isReady, shutdown } from '../snarky.js';
import { circuitValue } from './circuit_value.js';
import { UInt32 } from './int.js';
import { PublicKey } from './signature.js';
import { expect } from 'expect';

await isReady;

// note the alphabetical ordering
let type = circuitValue({
  nested: { a: Number, b: undefined },
  other: String,
  pk: PublicKey,
  uint: [UInt32, UInt32],
});

let value = {
  nested: { a: 1, b: undefined },
  other: 'arbitrary data!!!',
  pk: PublicKey.empty(),
  uint: [UInt32.one, UInt32.from(2)],
};
let original = JSON.stringify(value);

// sizeInFields
expect(type.sizeInFields()).toEqual(4);

// toFields
let fields = type.toFields(value);
expect(fields).toEqual([Field.zero, Field.zero, Field.one, Field(2)]);

// toAuxiliary
let aux = type.toAuxiliary(value);
expect(aux).toEqual([[[1], []], ['arbitrary data!!!'], [], [[], []]]);

// toInput
let input = type.toInput(value);
expect(input).toEqual({
  fields: [Field.zero],
  packed: [
    [Field.zero, 1],
    [Field.one, 32],
    [Field(2), 32],
  ],
});

// toJSON
expect(type.toJSON(value)).toEqual({
  nested: { a: 1, b: null },
  other: 'arbitrary data!!!',
  pk: PublicKey.toBase58(PublicKey.empty()),
  uint: ['1', '2'],
});

// fromFields
let restored = type.fromFields(fields, aux);
expect(JSON.stringify(restored)).toEqual(original);

// check
Circuit.runAndCheck(() => {
  type.check(value);
});

shutdown();
