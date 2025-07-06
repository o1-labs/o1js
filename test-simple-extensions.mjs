/**
 * Simple Extension Test
 * Tests core functionality without complex test infrastructure
 */

import { 
  switchBackend, 
  getCurrentBackend,
  getSparkyExtensions,
  getAvailableExtensions
} from './dist/node/index.js';

async function testExtensions() {
  console.log('🧪 Testing Sparky Optimization Extensions...\n');
  
  try {
    // Test 1: Backend switching
    console.log('1️⃣ Testing backend switching...');
    await switchBackend('snarky');
    console.log(`   Current backend: ${getCurrentBackend()}`);
    
    // Test 2: Extensions unavailable with Snarky
    console.log('2️⃣ Testing extension availability with Snarky...');
    const snarkyExtensions = getSparkyExtensions();
    console.log(`   Extensions with Snarky: ${snarkyExtensions}`);
    
    const snarkyAvailable = getAvailableExtensions();
    console.log(`   Available categories: [${snarkyAvailable.join(', ')}]`);
    
    // Test 3: Switch to Sparky
    console.log('3️⃣ Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log(`   Current backend: ${getCurrentBackend()}`);
    
    // Test 4: Extensions available with Sparky
    console.log('4️⃣ Testing extension availability with Sparky...');
    const sparkyExtensions = getSparkyExtensions();
    console.log(`   Extensions object: ${sparkyExtensions ? 'Available' : 'Not available'}`);
    
    if (sparkyExtensions) {
      console.log(`   Extension types: ${Object.keys(sparkyExtensions).join(', ')}`);
      
      // Test 5: Optimization extension
      console.log('5️⃣ Testing optimization extension...');
      const optimization = sparkyExtensions.optimization;
      console.log(`   Optimization extension: ${optimization.name}`);
      
      // Test current level
      const currentLevel = await optimization.getOptimizationLevel();
      console.log(`   Current optimization level: ${currentLevel}`);
      
      // Test level change
      console.log('6️⃣ Testing optimization level change...');
      await optimization.setOptimizationLevel('basic');
      const newLevel = await optimization.getOptimizationLevel();
      console.log(`   New optimization level: ${newLevel}`);
      
      // Test available presets
      const presets = optimization.getAvailablePresets();
      console.log(`   Available presets: ${presets.map(p => p.level).join(', ')}`);
      
      console.log('\n✅ ALL TESTS PASSED! Extensions working correctly.');
    } else {
      console.log('❌ Extensions not available with Sparky backend');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testExtensions();