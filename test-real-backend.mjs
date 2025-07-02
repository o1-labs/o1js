#!/usr/bin/env node

/**
 * Minimal test of real backend integration using compiled dist files
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field } from './dist/node/index.js';
import { Provable } from './dist/node/index.js';

async function testRealBackend() {
  console.log('🔍 Testing Real Backend Integration...\n');

  try {
    // 1. Check initial backend
    console.log('1. Initial backend state:');
    const initialBackend = getCurrentBackend();
    console.log(`   Current backend: ${initialBackend}`);
    console.log();

    // 2. Test basic field operation
    console.log('2. Testing basic field operation:');
    const f1 = Field(5);
    const f2 = Field(3);
    const result = f1.add(f2);
    console.log(`   Field(5) + Field(3) = ${result.toBigInt()}`);
    console.log();

    // 3. Test constraint system capture
    console.log('3. Testing constraint system capture:');
    const constraintSystem = await Provable.constraintSystem(() => {
      const x = Field(1);
      const y = Field(2);
      x.add(y);
    });
    console.log(`   Constraint count: ${constraintSystem.rows}`);
    console.log(`   Public input size: ${constraintSystem.publicInputSize}`);
    console.log(`   Gates: ${constraintSystem.gates.length}`);
    console.log();

    // 4. Test backend switching
    console.log('4. Testing backend switching:');
    
    // Switch to Sparky
    console.log('   Switching to Sparky...');
    const startTime = Date.now();
    await switchBackend('sparky');
    const switchTime = Date.now() - startTime;
    const currentBackend = getCurrentBackend();
    console.log(`   ✓ Switched to: ${currentBackend} (${switchTime}ms)`);
    
    // Test operation on Sparky
    const sparkyResult = Field(10).add(Field(5));
    console.log(`   Sparky Field(10) + Field(5) = ${sparkyResult.toBigInt()}`);
    
    // Switch back to Snarky
    console.log('   Switching back to Snarky...');
    await switchBackend('snarky');
    const finalBackend = getCurrentBackend();
    console.log(`   ✓ Switched to: ${finalBackend}`);
    
    // Test operation on Snarky
    const snarkyResult = Field(10).add(Field(5));
    console.log(`   Snarky Field(10) + Field(5) = ${snarkyResult.toBigInt()}`);
    console.log();

    // 5. Compare constraint systems between backends
    console.log('5. Comparing constraint systems:');
    
    // Snarky constraints
    await switchBackend('snarky');
    const snarkyCs = await Provable.constraintSystem(() => {
      const a = Field(1);
      const b = Field(2);
      const c = Field(3);
      a.add(b).mul(c);
    });
    console.log(`   Snarky constraints: ${snarkyCs.rows}`);
    
    // Sparky constraints
    await switchBackend('sparky');
    const sparkyCs = await Provable.constraintSystem(() => {
      const a = Field(1);
      const b = Field(2);
      const c = Field(3);
      a.add(b).mul(c);
    });
    console.log(`   Sparky constraints: ${sparkyCs.rows}`);
    console.log(`   Constraint equality: ${snarkyCs.rows === sparkyCs.rows ? '✓ Equal' : '✗ Different'}`);
    console.log();

    // Restore initial backend
    await switchBackend(initialBackend);
    console.log(`✅ Test completed successfully! Backend restored to: ${getCurrentBackend()}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run test
testRealBackend().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});