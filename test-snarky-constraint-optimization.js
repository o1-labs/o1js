import { Field, Provable } from './dist/node/index.js';

console.log('=== Snarky Constraint Optimization Demo ===\n');

// Test 1: Simple equality - should use 1 constraint
console.log('Test 1: x.assertEquals(y)');
let cs1 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 5n);
  x.assertEquals(y);
});
console.log(`Constraints: ${cs1.rows}`);
console.log(`Expected: 1 (direct equality constraint)\n`);

// Test 2: Scaled equality - should still use 1 constraint
console.log('Test 2: (2*x).assertEquals(y)');
let cs2 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 10n);
  x.mul(2).assertEquals(y);
});
console.log(`Constraints: ${cs2.rows}`);
console.log(`Expected: 1 (2*x - y = 0)\n`);

// Test 3: Linear combination - should be optimized
console.log('Test 3: (x + y).assertEquals(z)');
let cs3 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 5n);
  let z = Provable.witness(Field, () => 8n);
  x.add(y).assertEquals(z);
});
console.log(`Constraints: ${cs3.rows}`);
console.log(`Expected: 1 (x + y - z = 0)\n`);

// Test 4: More complex linear combination
console.log('Test 4: (a + b + c).assertEquals(d)');
let cs4 = await Provable.constraintSystem(() => {
  let a = Provable.witness(Field, () => 1n);
  let b = Provable.witness(Field, () => 2n);
  let c = Provable.witness(Field, () => 3n);
  let d = Provable.witness(Field, () => 6n);
  a.add(b).add(c).assertEquals(d);
});
console.log(`Constraints: ${cs4.rows}`);
console.log(`Expected: 1 (a + b + c - d = 0)\n`);

// Test 5: Very complex linear combination
console.log('Test 5: (2*a + 3*b - c + 5).assertEquals(d)');
let cs5 = await Provable.constraintSystem(() => {
  let a = Provable.witness(Field, () => 1n);
  let b = Provable.witness(Field, () => 2n);
  let c = Provable.witness(Field, () => 3n);
  let d = Provable.witness(Field, () => 10n); // 2*1 + 3*2 - 3 + 5 = 10
  a.mul(2).add(b.mul(3)).sub(c).add(5).assertEquals(d);
});
console.log(`Constraints: ${cs5.rows}`);
console.log(`Expected: 1 (2*a + 3*b - c - d + 5 = 0)\n`);

// Test 6: Multiplication requires more constraints
console.log('Test 6: (x * y).assertEquals(z)');
let cs6 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 4n);
  let z = Provable.witness(Field, () => 12n);
  x.mul(y).assertEquals(z);
});
console.log(`Constraints: ${cs6.rows}`);
console.log(`Expected: 1 (x*y - z = 0)\n`);

// Test 7: Nested multiplication
console.log('Test 7: (x * y * z).assertEquals(w)');
let cs7 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  let z = Provable.witness(Field, () => 4n);
  let w = Provable.witness(Field, () => 24n);
  x.mul(y).mul(z).assertEquals(w);
});
console.log(`Constraints: ${cs7.rows}`);
console.log(`Expected: 2 (tmp = x*y, then tmp*z - w = 0)\n`);

// Test 8: Mixed operations
console.log('Test 8: (x*y + z).assertEquals(w)');
let cs8 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  let z = Provable.witness(Field, () => 4n);
  let w = Provable.witness(Field, () => 10n);
  x.mul(y).add(z).assertEquals(w);
});
console.log(`Constraints: ${cs8.rows}`);
console.log(`Expected: 1 (x*y + z - w = 0)\n`);

// Test 9: Complex expression with seal()
console.log('Test 9: Complex with seal() - (x + y).seal()');
let cs9 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 5n);
  let sum = x.add(y).seal(); // Forces creation of a new variable
  sum.assertEquals(8);
});
console.log(`Constraints: ${cs9.rows}`);
console.log(`Expected: 2 (tmp = x + y, then tmp = 8)\n`);

// Test 10: reduceToScaledVar optimization
console.log('Test 10: Duplicate variables (x - x).assertEquals(0)');
let cs10 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 5n);
  x.sub(x).assertEquals(0);
});
console.log(`Constraints: ${cs10.rows}`);
console.log(`Expected: 0 (x - x collapses to constant 0)\n`);

// Test 11: Show how reduceToScaledVar works
console.log('Test 11: Linear combination reduction');
let cs11 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  // This creates: 2*x + 3*x + y = 5*x + y
  x.mul(2).add(x.mul(3)).add(y).assertEquals(13); // 5*2 + 3 = 13
});
console.log(`Constraints: ${cs11.rows}`);
console.log(`Expected: 1 (5*x + y - 13 = 0, coefficients combined)\n`);

// Test 12: Very long linear combination
console.log('Test 12: Long linear combination (10 terms)');
let cs12 = await Provable.constraintSystem(() => {
  let vars = [];
  for (let i = 0; i < 10; i++) {
    vars.push(Provable.witness(Field, () => BigInt(i + 1)));
  }
  // Sum: 1 + 2 + ... + 10 = 55
  let sum = vars[0];
  for (let i = 1; i < 10; i++) {
    sum = sum.add(vars[i]);
  }
  sum.assertEquals(55);
});
console.log(`Constraints: ${cs12.rows}`);
console.log(`Expected: 1 (all variables combined into single constraint)\n`);

console.log('=== Summary ===');
console.log('Snarky optimizations:');
console.log('1. reduceToScaledVar() collapses linear combinations');
console.log('2. Duplicate variables are eliminated (x - x = 0)');
console.log('3. Linear operations (add, sub, scale) create AST nodes, not constraints');
console.log('4. Constraints are only created when needed (mul, assertEquals, etc.)');
console.log('5. Complex linear combinations become single constraints');
console.log('6. seal() forces creation of intermediate variables');