// Set backend before imports
process.env.BACKEND = 'sparky';

import { Field, Provable, createForeignField } from './dist/node/index.js';

console.log('Comprehensive ForeignFieldAdd Testing with Sparky backend...\n');

// Create a foreign field with secp256k1 modulus
const secp256k1Modulus = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const ForeignFieldSecp = createForeignField(secp256k1Modulus);

console.log('Foreign field modulus (secp256k1):', secp256k1Modulus.toString(16));

// Test 1: Simple addition
console.log('\n🧪 Test 1: Simple addition');
try {
  await Provable.runAndCheck(() => {
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(20n));
    const result = a.add(b);
    
    Provable.log('10 + 20 =', result);
    result.assertEquals(ForeignFieldSecp.from(30n));
  });
  console.log('✅ Test 1 passed!');
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: Addition with modular reduction
console.log('\n🧪 Test 2: Addition with modular reduction');
try {
  await Provable.runAndCheck(() => {
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(secp256k1Modulus - 5n));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
    const result = a.add(b);
    
    Provable.log('(p-5) + 10 =', result);
    // Should equal 5 due to modular reduction
    result.assertEquals(ForeignFieldSecp.from(5n));
  });
  console.log('✅ Test 2 passed!');
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// Test 3: Subtraction (using negative sign)
console.log('\n🧪 Test 3: Subtraction');
try {
  await Provable.runAndCheck(() => {
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(30n));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
    const result = a.sub(b);
    
    Provable.log('30 - 10 =', result);
    result.assertEquals(ForeignFieldSecp.from(20n));
  });
  console.log('✅ Test 3 passed!');
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

// Test 4: Subtraction with underflow
console.log('\n🧪 Test 4: Subtraction with underflow');
try {
  await Provable.runAndCheck(() => {
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(5n));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
    const result = a.sub(b);
    
    Provable.log('5 - 10 =', result);
    // Should equal p - 5
    result.assertEquals(ForeignFieldSecp.from(secp256k1Modulus - 5n));
  });
  console.log('✅ Test 4 passed!');
} catch (error) {
  console.error('❌ Test 4 failed:', error.message);
}

// Test 5: Large number addition
console.log('\n🧪 Test 5: Large number addition');
try {
  await Provable.runAndCheck(() => {
    // Use exact division to avoid rounding
    const halfP = (secp256k1Modulus - 1n) / 2n;  // (p-1)/2 to ensure exact division
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(halfP));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(halfP + 101n));
    const result = a.add(b);
    
    Provable.log('(p-1)/2 + ((p-1)/2 + 101) =', result);
    // Should equal 100 due to modular reduction: (p-1)/2 + (p-1)/2 + 101 = p - 1 + 101 = 100
    result.assertEquals(ForeignFieldSecp.from(100n));
  });
  console.log('✅ Test 5 passed!');
} catch (error) {
  console.error('❌ Test 5 failed:', error.message);
}

// Test 6: Zero addition
console.log('\n🧪 Test 6: Zero addition');
try {
  await Provable.runAndCheck(() => {
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(42n));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(0n));
    const result = a.add(b);
    
    Provable.log('42 + 0 =', result);
    result.assertEquals(ForeignFieldSecp.from(42n));
  });
  console.log('✅ Test 6 passed!');
} catch (error) {
  console.error('❌ Test 6 failed:', error.message);
}

// Test 7: Chain of additions
console.log('\n🧪 Test 7: Chain of additions');
try {
  await Provable.runAndCheck(() => {
    const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
    const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(20n));
    const c = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(30n));
    
    const result1 = a.add(b);
    const result2 = result1.add(c);
    
    Provable.log('(10 + 20) + 30 =', result2);
    result2.assertEquals(ForeignFieldSecp.from(60n));
  });
  console.log('✅ Test 7 passed!');
} catch (error) {
  console.error('❌ Test 7 failed:', error.message);
}

console.log('\n✨ All tests completed!');