import { Field, ZkProgram } from './dist/node/index.js';

// Test program with one constraint
console.log('Testing ZkProgram with constraints...');
const OneConstraintProgram = ZkProgram({
  name: 'OneConstraintProgram', 
  publicInput: Field,
  publicOutput: Field,
  methods: {
    test: {
      privateInputs: [],
      async method(x) {
        console.log('Method input x:', x);
        console.log('  - type:', typeof x);
        console.log('  - constructor:', x?.constructor?.name);
        console.log('  - has toConstant:', typeof x?.toConstant);
        
        // Add constraint
        x.assertEquals(Field(42));
        
        return x;
      }
    }
  }
});

(async () => {
  try {
    console.log('\nCompiling program...');
    await OneConstraintProgram.compile();
    console.log('Compilation successful');
    
    console.log('\nCreating proof...');
    const proof = await OneConstraintProgram.test(Field(42));
    console.log('Proof created successfully:', proof);
  } catch (e) {
    console.error('\nError occurred:', e.message);
    console.error('\nFull stack trace:');
    console.error(e.stack);
    
    // Log additional details about the error location
    if (e.stack.includes('fields.js')) {
      console.error('\nThis error is happening in fields.js as described in FIX.md');
      console.error('The issue is likely that some Field value is undefined when toConstant() is called');
    }
  }
})();