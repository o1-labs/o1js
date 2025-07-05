#!/usr/bin/env node

// Direct test for circuit compilation errors with Sparky
// Created: July 5, 2025
// Last Modified: July 5, 2025 00:30 UTC

// Import from the distributed files
import('./dist/node/index.js').then(async (o1js) => {
  const { Field, ZkProgram, switchBackend, getCurrentBackend, Provable } = o1js;
  
  console.log('Direct Circuit Compilation Test\n');
  
  // Test with Snarky first (baseline)
  console.log('1. Testing with Snarky backend...');
  await switchBackend('snarky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    
    methods: {
      test: {
        privateInputs: [Field],
        method(pubIn, privIn) {
          const result = pubIn.mul(privIn);
          result.assertEquals(Field(42));
        }
      }
    }
  });
  
  try {
    console.log('   Compiling...');
    const start = Date.now();
    await SimpleProgram.compile();
    const duration = Date.now() - start;
    console.log(`   ✅ Snarky compilation successful in ${duration}ms\n`);
  } catch (error) {
    console.error('   ❌ Snarky compilation failed:', error.message);
  }
  
  // Switch to Sparky and test
  console.log('2. Testing with Sparky backend...');
  await switchBackend('sparky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  
  const SimpleProgramSparky = ZkProgram({
    name: 'SimpleProgramSparky',
    publicInput: Field,
    
    methods: {
      test: {
        privateInputs: [Field],
        method(pubIn, privIn) {
          const result = pubIn.mul(privIn);
          result.assertEquals(Field(42));
        }
      }
    }
  });
  
  try {
    console.log('   Compiling...');
    const start = Date.now();
    await SimpleProgramSparky.compile();
    const duration = Date.now() - start;
    console.log(`   ✅ Sparky compilation successful in ${duration}ms`);
  } catch (error) {
    console.error('   ❌ Sparky compilation failed:', error.message);
    console.error('\n   Full error:');
    console.error(error);
    
    // Check Sparky internals
    if (globalThis.sparkyJS) {
      console.log('\n   Sparky diagnostics:');
      console.log('   - sparkyJS exists:', !!globalThis.sparkyJS);
      console.log('   - sparkyInstance:', !!globalThis.sparkyJS.sparkyInstance);
      
      const instance = globalThis.sparkyJS.sparkyInstance;
      if (instance) {
        console.log('   - rangeCheck0:', typeof instance.rangeCheck0);
        console.log('   - poseidon:', !!instance.poseidon);
        console.log('   - constraint_bridge:', !!instance.constraint_bridge);
        
        // Try to access functions directly
        try {
          console.log('   - rangeCheck0 callable:', typeof instance.rangeCheck0 === 'function');
        } catch (e) {
          console.log('   - rangeCheck0 error:', e.message);
        }
        
        try {
          if (instance.poseidon) {
            console.log('   - poseidon.hash:', typeof instance.poseidon.hash);
          }
        } catch (e) {
          console.log('   - poseidon access error:', e.message);
        }
      }
    }
    
    // Check constraint bridge
    if (globalThis.sparkyConstraintBridge) {
      console.log('\n   Constraint bridge diagnostics:');
      console.log('   - bridge exists:', !!globalThis.sparkyConstraintBridge);
      console.log('   - getFullConstraintSystem:', typeof globalThis.sparkyConstraintBridge.getFullConstraintSystem);
    }
  }
  
  // Test simple constraint generation
  console.log('\n3. Testing simple constraint generation with Sparky...');
  try {
    Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(6));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.mul(y);
      z.assertEquals(Field(42));
    });
    console.log('   ✅ Simple constraint generation works');
  } catch (error) {
    console.error('   ❌ Simple constraint generation failed:', error.message);
  }
  
  // Test if we can access constraint system
  console.log('\n4. Testing constraint system access...');
  try {
    if (globalThis.sparkyConstraintBridge?.getFullConstraintSystem) {
      const cs = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
      console.log('   Constraint system:', cs ? 'accessible' : 'null');
      if (cs) {
        console.log('   - Public input size:', cs.publicInputSize || 'unknown');
        console.log('   - Constraint count:', cs.constraintCount || 'unknown');
      }
    } else {
      console.log('   ❌ getFullConstraintSystem not available');
    }
  } catch (error) {
    console.error('   ❌ Constraint system access failed:', error.message);
  }
  
}).catch(console.error);