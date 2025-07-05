import { SmartContract, State, state, Field, method, Mina, switchBackend } from '../index.js';

console.log('🔍 SmartContract Compilation Debug Script');

async function testBackend(backend: 'snarky' | 'sparky') {
  console.log(`\n📦 Testing with ${backend} backend...`);
  
  // Switch backend
  switchBackend(backend);
  
  // Define a minimal SmartContract
  class TestContract extends SmartContract {
    @state(Field) value = State<Field>();
    
    @method async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = current.add(1);
      this.value.set(newValue);
    }
  }
  
  try {
    console.log(`⚙️  Compiling TestContract...`);
    const compilationResult = await TestContract.compile();
    
    console.log(`✅ Compilation successful!`);
    console.log(`  - Verification Key exists: ${!!compilationResult.verificationKey}`);
    console.log(`  - VK hash: ${compilationResult.verificationKey?.hash || 'missing'}`);
    console.log(`  - Methods compiled: ${Object.keys(compilationResult.provers || {}).length}`);
    console.log(`  - Method names: ${Object.keys(compilationResult.provers || {}).join(', ')}`);
    
    // Log some verification key details if it exists
    if (compilationResult.verificationKey) {
      console.log(`  - VK data length: ${JSON.stringify(compilationResult.verificationKey.data).length} chars`);
    }
    
    return {
      backend,
      success: true,
      vkExists: !!compilationResult.verificationKey,
      vkHash: compilationResult.verificationKey?.hash || 'missing',
      methodCount: Object.keys(compilationResult.provers || {}).length
    };
  } catch (error: any) {
    console.error(`❌ Compilation failed:`, error.message);
    if (error.stack) {
      console.error(`Stack trace:`, error.stack);
    }
    return {
      backend,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  // Set up Mina for SmartContract compilation
  try {
    console.log('🌐 Setting up Mina LocalBlockchain...');
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('✅ Mina LocalBlockchain ready');
  } catch (error: any) {
    console.error('❌ Failed to setup Mina:', error.message);
    process.exit(1);
  }
  
  // Test both backends
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  // Compare results
  console.log('\n📊 Comparison Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Snarky: ${snarkyResult.success ? '✅' : '❌'} ${snarkyResult.success ? `VK exists: ${snarkyResult.vkExists}, Methods: ${snarkyResult.methodCount}` : snarkyResult.error}`);
  console.log(`Sparky: ${sparkyResult.success ? '✅' : '❌'} ${sparkyResult.success ? `VK exists: ${sparkyResult.vkExists}, Methods: ${sparkyResult.methodCount}` : sparkyResult.error}`);
  
  if (snarkyResult.success && sparkyResult.success) {
    const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
    const methodMatch = snarkyResult.methodCount === sparkyResult.methodCount;
    console.log(`\nVK Hash Match: ${vkMatch ? '✅' : '❌'}`);
    console.log(`Method Count Match: ${methodMatch ? '✅' : '❌'}`);
  }
}

main().catch(console.error);