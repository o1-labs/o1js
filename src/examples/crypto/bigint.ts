import { Experimental, method, Provable, SmartContract, state, State } from 'o1js';

const { createProvableBigInt } = Experimental;

// p = 13
class BigInt13 extends createProvableBigInt(13n) {}

let x = BigInt13.fromBigInt(12n);
let y = BigInt13.fromBigInt(-1n); // from methods reduce inputs with modulo p
let z = BigInt13.fromBigInt(1n);

x.assertEquals(y); // 12 = -1 (mod 13)
x.mul(x).assertEquals(z); // 12 * 12 = 11 * 13 + 1 = 1 (mod 13)
x.div(z).assertEquals(x); // 12 / 1 = 12 (mod 13)

// p = BLS12_381 Base Field Modulus
class bls12_381 extends createProvableBigInt(
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn
) {}

let a = bls12_381.max();
let b = bls12_381.one();
let c = bls12_381.zero();

a.add(b).assertEquals(c); // a + b = 0 (mod p)
a.mul(c).assertEquals(c); // a * 0 = 0 (mod p)
a.pow(c).assertEquals(b); // a^0 = 1 (mod p)

// p = brainpoolP512r1 Base Field Modulus
class brainpoolP512r1 extends createProvableBigInt(
  0xaadd9db8dbe9c48b3fd4e6ae33c9fc07cb308db3b3c9d20ed6639cca703308717d4d9b009bc66842aecda12ae6a380e62881ff2f2d82c68528aa6056583a48f3n
) {}

let p = brainpoolP512r1.max();
let t = brainpoolP512r1.one();
let k = brainpoolP512r1.zero();

p.inverse().mul(p).assertEquals(t); // p^-1 * p = 1 (mod p)
t.negate().assertEquals(p); // additive inverse of 1 is equals to p - 1 (mod p)
p.add(t).assertEquals(k); // p-1 + 1 = 0 (mod p)

class TestContract extends SmartContract {
  @state(BigInt13) x = State<BigInt13>();

  @method async testMethod(y: BigInt13) {
    let x = y.inverse();
    Provable.log(x);
    this.x.set(x);
  }
}

await TestContract.analyzeMethods(); // constraints are generated properly
