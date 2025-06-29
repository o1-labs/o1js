/**
 * Test if the supposedly missing/broken API methods actually work
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testMissingMethods() {
  console.log('🔍 Testing supposedly missing/broken API methods...');
  
  await initializeBindings();
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  // Create a simple ZkProgram to test within
  const TestProgram = ZkProgram({
    name: 'apiTest',
    publicInput: Field,
    methods: {
      testMethod: {
        privateInputs: [Field],
        async method(publicInput: Field, x: Field) {
          // We'll test the methods within this context
          x.mul(x).assertEquals(publicInput);
        },
      },
    },
  });
  
  try {
    console.log('\n🔨 Testing ZkProgram compilation (basic functionality)...');
    const { verificationKey } = await TestProgram.compile();
    console.log('✅ Basic ZkProgram compilation works');
    
    // Test if we can access the methods through the bindings
    console.log('\n🔨 Testing access to supposedly missing methods...');
    
    // Import Snarky bindings to test methods directly
    const { Snarky } = await import('./dist/node/bindings.js');
    
    if (Snarky) {
      console.log('Testing ecScale availability...');
      if (typeof Snarky.gates?.ecScale === 'function') {
        console.log('✅ ecScale method exists and is callable');
        
        // Test if it actually works or just prints warnings
        const originalConsoleWarn = console.warn;
        let warningCaught = false;
        console.warn = (...args) => {
          if (args.some(arg => typeof arg === 'string' && arg.includes('ecScale'))) {
            warningCaught = true;
          }
          originalConsoleWarn(...args);
        };
        
        try {
          // Create dummy state for ecScale test
          const dummyState = [0, [], [], [], [Field(1).value, Field(2).value], Field(0).value, Field(1).value];
          Snarky.gates.ecScale(dummyState);
          
          if (warningCaught) {
            console.log('❌ ecScale prints warning - not fully implemented');
          } else {
            console.log('✅ ecScale appears to work without warnings');
          }
        } catch (error) {
          console.log('🤔 ecScale exists but throws error:', error.message);
        }
        
        console.warn = originalConsoleWarn;
      } else {
        console.log('❌ ecScale method not found');
      }
      
      console.log('\nTesting ecEndoscale availability...');
      if (typeof Snarky.gates?.ecEndoscale === 'function') {
        console.log('✅ ecEndoscale method exists');
      } else {
        console.log('❌ ecEndoscale method not found');
      }
      
      console.log('\nTesting lookup availability...');
      if (typeof Snarky.gates?.lookup === 'function') {
        console.log('✅ lookup method exists');
        
        // Test if it works or prints warnings
        const originalConsoleWarn = console.warn;
        let warningCaught = false;
        console.warn = (...args) => {
          if (args.some(arg => typeof arg === 'string' && arg.includes('lookup'))) {
            warningCaught = true;
          }
          originalConsoleWarn(...args);
        };
        
        try {
          // Test with dummy data
          Snarky.gates.lookup([], [], []);
          
          if (warningCaught) {
            console.log('❌ lookup prints warning - not fully implemented');
          } else {
            console.log('✅ lookup appears to work without warnings');
          }
        } catch (error) {
          console.log('🤔 lookup exists but throws error:', error.message);
        }
        
        console.warn = originalConsoleWarn;
      } else {
        console.log('❌ lookup method not found');
      }
      
      console.log('\nTesting rangeCheck availability...');
      if (typeof Snarky.gates?.rangeCheck === 'function') {
        console.log('✅ rangeCheck method exists');
      } else if (typeof Snarky.field?.rangeCheck === 'function') {
        console.log('✅ rangeCheck method exists (in field module)');
      } else {
        console.log('❌ rangeCheck method not found');
      }
      
      console.log('\nTesting foreignFieldAdd availability...');
      if (typeof Snarky.gates?.foreignFieldAdd === 'function') {
        console.log('✅ foreignFieldAdd method exists');
      } else if (typeof Snarky.field?.foreignFieldAdd === 'function') {
        console.log('✅ foreignFieldAdd method exists (in field module)');
      } else {
        console.log('❌ foreignFieldAdd method not found');
      }
      
      console.log('\n📊 Available gates methods:');
      if (Snarky.gates) {
        const methods = Object.keys(Snarky.gates).filter(key => typeof Snarky.gates[key] === 'function');
        console.log('Available:', methods.slice(0, 10).join(', '), methods.length > 10 ? `... and ${methods.length - 10} more` : '');
      }
      
    } else {
      console.log('❌ Snarky bindings not available');
    }
    
  } catch (error) {
    console.error('❌ Error during API test:', error.message);
  }
}

testMissingMethods().catch(console.error);