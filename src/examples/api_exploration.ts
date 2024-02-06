import {
  Field,
  Bool,
  Group,
  Scalar,
  PrivateKey,
  PublicKey,
  Signature,
  Int64,
  Provable,
  Struct,
} from 'o1js';

/* This file demonstrates the classes and functions available in o1js */

/* # Field */

/* The most basic type is Field, which is an element of a prime order field.
   The field is the [Pasta Fp field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) 
   of order 28948022309329048855892746252171976963363056481941560715954676764349967630337 
*/

// You can initialize literal field elements with numbers, booleans, or decimal strings
const x0: Field = new Field('37');
// Typescript has type inference, so type annotations are usually optional.
let x1 = new Field(37);
console.assert(x0.equals(x1).toBoolean());

// The `new` keyword is optional as well:
x1 = Field(37);
console.assert(x0.equals(x1).toBoolean());

/* You can perform arithmetic operations on field elements.
   The arithmetic methods can take any "fieldy" values as inputs: 
   Field, number, string, or boolean 
*/
const b = Field(1);
const z = x0.mul(x1).add(b).div(234).square().neg().sub('67').add(0);

/* Field elements can be converted to their full, little endian binary representation. */
let bits: Bool[] = z.toBits();

/* If you know (or want to assert) that a field element fits in fewer bits, you can
   also unpack to a sequence of bits of a specified length. This is useful for doing
   range proofs for example. */
let smallFieldElt = new Field(23849);
let smallBits: Bool[] = smallFieldElt.toBits(32);
console.assert(smallBits.length === 32);

/* There are lots of other useful method on field elements, like comparison methods.
   Try right-clicking on the Field type, or and peeking the definition to see what they are.
  
   Or, you can look at the autocomplete list on a field element's methods. You can try typing
   
   z.

   to see the methods on `z : Field` for example.
*/

/* # Bool */

/* Another important type is Bool. The Bool type is the in-SNARK representation of booleans.
   They are different from normal booleans in that you cannot write an if-statement whose
   condition has type Bool. You need to use the Provable.if function, which is like a value-level
   if (or something like a ternary expression). We will see how that works in a little.
*/

/* Bool values can be initialized using booleans. */

const b0 = Bool(false);
const b1 = Bool(true);

/* There are a number of methods available on Bool, like `and`, `or`, and `not`. */
const b3: Bool = b0.and(b1.not()).or(b1);

/* The most important thing you can do with a Bool is use the `Provable.if` function
   to conditionally select a value.

   `Provable.if` has the type

   ```
   if<T>(
      b: Bool | boolean,
      x: T,
      y: T
   ): T
   ```

   `Provable.if(b, x, y)` evaluates to `x` if `b` is true, and evaluates to `y` if `b` is false,
   so it works like a ternary if expression `b ? x : y`.

   The generic type T can be instantiated to primitive types like Bool, Field, or Group, or
   compound types like arrays (as long as the lengths are equal) or objects (as long as the keys
   match).
*/

const v: Field = Provable.if(b0, x0, z);
/* b0 is false, so we expect v to be equal to z. */
console.assert(v.equals(z).toBoolean());

/* As mentioned, we can also use `Provable.if` with compound types. */
let CompoundType = Struct({
  foo: [Field, Field],
  bar: { x: Field, b: Bool },
});

const c = Provable.if(
  b1,
  CompoundType,
  { foo: [x0, z], bar: { x: x1, b: b1 } },
  { foo: [z, x0], bar: { x: z, b: b0 } }
);

console.assert(c.bar.x.equals(x1).toBoolean());

// Provable.switch is a generalization of Provable.if, for when you need to distinguish between multiple cases.
let x = Provable.switch([Bool(false), Bool(true), Bool(false)], Int64, [
  Int64.from(1),
  Int64.from(2),
  Int64.from(3),
]);
x.assertEquals(Int64.from(2));

/* # Signature
 */

/* The standard library of o1js comes with a Signature scheme.
   The message to be signed is an array of field elements, so any application level
   message data needs to be encoded as an array of field elements before being signed.
*/

let privKey: PrivateKey = PrivateKey.random();
let pubKey: PublicKey = PublicKey.fromPrivateKey(privKey);

let msg0: Field[] = [0xba5eba11, 0x15, 0xbad].map((x) => new Field(x));
let msg1: Field[] = [0xfa1afe1, 0xc0ffee].map((x) => new Field(x));
let signature = Signature.create(privKey, msg0);

console.assert(signature.verify(pubKey, msg0).toBoolean());
console.assert(!signature.verify(pubKey, msg1).toBoolean());

/* # Group

  This type represents points on the [Pallas elliptic curve](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/).

  It is a prime-order curve defined by the equation
  
  y^2 = x^3 + 5
*/

/* You can initialize elements as literals as follows: */
let g0 = Group.from(-1, 2);
let g1 = new Group({ x: -1, y: 2 });

/* There is also a predefined generator. */
let g2 = Group.generator;

/* Points can be added, subtracted, and negated */
let g3 = g0.add(g1).neg().sub(g2);

/* Points can also be scaled by scalar field elements. Note that Field and Scalar
   are distinct and represent elements of distinct fields. */
let s0: Scalar = Scalar.random();
let g4: Group = g3.scale(s0);
