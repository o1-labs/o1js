import { Experimental } from "o1js";

const { ProvableBigInt, createProvableBigInt } = Experimental;

const BigInt384 = createProvableBigInt(97n);

let a = BigInt384.fromBigint(1n);
let b = BigInt384.fromBigint(2n);
let c = a.add(b);

console.log(a.toBigint());
console.log(b.toBigint());
console.log(c.toBigint());


a = BigInt384.fromBigint(71n);
b = BigInt384.fromBigint(31n);
c = a.sub(b);

console.log(a.toBigint());
console.log(b.toBigint());
console.log(c.toBigint());

a = BigInt384.fromBigint(3n);
b = BigInt384.fromBigint(2n);
c = a.mul(b);

console.log(a.toBigint());
console.log(b.toBigint());
console.log(c.toBigint());

a = BigInt384.fromBigint(6n);
b = BigInt384.fromBigint(2n);
c = a.mul(b);

console.log(a.toBigint());
console.log(b.toBigint());
console.log(c.toBigint());

a = BigInt384.fromBigint(1n);
b = BigInt384.fromBigint(2n);
c = a.sqrt();

console.log(a.toBigint());
console.log(b.toBigint());
console.log(c.toBigint());
