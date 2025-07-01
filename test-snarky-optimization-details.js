import { Field, Provable } from './dist/node/index.js';

console.log('=== Detailed Snarky Optimization Analysis ===\n');

// Helper to analyze constraint systems
async function analyzeConstraints(name, fn) {
  console.log(`\n--- ${name} ---`);
  
  // First, let's see what variables are created
  let vars = [];
  let cs = await Provable.constraintSystem(() => {
    Provable.asProver(() => {
      vars = [];
    });
    fn((name) => {
      let v = Provable.witness(Field, () => 1n);
      Provable.asProver(() => {
        vars.push({ name, value: v });
      });
      return v;
    });
  });
  
  console.log(`Total constraints: ${cs.rows}`);
  console.log(`Public inputs: ${cs.publicInputSize}`);
  
  // Try to get more info
  try {
    let json = cs.toJson();
    let parsed = JSON.parse(json);
    console.log(`Variables: ${parsed.variables?.length || 'unknown'}`);
    if (parsed.gates) {
      console.log(`Gates: ${parsed.gates.length}`);
      // Show first few gates
      parsed.gates.slice(0, 3).forEach((gate, i) => {
        console.log(`  Gate ${i}: ${gate.type || 'Generic'}`);
      });
    }
  } catch (e) {
    console.log('Could not parse constraint system JSON');
  }
}

// Test 1: Direct equality between witnesses
await analyzeConstraints('Direct equality: x = y', (witness) => {
  let x = witness('x');
  let y = witness('y');
  x.assertEquals(y);
});

// Test 2: Why does this use 0 constraints?
await analyzeConstraints('Same variable equality: x = x', (witness) => {
  let x = witness('x');
  x.assertEquals(x);
});

// Test 3: Linear combination with many terms
await analyzeConstraints('Many terms: a+b+c+d+e = f', (witness) => {
  let a = witness('a');
  let b = witness('b');
  let c = witness('c');
  let d = witness('d');
  let e = witness('e');
  let f = witness('f');
  a.add(b).add(c).add(d).add(e).assertEquals(f);
});

// Test 4: Let's trace through reduceToScaledVar
console.log('\n=== Understanding reduceToScaledVar ===');
await Provable.runAndCheck(() => {
  let x = Provable.witness(Field, () => 2n);
  let y = Provable.witness(Field, () => 3n);
  
  // Build up a complex expression
  let expr = x.mul(2).add(y.mul(3)).add(5);
  
  console.log('\nExpression: 2*x + 3*y + 5');
  console.log('This builds an AST: Add(Add(Scale(2, x), Scale(3, y)), Constant(5))');
  
  // When we call assertEquals, it will call reduceToScaledVar
  expr.assertEquals(Field(15)); // 2*2 + 3*3 + 5 = 15
});

// Test 5: Understanding constraint generation for different gate types
console.log('\n=== Gate Type Analysis ===');

await analyzeConstraints('Generic gate: x*y + z = w', (witness) => {
  let x = witness('x');
  let y = witness('y');  
  let z = witness('z');
  let w = witness('w');
  // This should create: x*y + z - w = 0
  x.mul(y).add(z).assertEquals(w);
});

await analyzeConstraints('Multiple multiplications', (witness) => {
  let a = witness('a');
  let b = witness('b');
  let c = witness('c');
  let d = witness('d');
  // (a * b) + (c * d) = 10
  a.mul(b).add(c.mul(d)).assertEquals(10);
});

// Test 6: Why does long linear combination use more constraints?
console.log('\n=== Long Linear Combination Analysis ===');

for (let n of [5, 10, 15, 20]) {
  await analyzeConstraints(`Sum of ${n} variables`, (witness) => {
    let vars = [];
    for (let i = 0; i < n; i++) {
      vars.push(witness(`v${i}`));
    }
    let sum = vars[0];
    for (let i = 1; i < n; i++) {
      sum = sum.add(vars[i]);
    }
    sum.assertEquals(Field(n * (n + 1) / 2));
  });
}

// Test 7: Understanding when intermediate variables are created
console.log('\n=== Intermediate Variable Creation ===');

await analyzeConstraints('No intermediate vars needed', (witness) => {
  let a = witness('a');
  let b = witness('b');
  let c = witness('c');
  // Single constraint: a + b - c = 0
  a.add(b).assertEquals(c);
});

await analyzeConstraints('Intermediate var for nested mul', (witness) => {
  let a = witness('a');
  let b = witness('b');
  let c = witness('c');
  let d = witness('d');
  // Should create: tmp = a*b, then tmp*c = d
  a.mul(b).mul(c).assertEquals(d);
});

// Test 8: Edge cases
console.log('\n=== Edge Cases ===');

await analyzeConstraints('All constants', (witness) => {
  Field(5).add(Field(3)).assertEquals(Field(8));
});

await analyzeConstraints('Mixed constant/variable', (witness) => {
  let x = witness('x');
  x.add(5).mul(2).assertEquals(Field(16)); // (x + 5) * 2 = 16, so x = 3
});

console.log('\n=== Key Insights ===');
console.log('1. assertEqual between same variable (x = x) generates 0 constraints (optimized away)');
console.log('2. Linear combinations are collapsed into single constraints when possible');
console.log('3. Long linear combinations may need intermediate variables due to limits');
console.log('4. Multiplication always creates constraints, but can be combined with linear ops');
console.log('5. The Generic gate can encode: left*x + right*y + out*z + mul*x*y + const = 0');