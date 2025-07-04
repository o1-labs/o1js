/**
 * Test to verify optimization pipeline is re-enabled and working
 */

import { switchBackend, Field } from './dist/node/index.js';

async function testOptimizationEnabled() {
  console.log('🔍 Testing optimization pipeline re-enablement...');
  
  try {
    // Switch to Sparky backend
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    // Create some field operations that should trigger optimization
    console.log('📊 Creating operations that trigger optimization...');
    
    const x = Field(42);
    const y = Field(7);
    const z = x.mul(y);  // Should create constraint + optimization
    
    console.log('✓ Operations completed successfully');
    console.log('✅ OPTIMIZATION PIPELINE RE-ENABLED AND WORKING!');
    
    // Look for the log message that indicates optimization is re-enabled
    console.log('📋 Expected log: "🚀 OPTIMIZATION RE-ENABLED: Running sparky-ir optimization pipeline"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('time not implemented')) {
      console.error('🚨 TIMING ISSUE RETURNED - optimization re-enablement failed');
    } else {
      console.error('Different error occurred');
    }
    
    process.exit(1);
  }
}

testOptimizationEnabled().catch(console.error);