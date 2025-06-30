#!/usr/bin/env node

/**
 * Comprehensive test suite for Sparky JavaScript/Rust conversions
 * Tests all FieldVar types and conversion scenarios
 */

import { Field, Poseidon, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('=== Sparky Conversions Test Suite ===\n');

async function testConversions() {
  // Initialize o1js with Sparky backend
  await initializeBindings();
  await switchBackend('sparky');
  console.log(`✓ Switched to ${getCurrentBackend()} backend\n`);

  let passed = 0;
  let failed = 0;

  // Test helper
  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log('Testing Constant FieldVars:');
  console.log('─'.repeat(50));
  
  // Test 1: Zero constant
  test('Zero constant', () => {
    const zero = Field(0);
    const result = zero.add(Field(0));
    if (!result.equals(Field(0)).toBoolean()) {
      throw new Error('0 + 0 should equal 0');
    }
  });

  // Test 2: One constant
  test('One constant', () => {
    const one = Field(1);
    const result = one.mul(Field(1));
    if (!result.equals(Field(1)).toBoolean()) {
      throw new Error('1 * 1 should equal 1');
    }
  });

  // Test 3: Large constant (BigInt)
  test('Large BigInt constant', () => {
    const large = Field('12345678901234567890123456789012345678901234567890');
    const result = large.add(Field(0));
    if (!result.equals(large).toBoolean()) {
      throw new Error('Large + 0 should equal Large');
    }
  });

  // Test 4: Negative constant
  test('Negative constant', () => {
    const neg = Field(-5);
    const pos = Field(5);
    const result = neg.add(pos);
    if (!result.equals(Field(0)).toBoolean()) {
      throw new Error('-5 + 5 should equal 0');
    }
  });

  console.log('\nTesting Variable FieldVars:');
  console.log('─'.repeat(50));

  // Test 5: Variable creation and operations
  test('Variable operations', () => {
    // In compile mode, Field.from creates variables
    const x = Field.from(Field(10));
    const y = Field.from(Field(20));
    const sum = x.add(y);
    const product = x.mul(y);
    // Just ensure no errors during conversion
  });

  console.log('\nTesting Add Operations:');
  console.log('─'.repeat(50));

  // Test 6: Simple addition
  test('Simple addition', () => {
    const a = Field(10);
    const b = Field(20);
    const result = a.add(b);
    if (!result.equals(Field(30)).toBoolean()) {
      throw new Error('10 + 20 should equal 30');
    }
  });

  // Test 7: Nested addition
  test('Nested addition', () => {
    const a = Field(1);
    const b = Field(2);
    const c = Field(3);
    const result = a.add(b).add(c);
    if (!result.equals(Field(6)).toBoolean()) {
      throw new Error('1 + 2 + 3 should equal 6');
    }
  });

  console.log('\nTesting Scale Operations:');
  console.log('─'.repeat(50));

  // Test 8: Simple scaling
  test('Simple scaling', () => {
    const a = Field(10);
    const scalar = Field(3);
    const result = a.mul(scalar);
    if (!result.equals(Field(30)).toBoolean()) {
      throw new Error('10 * 3 should equal 30');
    }
  });

  // Test 9: Scaling with large scalar
  test('Large scalar', () => {
    const a = Field(2);
    const scalar = Field('1000000000000000000000000000000');
    const result = a.mul(scalar);
    const expected = Field('2000000000000000000000000000000');
    if (!result.equals(expected).toBoolean()) {
      throw new Error('Large scalar multiplication failed');
    }
  });

  console.log('\nTesting Complex Operations:');
  console.log('─'.repeat(50));

  // Test 10: Mixed operations
  test('Mixed add and scale', () => {
    const a = Field(5);
    const b = Field(10);
    const c = Field(2);
    // (5 + 10) * 2 = 30
    const result = a.add(b).mul(c);
    if (!result.equals(Field(30)).toBoolean()) {
      throw new Error('(5 + 10) * 2 should equal 30');
    }
  });

  // Test 11: Poseidon hash (complex internal conversions)
  test('Poseidon hash', () => {
    const input = [Field(1), Field(2), Field(3)];
    const hash1 = Poseidon.hash(input);
    const hash2 = Poseidon.hash(input);
    if (!hash1.equals(hash2).toBoolean()) {
      throw new Error('Poseidon should be deterministic');
    }
  });

  // Test 12: Field arithmetic chain
  test('Arithmetic chain', () => {
    const a = Field(100);
    const b = Field(50);
    const c = Field(25);
    const d = Field(2);
    // ((100 - 50) + 25) * 2 = 150
    const result = a.sub(b).add(c).mul(d);
    if (!result.equals(Field(150)).toBoolean()) {
      throw new Error('((100 - 50) + 25) * 2 should equal 150');
    }
  });

  console.log('\nTesting Edge Cases:');
  console.log('─'.repeat(50));

  // Test 13: Field modulus wrap-around
  test('Field modulus', () => {
    const p = Field.ORDER;
    const almostP = Field(p - 1n);
    const one = Field(1);
    const result = almostP.add(one);
    if (!result.equals(Field(0)).toBoolean()) {
      throw new Error('(p-1) + 1 should equal 0 (mod p)');
    }
  });

  // Test 14: Division
  test('Division', () => {
    const a = Field(100);
    const b = Field(5);
    const result = a.div(b);
    if (!result.equals(Field(20)).toBoolean()) {
      throw new Error('100 / 5 should equal 20');
    }
  });

  // Test 15: Square root
  test('Square root', () => {
    const a = Field(4);
    const sqrt = a.sqrt();
    const squared = sqrt.mul(sqrt);
    if (!squared.equals(a).toBoolean()) {
      throw new Error('sqrt(4)^2 should equal 4');
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  return failed === 0;
}

// Run tests
testConversions()
  .then(success => {
    if (success) {
      console.log('\n✅ All conversion tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test suite error:', error);
    process.exit(1);
  });