import { Field, SmartContract, State, state, method, Mina, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

console.log('🔍 FieldVar Format Debug (TypeScript)');
console.log('=====================================\n');

// Override JSON.stringify to handle BigInt
(BigInt.prototype as any).toJSON = function() { 
  return this.toString(); 
};

async function investigateFieldVarFormat() {
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Using Sparky backend:', getCurrentBackend());
  console.log('');

  // Test 1: Deep inspection of Field structure
  console.log('📋 Test 1: Field Structure Deep Dive');
  console.log('------------------------------------');
  
  const testField = Field(123);
  console.log('Created Field(123)');
  console.log('Type of field.value:', typeof testField.value);
  console.log('Field.value:', testField.value);
  
  // Check if it's really an array
  if (Array.isArray(testField.value)) {
    console.log('\n🔍 Analyzing FieldVar array structure:');
    console.log('Length:', testField.value.length);
    testField.value.forEach((elem: any, i: number) => {
      console.log(`[${i}]: type=${typeof elem}, value=`, elem);
      if (typeof elem === 'bigint') {
        console.log(`     BigInt detected! Value: ${elem}n`);
      }
      if (Array.isArray(elem)) {
        console.log(`     Nested array with ${elem.length} elements:`);
        elem.forEach((nested: any, j: number) => {
          console.log(`     [${j}]: type=${typeof nested}, value=`, nested);
          if (typeof nested === 'bigint') {
            console.log(`          BigInt in nested array! Value: ${nested}n`);
          }
        });
      }
    });
  }

  // Test 2: Check Field creation with different values
  console.log('\n📋 Test 2: Field Creation Patterns');
  console.log('----------------------------------');
  
  const testCases = [
    { value: 0, name: 'Field(0)' },
    { value: 1, name: 'Field(1)' },
    { value: -1, name: 'Field(-1)' },
    { value: 42, name: 'Field(42)' },
    { value: '123', name: 'Field("123")' },
  ];

  for (const testCase of testCases) {
    try {
      const f = Field(testCase.value as any);
      console.log(`\n${testCase.name}:`);
      console.log('  value property:', f.value);
      console.log('  JSON.stringify:', JSON.stringify(f.value));
    } catch (e: any) {
      console.log(`\n${testCase.name}: ERROR - ${e.message}`);
    }
  }

  // Test 3: Intercept WASM calls
  console.log('\n📋 Test 3: WASM Call Interception');
  console.log('---------------------------------');
  
  // Check if we can access the sparky instance
  const sparkyGlobal = (globalThis as any).__sparky;
  const sparkyBridge = (globalThis as any).sparkyConstraintBridge;
  
  if (sparkyGlobal) {
    console.log('✅ __sparky available');
    if (sparkyGlobal.field) {
      console.log('Field module available');
      
      // Try to intercept the constant function
      const originalConstant = sparkyGlobal.field.constant;
      sparkyGlobal.field.constant = function(value: any) {
        console.log('\n🔍 INTERCEPTED constant() call:');
        console.log('  Input value:', value);
        console.log('  Input type:', typeof value);
        console.log('  Is array:', Array.isArray(value));
        if (Array.isArray(value)) {
          console.log('  Array length:', value.length);
          console.log('  Array contents:', JSON.stringify(value));
        }
        
        try {
          const result = originalConstant.call(this, value);
          console.log('  Result:', result);
          return result;
        } catch (e: any) {
          console.log('  ERROR:', e.message);
          throw e;
        }
      };
    }
  }

  // Test 4: SmartContract compilation with detailed logging
  console.log('\n📋 Test 4: SmartContract Compilation Trace');
  console.log('------------------------------------------');
  
  try {
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('✅ LocalBlockchain initialized');
    
    class DebugContract extends SmartContract {
      @state(Field) value = State<Field>();
      
      @method
      setValue(x: Field) {
        this.value.set(x);
      }
    }
    
    console.log('\n🔧 Starting compilation...');
    
    // Try to intercept constraint generation
    if (sparkyBridge) {
      const originalStart = sparkyBridge.startConstraintAccumulation;
      sparkyBridge.startConstraintAccumulation = function() {
        console.log('🔍 INTERCEPTED startConstraintAccumulation()');
        return originalStart.call(this);
      };
    }
    
    try {
      const result = await DebugContract.compile();
      console.log('✅ Compilation succeeded!');
      console.log('VK exists:', !!result.verificationKey);
    } catch (e: any) {
      console.log('❌ Compilation failed:', e.message);
      
      // Check if it's our target error
      if (e.message.includes('FieldVar format')) {
        console.log('\n🎯 TARGET ERROR FOUND!');
        console.log('Full error object:', e);
        
        // Try to extract more context
        if (e.stack) {
          const lines = e.stack.split('\n');
          console.log('\nError stack (first 10 lines):');
          lines.slice(0, 10).forEach((line: string) => console.log('  ', line));
        }
      }
    }
    
  } catch (e: any) {
    console.error('Setup error:', e.message);
  }

  // Test 5: Direct format testing
  console.log('\n📋 Test 5: FieldVar Format Validation');
  console.log('-------------------------------------');
  
  // Test the formats that Rust expects vs what we might be sending
  const formats = [
    { name: 'Expected constant format', value: [0, [0, "123"]] },
    { name: 'Possible wrong format 1', value: [0, 0, "123"] },
    { name: 'Possible wrong format 2', value: [0, "123"] },
    { name: 'Possible wrong format 3', value: [0, 0, "123", undefined] },
    { name: 'With BigInt (as string)', value: [0, [0, "123n"]] },
  ];
  
  if (sparkyBridge && sparkyBridge.testFieldVarConstant) {
    console.log('✅ testFieldVarConstant available\n');
    
    for (const format of formats) {
      try {
        console.log(`Testing: ${format.name}`);
        console.log(`  Input: ${JSON.stringify(format.value)}`);
        const result = sparkyBridge.testFieldVarConstant(format.value);
        console.log(`  ✅ Success:`, result);
      } catch (e: any) {
        console.log(`  ❌ Error: ${e.message}`);
      }
    }
  } else {
    console.log('❌ testFieldVarConstant not available');
  }
}

// Run the investigation
investigateFieldVarFormat().catch(console.error);