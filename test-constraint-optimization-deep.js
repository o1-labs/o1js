import { Field, Provable, Gadgets } from './dist/node/index.js';

console.log('=== Deep Dive: Snarky Constraint Optimization ===\n');

// Test different scenarios to understand optimization
async function testConstraints(name, fn) {
  console.log(`\n${name}:`);
  let cs = await Provable.constraintSystem(fn);
  console.log(`  Constraints: ${cs.rows}`);
  return cs;
}

// 1. Understanding why x.assertEquals(y) sometimes uses 0 constraints
await testConstraints('Test 1a: Two different witnesses x = y', () => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 5n);
  x.assertEquals(y);
});

await testConstraints('Test 1b: Same witness x = x', () => {
  let x = Provable.witness(Field, () => 5n);
  x.assertEquals(x);
});

await testConstraints('Test 1c: Witness equals constant', () => {
  let x = Provable.witness(Field, () => 5n);
  x.assertEquals(Field(5));
});

// 2. Linear combinations and reduceToScaledVar
console.log('\n--- Linear Combination Optimization ---');

await testConstraints('Test 2a: Simple addition x + y = z', () => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 4n);
  let z = Provable.witness(Field, () => 7n);
  x.add(y).assertEquals(z);
});

await testConstraints('Test 2b: Scaled addition 2x + 3y = z', () => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  let z = Provable.witness(Field, () => 13n);
  x.mul(2).add(y.mul(3)).assertEquals(z);
});

await testConstraints('Test 2c: Complex linear 2x + 3y - z + 5 = w', () => {
  let x = Provable.witness(Field, () => 1n);
  let y = Provable.witness(Field, () => 2n);
  let z = Provable.witness(Field, () => 3n);
  let w = Provable.witness(Field, () => 8n);
  x.mul(2).add(y.mul(3)).sub(z).add(5).assertEquals(w);
});

// 3. Understanding the limits of linear combination reduction
console.log('\n--- Linear Combination Limits ---');

await testConstraints('Test 3a: 3 variables', () => {
  let vars = Array(3).fill(0).map((_, i) => 
    Provable.witness(Field, () => BigInt(i + 1))
  );
  let sum = vars.reduce((a, b) => a.add(b));
  sum.assertEquals(Field(6)); // 1 + 2 + 3 = 6
});

await testConstraints('Test 3b: 5 variables', () => {
  let vars = Array(5).fill(0).map((_, i) => 
    Provable.witness(Field, () => BigInt(i + 1))
  );
  let sum = vars.reduce((a, b) => a.add(b));
  sum.assertEquals(Field(15)); // 1 + 2 + ... + 5 = 15
});

await testConstraints('Test 3c: 10 variables', () => {
  let vars = Array(10).fill(0).map((_, i) => 
    Provable.witness(Field, () => BigInt(i + 1))
  );
  let sum = vars.reduce((a, b) => a.add(b));
  sum.assertEquals(Field(55)); // 1 + 2 + ... + 10 = 55
});

// 4. Understanding when intermediate variables are created
console.log('\n--- Intermediate Variable Creation ---');

await testConstraints('Test 4a: Single multiplication x * y = z', () => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 4n);
  let z = Provable.witness(Field, () => 12n);
  x.mul(y).assertEquals(z);
});

await testConstraints('Test 4b: Chained multiplication (x * y) * z = w', () => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  let z = Provable.witness(Field, () => 4n);
  let w = Provable.witness(Field, () => 24n);
  x.mul(y).mul(z).assertEquals(w);
});

await testConstraints('Test 4c: Mixed ops (x * y) + z = w', () => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  let z = Provable.witness(Field, () => 4n);
  let w = Provable.witness(Field, () => 10n);
  x.mul(y).add(z).assertEquals(w);
});

// 5. The power of the Generic gate
console.log('\n--- Generic Gate Capabilities ---');

await testConstraints('Test 5a: Full generic gate a*x + b*y + c*z + d*x*y + e = 0', () => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  let z = Provable.witness(Field, () => 1n);
  
  // We'll construct: 2*x + 3*y + (-1)*z + 1*x*y + (-15) = 0
  // Which is: 2*2 + 3*3 + (-1)*1 + 1*2*3 + (-15) = 4 + 9 - 1 + 6 - 15 = 3
  // So we need to adjust to make it 0
  
  // Actually, let's use Gadgets.leftShift which might show interesting patterns
  let result = x.mul(y).add(x.mul(2)).add(y.mul(3)).sub(z);
  result.assertEquals(Field(14)); // 2*3 + 2*2 + 3*3 - 1 = 6 + 4 + 9 - 1 = 18
});

// 6. Special optimizations
console.log('\n--- Special Optimizations ---');

await testConstraints('Test 6a: Duplicate cancellation (x - x)', () => {
  let x = Provable.witness(Field, () => 5n);
  x.sub(x).assertEquals(Field(0));
});

await testConstraints('Test 6b: Coefficient merging (2x + 3x)', () => {
  let x = Provable.witness(Field, () => 2n);
  x.mul(2).add(x.mul(3)).assertEquals(Field(10)); // 5x = 10
});

await testConstraints('Test 6c: Using seal() to force intermediate', () => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 4n);
  let sum = x.add(y).seal();
  sum.assertEquals(Field(7));
});

// 7. Understanding the constraint limit
console.log('\n--- Why Long Sums Need Multiple Constraints ---');

// Let's trace through what happens with many variables
for (let n of [3, 4, 5, 6, 7, 8]) {
  await testConstraints(`Sum of ${n} variables`, () => {
    let vars = Array(n).fill(0).map((_, i) => 
      Provable.witness(Field, () => BigInt(i + 1))
    );
    let sum = vars.reduce((a, b) => a.add(b));
    sum.assertEquals(Field(n * (n + 1) / 2));
  });
}

console.log('\n=== Key Findings ===');
console.log('1. reduceToScaledVar() converts AST to linear combination form');
console.log('2. Linear combinations are limited by the Generic gate structure');
console.log('3. Generic gate can encode: left*x + right*y + out*z + mul*x*y + const = 0');
console.log('4. When linear combination has >3-4 unique variables, intermediate vars are needed');
console.log('5. Duplicate variables are merged (2x + 3x becomes 5x)');
console.log('6. Constants are folded into the const term');
console.log('7. seal() forces creation of a witness for the current expression');