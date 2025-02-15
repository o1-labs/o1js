import assert from 'assert';
import { Experimental, method, Provable, Scalar, SmartContract, state, State } from 'o1js';

const { createProvableBigInt } = Experimental;

// Let's create a small finite field: F_17

class SmallField extends createProvableBigInt(97n) {}

let x = SmallField.fromBigint(16n);
x.assertEquals(SmallField.fromBigint(-1n)); // 16 = -1 (mod 17)
x.mul(x).assertEquals(SmallField.fromBigint(1n)); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)

// most arithmetic operations return "unreduced" fields, i.e., fields that could be larger than the modulus:

let z = x.add(x);
assert(z instanceof SmallField);

z.add(SmallField.one()).sub(x).assertEquals(SmallField.zero()); // works

class MyContract extends SmartContract {
  @state(SmallField) x = State<SmallField>();

  @method async myMethod(y: SmallField) {
    let x = y.mul(SmallField.fromBigint(3n));
    Provable.log(x);
    this.x.set(x);
  }
}
await MyContract.analyzeMethods(); // works

// btw - we support any finite field up to 259 bits. for example, the seqp256k1 base field:
let Fseqp256k1 = createProvableBigInt((1n << 256n) - (1n << 32n) - 0b1111010001n);

// or the Pallas scalar field, to do arithmetic on scalars:
let Fq = createProvableBigInt(Scalar.ORDER);
