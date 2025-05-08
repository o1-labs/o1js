import { it } from 'node:test';
import { Provable } from '../provable.js';
import { Field } from '../field.js';
import { expect } from 'expect';
import { exists } from '../core/exists.js';

await it('can witness large field array', async () => {
  let N = 100_000;
  let arr = Array<bigint>(N).fill(0n);

  await Provable.runAndCheck(() => {
    // with exists
    let fields = exists(N, () => arr);

    // with Provable.witness
    let fields2 = Provable.witness(Provable.Array(Field, N), () => arr.map(Field.from));

    expect(fields.length).toEqual(N);
    expect(fields2.length).toEqual(N);
  });
});
