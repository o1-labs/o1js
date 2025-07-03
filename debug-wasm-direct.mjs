/**
 * Debug WASM bindings directly without sparky-adapter
 */

async function debugWasmDirect() {
  console.log('🔍 Debugging WASM bindings directly...\n');
  
  try {
    // Load WASM module directly
    const wasmModule = await import('./src/bindings/compiled/sparky_node/sparky_wasm.cjs');
    console.log('✅ WASM module loaded successfully');
    console.log('📦 WASM exports:', Object.keys(wasmModule));
    
    if (wasmModule.Snarky) {
      console.log('\n🎯 Creating Snarky instance...');
      const snarkyInstance = new wasmModule.Snarky();
      console.log('✅ Snarky instance created');
      console.log('📝 Instance properties:', Object.keys(snarkyInstance));
      
      // Check run module
      if (snarkyInstance.run) {
        console.log('\n🏃 Run module found');
        console.log('Run module type:', typeof snarkyInstance.run);
        console.log('Run module properties:', Object.keys(snarkyInstance.run));
        
        // Check for constraint-related functions
        const runMethods = Object.getOwnPropertyNames(snarkyInstance.run);
        console.log('Run module methods:', runMethods);
        
        const constraintMethods = runMethods.filter(m => 
          m.toLowerCase().includes('constraint') || 
          m.toLowerCase().includes('system') ||
          m.toLowerCase().includes('gate')
        );
        console.log('Constraint-related methods:', constraintMethods);
      }
      
      // Check constraintSystem module
      if (snarkyInstance.constraintSystem) {
        console.log('\n⚙️ ConstraintSystem module found');
        console.log('ConstraintSystem type:', typeof snarkyInstance.constraintSystem);
        console.log('ConstraintSystem properties:', Object.keys(snarkyInstance.constraintSystem));
        
        const csMethods = Object.getOwnPropertyNames(snarkyInstance.constraintSystem);
        console.log('ConstraintSystem methods:', csMethods);
      }
      
      // Check field module
      if (snarkyInstance.field) {
        console.log('\n🔢 Field module found');
        console.log('Field type:', typeof snarkyInstance.field);
        console.log('Field properties:', Object.keys(snarkyInstance.field));
        
        const fieldMethods = Object.getOwnPropertyNames(snarkyInstance.field);
        console.log('Field methods:', fieldMethods);
        
        // Test basic field operations
        try {
          console.log('\n🧪 Testing field operations...');
          
          // Test if we can call field methods
          if (typeof snarkyInstance.field.add === 'function') {
            console.log('✅ field.add is callable');
          }
          
          if (typeof snarkyInstance.field.assertEqual === 'function') {
            console.log('✅ field.assertEqual is callable');
          }
          
        } catch (error) {
          console.log('❌ Error testing field operations:', error.message);
        }
      }
      
      // Look for any methods with 'constraint' in the name
      console.log('\n🔍 Searching for constraint-related methods...');
      const allMethods = [];
      
      function collectMethods(obj, prefix = '') {
        if (!obj || typeof obj !== 'object') return;
        
        try {
          const keys = Object.getOwnPropertyNames(obj);
          for (const key of keys) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'function') {
              allMethods.push(fullKey);
            } else if (typeof obj[key] === 'object' && obj[key] !== null && prefix.split('.').length < 3) {
              collectMethods(obj[key], fullKey);
            }
          }
        } catch (e) {
          // Skip if we can't enumerate properties
        }
      }
      
      collectMethods(snarkyInstance);
      
      const constraintMethods = allMethods.filter(m => 
        m.toLowerCase().includes('constraint') ||
        m.toLowerCase().includes('system') ||
        m.toLowerCase().includes('gate') ||
        m.toLowerCase().includes('compile')
      );
      
      console.log('🎯 Found constraint-related methods:');
      constraintMethods.forEach(method => console.log(`  - ${method}`));
      
    } else {
      console.log('❌ No Snarky class found in WASM exports');
    }
    
  } catch (error) {
    console.error('❌ Error loading WASM:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugWasmDirect().catch(console.error);