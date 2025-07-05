/**
 * Test simple compilation that was previously failing
 */

console.log('🧪 Testing simple compilation with ML Array format...');

async function testSimpleCompilation() {
  try {
    const o1js = await import('./dist/node/index.js');
    const { Field, ZkProgram, switchBackend } = o1js;
    
    // Switch to Sparky backend
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log('✅ Sparky backend loaded');
    
    // Create a simple ZkProgram to test compilation
    console.log('\n🧪 Creating simple ZkProgram...');
    const SimpleProgram = ZkProgram({
      name: "simple-test",
      publicInput: Field,
      
      methods: {
        baseCase: {
          privateInputs: [Field],
          method(publicInput, privateInput) {
            // This should create the triple-nesting that was failing
            publicInput.add(privateInput).assertEquals(Field(8));
          }
        }
      }
    });
    
    console.log('✅ ZkProgram created successfully');
    
    // Try to compile it
    console.log('\n🧪 Compiling ZkProgram...');
    const compilationResult = await SimpleProgram.compile();
    console.log('✅ Compilation successful!');
    console.log('Verification key hash:', compilationResult.verificationKey?.hash);
    
    return true;
    
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    
    // Check if it's the specific ML Array error we were trying to fix
    if (error.message.includes('expected bigint string, got Array')) {
      console.error('🚨 This is the ML Array error we were trying to fix!');
      console.error('The parser fix may not be complete or there are other instances.');
    } else if (error.message.includes('Large linear combinations')) {
      console.error('ℹ️  This is a different error - MIR optimization pipeline limitation');
      console.error('The ML Array fix worked, but hit optimization limits.');
    }
    
    console.error('Full error:', error);
    return false;
  }
}

testSimpleCompilation().then(success => {
  if (success) {
    console.log('\n🎉 ML Array parsing fix confirmed working!');
  } else {
    console.log('\n❌ Still have issues to resolve');
  }
}).catch(console.error);