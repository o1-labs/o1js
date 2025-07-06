/**
 * Test rangeCheck1 implementation in Sparky
 */

// Test with Sparky backend
const testRangeCheck1 = async () => {
  try {
    console.log('🧪 Testing rangeCheck1 implementation with Sparky backend...');
    
    // Import o1js modules
    const { switchBackend, Field, Provable } = await import('./dist/node/index.js');
    const { compactMultiRangeCheck } = await import('./dist/node/lib/provable/gadgets/range-check.js');
    
    // Switch to Sparky backend
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
    
    // Test the rangeCheck1 implementation by using compactMultiRangeCheck
    // This function internally calls rangeCheck1
    console.log('✅ Testing compactMultiRangeCheck (which uses rangeCheck1)...');
    
    await Provable.runAndCheck(() => {
      // Create test values for compact multi-range check
      const xy = Field(12345678n);  // Combined value
      const z = Field(87654321n);   // Third value
      
      try {
        const result = compactMultiRangeCheck(xy, z);
        console.log('📊 compactMultiRangeCheck result:', result.map(x => x.toString()));
        console.log('✅ rangeCheck1 implementation appears to be working correctly!');
      } catch (error) {
        console.log('❌ Error in compactMultiRangeCheck:', error.message);
        throw error;
      }
    });
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Run the test
testRangeCheck1().catch(console.error);