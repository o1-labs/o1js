/**
 * This example explores the ForeignField API!
 *
 * We shed light on the subtleties of different variants of foreign field:
 * Unreduced, AlmostReduced, and Canonical.
 */
import assert from 'assert';
import {
  createForeignField,
  AlmostForeignField,
  CanonicalForeignField,
  Scalar,
  SmartContract,
  method,
  Provable,
  state,
  State,
} from 'o1js';

// Let's create a small finite field: F_17

class SmallField extends createForeignField(17n) {}

let x = SmallField.from(16);
x.assertEquals(-1); // 16 = -1 (mod 17)
x.mul(x).assertEquals(1); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)

// most arithmetic operations return "unreduced" fields, i.e., fields that could be larger than the modulus:

let z = x.add(x);
assert(z instanceof SmallField.Unreduced);

// note: "unreduced" doesn't usually mean that the underlying witness is larger than the modulus.
// it just means we haven't _proved_ so.. which means a malicious prover _could_ have managed to make it larger.

// unreduced fields can be added and subtracted, but not be used in multiplcation:

z.add(1).sub(x).assertEquals(0); // works

assert((z as any).mul === undefined); // z.mul() is not defined
assert((z as any).inv === undefined);
assert((z as any).div === undefined);

// to do multiplication, you need "almost reduced" fields:

let y: AlmostForeignField = z.assertAlmostReduced(); // adds constraints to prove that z is, in fact, reduced
assert(y instanceof SmallField.AlmostReduced);

y.mul(y).assertEquals(4); // y.mul() is defined
assert(y.mul(y) instanceof SmallField.Unreduced); // but y.mul() returns an unreduced field again

y.inv().mul(y).assertEquals(1); // y.inv() is defined (and returns an AlmostReduced field!)

// to do many multiplications, it's more efficient to reduce fields in batches of 3 elements:
// (in fact, asserting that 3 elements are reduced is almost as cheap as asserting that 1 element is reduced)

let z1 = y.mul(7);
let z2 = y.add(11);
let z3 = y.sub(13);

let [z1r, z2r, z3r] = SmallField.assertAlmostReduced(z1, z2, z3);

z1r.mul(z2r);
z2r.div(z3r);

// here we get to the reason _why_ we have different variants of foreign fields:
// always proving that they are reduced after every operation would be super inefficient!

// fields created from constants are already reduced -- in fact, they are _fully reduced_ or "canonical":

let constant: CanonicalForeignField = SmallField.from(1);
assert(constant instanceof SmallField.Canonical);

SmallField.from(10000n) satisfies CanonicalForeignField; // works because `from()` takes the input mod p
SmallField.from(-1) satisfies CanonicalForeignField; // works because `from()` takes the input mod p

// canonical fields are a special case of almost reduced fields at the type level:
constant satisfies AlmostForeignField;
constant.mul(constant);

// the cheapest way to prove that an existing field element is canonical is to show that it is equal to a constant:

let u = z.add(x);
let uCanonical = u.assertEquals(-3);
assert(uCanonical instanceof SmallField.Canonical);

// to use the different variants of foreign fields as smart contract inputs, you might want to create a class for them:
class AlmostSmallField extends SmallField.AlmostReduced {}

class MyContract extends SmartContract {
  @state(AlmostSmallField) x = State<AlmostSmallField>();

  @method async myMethod(y: AlmostSmallField) {
    let x = y.mul(2);
    Provable.log(x);
    this.x.set(x.assertAlmostReduced());
  }
}
await MyContract.analyzeMethods(); // works

// btw - we support any finite field up to 259 bits. for example, the seqp256k1 base field:
let Fseqp256k1 = createForeignField((1n << 256n) - (1n << 32n) - 0b1111010001n);

// or the Pallas scalar field, to do arithmetic on scalars:
let Fq = createForeignField(Scalar.ORDER);

// also, you can use a number that's not a prime.
// for example, you might want to create a UInt256 type:
let UInt256 = createForeignField(1n << 256n);

// and now you can do arithmetic modulo 2^256!
let a = UInt256.from(1n << 255n);
let b = UInt256.from((1n << 255n) + 7n);
a.add(b).assertEquals(7);

// have fun proving finite field algorithms!
