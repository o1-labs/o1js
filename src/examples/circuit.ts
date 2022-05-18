//  testing stuff inside circuits

import { Field, Circuit } from 'snarkyjs';

// this can't be used, because Circuit.witness can't be run outside a circuit:

// let x = Circuit.witness(Field, () => Field(5));
// let y = Circuit.witness(Field, () => Field(10));
// let z = x.mul(y);
// z.assertEquals(50);

// it's important to test in-circuit behavior though, because most of it is implemented differently than out-of-circuit
// to run it inside a circuit quickly, without creating a proof / compiling, we have Circuit.runAndCheck

// runs successfully
Circuit.runAndCheck(() => {
  let x = Circuit.witness(Field, () => Field(5));
  let y = Circuit.witness(Field, () => Field(10));
  let z = x.mul(y);

  z.assertEquals(50);
});

// fails, as expected, because the assertion fails
shouldFail(() =>
  Circuit.runAndCheck(() => {
    let x = Circuit.witness(Field, () => Field(5));
    let y = Circuit.witness(Field, () => Field(10));
    let z = x.mul(y);

    // TODO: this prints the failed comparison with console.log, it should be part of the error instead
    z.assertEquals(51);
  })
);

// TODO: put this in a test and use jest functions instead
function shouldFail(f: Function) {
  let fail = true;
  try {
    f();
    fail = false;
  } catch (err) {}
  if (fail === false) {
    throw Error('was expected to fail');
  }
}
