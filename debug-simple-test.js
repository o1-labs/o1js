#!/usr/bin/env node

/**
 * Simple diagnostic test to understand the Sparky backend issue
 */

console.log('🔍 Sparky Backend Diagnostic Test');
console.log('==================================');

async function runDiagnostic() {
  try {
    console.log('1. Loading o1js...');
    const o1js = await import('./dist/node/index.js');
    console.log('✅ o1js loaded successfully');
    
    console.log('2. Testing current backend...');
    const initialBackend = o1js.getCurrentBackend();
    console.log(`✅ Current backend: ${initialBackend}`);
    
    console.log('3. Testing basic Field operations...');
    const a = o1js.Field(10);
    const b = o1js.Field(20);
    const c = a.add(b);
    console.log(`✅ Field operations work: 10 + 20 = ${c.toString()}`);
    
    console.log('4. Testing Sparky backend switch...');
    try {
      await o1js.switchBackend('sparky');
      console.log('✅ Backend switched to sparky');
      console.log(`✅ Current backend: ${o1js.getCurrentBackend()}`);
    } catch (error) {
      console.log('❌ Backend switch failed:', error.message);
      console.log('Error details:', error.stack);
      return;
    }
    
    console.log('5. Testing Field operations with Sparky...');
    const x = o1js.Field(5);
    const y = o1js.Field(3);
    const z = x.mul(y);
    console.log(`✅ Sparky Field operations work: 5 * 3 = ${z.toString()}`);
    
    console.log('6. Testing simple ZkProgram...');
    const SimpleProgram = o1js.ZkProgram({
      name: 'SimpleTest',
      publicInput: o1js.Field,
      publicOutput: o1js.Field,
      methods: {
        compute: {
          privateInputs: [o1js.Field, o1js.Field],
          async method(publicInput, a, b) {
            const result = a.mul(b).add(publicInput);
            return { publicOutput: result };
          },
        },
      },
    });
    
    console.log('7. Compiling ZkProgram...');
    await SimpleProgram.compile();
    console.log('✅ ZkProgram compiled successfully');
    
    console.log('8. Running simple test case...');
    const proof = await SimpleProgram.compute(o1js.Field(10), o1js.Field(5), o1js.Field(3));
    console.log('✅ Proof generated successfully');
    
    console.log('9. Verifying proof...');
    const verified = await SimpleProgram.verify(proof);
    console.log(`✅ Proof verified: ${verified}`);
    
    console.log('\n🎉 All tests passed! Sparky backend is working correctly.');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('Stack trace:', error.stack);
    
    // Try to identify the specific issue
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 Issue: Missing compiled files');
      console.log('   Solution: Run "npm run build" to compile TypeScript files');
    } else if (error.message.includes('prover mode')) {
      console.log('\n💡 Issue: Prover mode error');
      console.log('   Solution: Check constraint generation and witness computation');
    } else if (error.message.includes('Backend switch failed')) {
      console.log('\n💡 Issue: Backend switching problem');
      console.log('   Solution: Check Sparky adapter initialization');
    }
  }
}

runDiagnostic().catch(console.error);