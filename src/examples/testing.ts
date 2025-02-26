import { Experimental, Field } from 'o1js';

const { Testing } = Experimental;

Testing.test(Testing.Random.nat(1000), (n, assert) => {
  assert(Field(n).toString() === String(n));
});
