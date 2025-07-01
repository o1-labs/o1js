import { Field, Provable, Snarky } from './dist/node/index.js';

console.log('=== Understanding Wire Optimization ===\n');

// Let's trace through what happens in assertEqual
async function analyzeAssertEqual(name, fn) {
  console.log(`\n${name}:`);
  
  let cs = await Provable.constraintSystem(() => {
    let result = fn();
    if (result) {
      console.log('  Inside constraint system:');
      console.log(`    Result: ${result.info || 'done'}`);
    }
  });
  
  console.log(`  Total constraints: ${cs.rows}`);
  
  // Try to understand the gates
  try {
    let json = cs.toJson();
    let parsed = JSON.parse(json);
    if (parsed.gates && parsed.gates.length > 0) {
      console.log(`  Gates created: ${parsed.gates.length}`);
      parsed.gates.forEach((gate, i) => {
        console.log(`    Gate ${i}: ${JSON.stringify(gate).substring(0, 100)}...`);
      });
    }
  } catch (e) {
    // Expected for now
  }
}

// Test 1: Two different witness variables
await analyzeAssertEqual('Two witnesses x = y', () => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 5n);
  
  // Looking at assertEqualCompatible in compatible.ts:
  // When both are variables with scale factor 1, it uses:
  // Snarky.field.assertEqual(x, y) which creates a WIRE constraint
  x.assertEquals(y);
  
  return { info: 'Used Snarky.field.assertEqual for wire constraint' };
});

// Test 2: Scaled variables
await analyzeAssertEqual('Scaled: 2x = y', () => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 10n);
  
  // This should use a Generic gate: 2*x - 1*y = 0
  x.mul(2).assertEquals(y);
  
  return { info: 'Generic gate for 2*x - y = 0' };
});

// Test 3: Variable equals constant
await analyzeAssertEqual('Variable = Constant', () => {
  let x = Provable.witness(Field, () => 5n);
  
  // This uses Snarky.field.assertEqual with constant
  x.assertEquals(Field(5));
  
  return { info: 'Snarky.field.assertEqual with constant' };
});

// Test 4: Complex expression
await analyzeAssertEqual('Complex: (x + y) = z', () => {
  let x = Provable.witness(Field, () => 3n);
  let y = Provable.witness(Field, () => 4n);
  let z = Provable.witness(Field, () => 7n);
  
  // reduceToScaledVar will keep this as linear combination
  // Then assertEqual will create: x + y - z = 0
  x.add(y).assertEquals(z);
  
  return { info: 'Generic gate for x + y - z = 0' };
});

// Test 5: Why do wire constraints show as 0 rows?
console.log('\n=== Understanding Wire Constraints ===');
console.log('Key insight: When Snarky.field.assertEqual is used for simple x = y,');
console.log('it creates a WIRE constraint, not a gate constraint.');
console.log('Wire constraints enforce that two variables are the same');
console.log('by making them reference the same underlying variable.');
console.log('This is why cs.rows shows 0 - no arithmetic gates are needed!\n');

// Let's verify this by looking at variable indices
await Provable.runAndCheck(() => {
  console.log('Tracing variable creation:');
  
  let x = Provable.witness(Field, () => 5n);
  console.log('  Created witness x');
  
  let y = Provable.witness(Field, () => 5n);  
  console.log('  Created witness y');
  
  console.log('  Calling x.assertEquals(y)...');
  x.assertEquals(y);
  console.log('  Wire constraint created - x and y now reference same var');
  
  // After the wire constraint, x and y effectively become the same variable
  // This is why no arithmetic constraint is needed
});

// Test 6: Let's see the actual constraint system details
console.log('\n=== Constraint System Details ===');

let cs1 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 5n);
  x.assertEquals(y);
});

console.log('Simple equality (wire constraint):');
console.log(`  Rows: ${cs1.rows}`);
console.log(`  Digest: ${cs1.digest}`);
console.log(`  Public input size: ${cs1.publicInputSize}`);

let cs2 = await Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => 5n);
  let y = Provable.witness(Field, () => 10n);
  x.mul(2).assertEquals(y);
});

console.log('\nScaled equality (generic gate):');
console.log(`  Rows: ${cs2.rows}`);
console.log(`  Digest: ${cs2.digest}`);
console.log(`  Public input size: ${cs2.publicInputSize}`);

console.log('\n=== Summary ===');
console.log('1. Snarky has two ways to enforce equality:');
console.log('   - Wire constraints: Make two variables reference the same value');
console.log('   - Generic gates: Arithmetic constraint like ax + by + c = 0');
console.log('2. Wire constraints dont add rows to the constraint system');
console.log('3. This is why simple x.assertEquals(y) shows 0 constraints');
console.log('4. But scaled or complex equalities need arithmetic gates');