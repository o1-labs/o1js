import { Field, Provable } from './dist/node/index.js';
import { switchBackend } from './dist/node/index.js';

async function debugSimplePermutation() {
  console.log('Debug Simple Permutation Issue\n');
  
  // First, let's manually examine what's happening with Sparky
  await switchBackend('sparky');
  
  console.log('Creating a simple constraint system manually...\n');
  
  // Simple constraint: x = 0
  Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(0));
    x.assertEquals(Field(0));
  });
  
  console.log('✅ Simple constraint created successfully\n');
  
  // Now let's try something even simpler - just compile an empty circuit
  console.log('Testing empty circuit compilation...');
  
  const { ZkProgram, Void } = await import('./dist/node/index.js');
  
  const EmptyProgram = ZkProgram({
    name: 'EmptyProgram',
    publicInput: Void,
    publicOutput: Void,
    methods: {
      empty: {
        privateInputs: [],
        async method() {
          // No constraints
        }
      }
    }
  });
  
  try {
    console.log('Compiling empty program...');
    await EmptyProgram.compile();
    console.log('✅ Empty program compiled successfully');
    
    console.log('\nCreating proof for empty program...');
    const proof = await EmptyProgram.empty();
    console.log('✅ Empty program proof created successfully');
  } catch (error) {
    console.error('❌ Empty program error:', error.message);
  }
  
  // Now test with a minimal constraint
  console.log('\n\nTesting minimal constraint program...');
  
  const MinimalProgram = ZkProgram({
    name: 'MinimalProgram',
    publicInput: Void,
    publicOutput: Void,
    methods: {
      test: {
        privateInputs: [],
        async method() {
          const x = Provable.witness(Field, () => Field(5));
          const y = Provable.witness(Field, () => Field(5));
          x.assertEquals(y);
        }
      }
    }
  });
  
  try {
    console.log('Compiling minimal program...');
    await MinimalProgram.compile();
    console.log('✅ Minimal program compiled successfully');
    
    console.log('\nCreating proof for minimal program...');
    const proof = await MinimalProgram.test();
    console.log('✅ Minimal program proof created successfully');
  } catch (error) {
    console.error('❌ Minimal program error:', error.message);
  }
  
  // Finally test the problematic case
  console.log('\n\nTesting problematic case (public input with constraint)...');
  
  const ProblematicProgram = ZkProgram({
    name: 'ProblematicProgram',
    publicInput: Field,
    publicOutput: Void,
    methods: {
      test: {
        privateInputs: [],
        async method(x) {
          x.assertEquals(Field(0));
        }
      }
    }
  });
  
  try {
    console.log('Compiling problematic program...');
    await ProblematicProgram.compile();
    console.log('✅ Problematic program compiled successfully');
    
    console.log('\nCreating proof for problematic program...');
    const proof = await ProblematicProgram.test(Field(0));
    console.log('✅ Problematic program proof created successfully');
  } catch (error) {
    console.error('❌ Problematic program error:', error.message);
    
    // Let's see if changing the constraint helps
    console.log('\n\nTrying alternative constraint formulation...');
    
    const AlternativeProgram = ZkProgram({
      name: 'AlternativeProgram',
      publicInput: Field,
      publicOutput: Void,
      methods: {
        test: {
          privateInputs: [],
          async method(x) {
            // Instead of x.assertEquals(0), try x - 0 = 0
            const zero = Field(0);
            const diff = x.sub(zero);
            diff.assertEquals(zero);
          }
        }
      }
    });
    
    try {
      console.log('Compiling alternative program...');
      await AlternativeProgram.compile();
      console.log('✅ Alternative program compiled successfully');
      
      console.log('\nCreating proof for alternative program...');
      const proof = await AlternativeProgram.test(Field(0));
      console.log('✅ Alternative program proof created successfully');
    } catch (error2) {
      console.error('❌ Alternative program error:', error2.message);
    }
  }
}

debugSimplePermutation().catch(console.error);