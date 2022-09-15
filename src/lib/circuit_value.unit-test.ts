import { Field, isReady, shutdown } from '../snarky.js';
import { circuitValue } from './circuit_value.js';
import { UInt32, Int64 } from './int.js';
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

// toFields
let fields = type.toFields(value);
expect(fields).toEqual([Field.zero, Field.zero, Field.one, Field(2)]);

// toAuxiliary
let aux = type.toAuxiliary(value);
expect(aux).toEqual([[[1], []], 'arbitrary data!!!', [], [[], []]]);

// fromFields
let restored = type.fromFields(fields, aux);
expect(JSON.stringify(restored)).toEqual(original);

// toJSON
expect(type.toJSON(value)).toEqual({
  nested: { a: 1, b: null },
  other: 'arbitrary data!!!',
  pk: PublicKey.toBase58(PublicKey.empty()),
  uint: ['1', '2'],
});

shutdown();
