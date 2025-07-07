import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

async function debugWireAssignments() {
  console.log('🔍 Debugging Sparky Wire Assignments vs Permutation Mapping\n');
  
  // Simple test program with multiple constraints to see wire patterns
  const TestProgram = ZkProgram({
    name: 'WireDebugProgram',
    publicInput: Field,
    methods: {
      testMethod: {
        privateInputs: [Field, Field],
        method(pub, a, b) {
          // Create multiple constraints to see patterns
          const c = a.mul(b);
          const d = c.add(pub);
          const e = d.mul(a);
          return e;
        }
      }
    }
  });

  await switchBackend('sparky');
  
  try {
    console.log('Compiling to observe wire assignments...\n');
    const result = await TestProgram.compile();
    console.log('✅ Compilation succeeded\n');
    
    // Try with a more complex program that might reuse variables
    const ComplexProgram = ZkProgram({
      name: 'ComplexWireProgram',
      publicInput: Field,
      methods: {
        complexMethod: {
          privateInputs: [Field],
          method(pub, x) {
            // Reuse x multiple times to force wire sharing
            const a = x.mul(x);      // x appears twice
            const b = a.add(x);      // x appears again
            const c = b.mul(x);      // x appears again
            return c.add(pub);
          }
        }
      }
    });
    
    console.log('\nCompiling complex program with variable reuse...\n');
    const complexResult = await ComplexProgram.compile();
    console.log('✅ Complex compilation succeeded\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugWireAssignments().catch(console.error);