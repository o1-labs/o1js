/**
 * Investigate VK object structure and methods
 */

import { switchBackend, getCurrentBackend, Field, ZkProgram } from './dist/node/index.js';

async function investigateVKStructure() {
  console.log('🔬 Investigating VK Object Structure:');
  console.log('====================================');
  
  try {
    // Test with Snarky first
    console.log('Testing with Snarky backend...');
    await switchBackend('snarky');
    
    const SimpleProgram = ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      methods: {
        addOne: {
          privateInputs: [],
          async method(x) {
            return x.add(Field(1));
          }
        }
      }
    });
    
    console.log('Compiling with Snarky...');
    const compilationResult = await SimpleProgram.compile();
    
    console.log('\n📊 Compilation Result Structure:');
    console.log('Keys:', Object.keys(compilationResult));
    
    if (compilationResult.verificationKey) {
      const vk = compilationResult.verificationKey;
      console.log('\n📊 VK Object Structure:');
      console.log('VK type:', typeof vk);
      console.log('VK constructor:', vk.constructor.name);
      console.log('VK keys:', Object.keys(vk));
      console.log('VK prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(vk)));
      
      // Try different ways to get VK data
      if (vk.data) {
        console.log('VK data type:', typeof vk.data);
        console.log('VK data keys:', Object.keys(vk.data));
      }
      
      if (vk.hash) {
        console.log('VK hash method exists');
        try {
          const hash = vk.hash();
          console.log('Snarky VK hash:', hash);
        } catch (error) {
          console.log('VK hash error:', error.message);
        }
      } else {
        console.log('VK hash method does NOT exist');
        // Try to find other ways to get a hash/identifier
        console.log('VK toString:', vk.toString());
        console.log('VK stringified:', JSON.stringify(vk, null, 2).slice(0, 200) + '...');
      }
    }
    
    // Now test with Sparky
    console.log('\n\nTesting with Sparky backend...');
    await switchBackend('sparky');
    
    console.log('Compiling with Sparky...');
    const sparkyCompilationResult = await SimpleProgram.compile();
    
    console.log('\n📊 Sparky Compilation Result Structure:');
    console.log('Keys:', Object.keys(sparkyCompilationResult));
    
    if (sparkyCompilationResult.verificationKey) {
      const sparkyVK = sparkyCompilationResult.verificationKey;
      console.log('\n📊 Sparky VK Object Structure:');
      console.log('VK type:', typeof sparkyVK);
      console.log('VK constructor:', sparkyVK.constructor.name);
      console.log('VK keys:', Object.keys(sparkyVK));
      
      // Try to get Sparky VK data
      if (sparkyVK.hash) {
        try {
          const sparkyHash = sparkyVK.hash();
          console.log('Sparky VK hash:', sparkyHash);
        } catch (error) {
          console.log('Sparky VK hash error:', error.message);
        }
      } else {
        console.log('Sparky VK hash method does NOT exist');
        console.log('Sparky VK toString:', sparkyVK.toString());
        console.log('Sparky VK stringified:', JSON.stringify(sparkyVK, null, 2).slice(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.error('\n❌ VK investigation failed:');
    console.error('Error:', error.message);
    console.error('Type:', error.constructor.name);
    console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  }
}

async function testSimpleConstraintCounting() {
  console.log('\n\n🔢 Testing Simple Constraint Counting:');
  console.log('=====================================');
  
  try {
    const { Provable } = await import('./dist/node/index.js');
    
    // Test constraint counting with Snarky
    console.log('Testing constraint counting with Snarky...');
    await switchBackend('snarky');
    
    const snarkyConstraints = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(3));
      return x.add(y);
    });
    
    console.log('Snarky constraint system:');
    console.log('  Gates:', snarkyConstraints.gates?.length || 'unknown');
    console.log('  Rows:', snarkyConstraints.rows || 'unknown');
    console.log('  Type:', typeof snarkyConstraints);
    console.log('  Keys:', Object.keys(snarkyConstraints));
    
    // Test constraint counting with Sparky
    console.log('\nTesting constraint counting with Sparky...');
    await switchBackend('sparky');
    
    const sparkyConstraints = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(3));
      return x.add(y);
    });
    
    console.log('Sparky constraint system:');
    console.log('  Gates:', sparkyConstraints.gates?.length || 'unknown');
    console.log('  Rows:', sparkyConstraints.rows || 'unknown');
    console.log('  Type:', typeof sparkyConstraints);
    console.log('  Keys:', Object.keys(sparkyConstraints));
    
    // Compare
    console.log('\n🔍 Constraint Comparison:');
    console.log(`  Snarky gates: ${snarkyConstraints.gates?.length || 0}`);
    console.log(`  Sparky gates: ${sparkyConstraints.gates?.length || 0}`);
    console.log(`  Constraint parity: ${(snarkyConstraints.gates?.length || 0) === (sparkyConstraints.gates?.length || 0) ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('\n❌ Constraint counting failed:');
    console.error('Error:', error.message);
    console.error('Type:', error.constructor.name);
  }
}

// Run the investigations
investigateVKStructure()
  .then(() => testSimpleConstraintCounting())
  .catch(console.error);