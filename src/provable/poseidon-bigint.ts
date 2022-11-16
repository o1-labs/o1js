import { Field as FieldSnarky } from '../snarky.js';
import { Poseidon as PoseidonSnarky } from '../lib/hash.js';
import { Field } from './field-bigint.js';

export { Poseidon };

const Poseidon = {
  update(state: [Field, Field, Field], input: Field[]): [Field, Field, Field] {
    let stateSnarky = state.map(FieldSnarky) as [
      FieldSnarky,
      FieldSnarky,
      FieldSnarky
    ];
    let inputSnarky = input.map(FieldSnarky);
    let [s1, s2, s3] = PoseidonSnarky.update(stateSnarky, inputSnarky).map(
      (x) => x.toBigInt()
    );
    return [Field(s1), Field(s2), Field(s3)];
  },
};
