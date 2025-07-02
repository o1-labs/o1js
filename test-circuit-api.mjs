/**
 * Try using the Circuit API and global constraint objects
 */

import { switchBackend, getCurrentBackend, Field, ZkProgram, Provable, Circuit } from './dist/node/index.js';

async function tryCircuitAPI() {
  console.log('🔧 Trying Circuit API (with new):');
  console.log('=================================');
  
  try {
    await switchBackend('snarky');
    
    console.log('📍 Creating Circuit with Snarky...');
    const snarkyCircuit = new Circuit(() => {
      const x = Field(5);
      const y = Field(3);
      const result = x.add(y);
      result.assertEquals(Field(8));
      return result;
    });
    
    console.log('  Circuit created successfully');
    console.log('  Circuit type:', typeof snarkyCircuit);
    console.log('  Circuit keys:', Object.keys(snarkyCircuit));
    console.log('  Circuit prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(snarkyCircuit)));
    
    // Try to access constraint information from Circuit
    if (snarkyCircuit.constraintSystem) {
      console.log('  Circuit has constraintSystem property');
      const cs = snarkyCircuit.constraintSystem;
      console.log('  CS type:', typeof cs);
      console.log('  CS keys:', Object.keys(cs));
      console.log('  CS gates:', cs.gates?.length);
    }
    
    // Try executing the circuit
    if (snarkyCircuit.execute) {
      console.log('  Executing circuit...');
      const result = snarkyCircuit.execute();
      console.log('  Execution result:', result);
    }
    
    // Try with Sparky
    console.log('\n📍 Creating Circuit with Sparky...');
    await switchBackend('sparky');
    
    const sparkyCircuit = new Circuit(() => {
      const x = Field(5);
      const y = Field(3);
      const result = x.add(y);
      result.assertEquals(Field(8));
      return result;
    });
    
    console.log('  Sparky Circuit created successfully');
    console.log('  Circuit keys:', Object.keys(sparkyCircuit));
    
    if (sparkyCircuit.constraintSystem) {
      console.log('  Sparky Circuit has constraintSystem property');
      const cs = sparkyCircuit.constraintSystem;
      console.log('  Sparky CS gates:', cs.gates?.length);
    }
    
  } catch (error) {
    console.error('❌ Circuit API failed:', error.message);
    console.error('Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

async function tryGlobalConstraintObjects() {
  console.log('\n\n🌐 Accessing Global Constraint Objects:');
  console.log('======================================');
  
  try {
    await switchBackend('snarky');
    
    // Try accessing sparkyConstraintBridge
    if (globalThis.sparkyConstraintBridge) {
      console.log('📍 sparkyConstraintBridge found:');
      console.log('  Type:', typeof globalThis.sparkyConstraintBridge);
      console.log('  Keys:', Object.keys(globalThis.sparkyConstraintBridge));
      
      // Try to get constraint information from the bridge
      const bridge = globalThis.sparkyConstraintBridge;
      if (bridge.getConstraints) {
        console.log('  Calling getConstraints()...');
        const constraints = bridge.getConstraints();
        console.log('  Bridge constraints:', constraints);
      }
      if (bridge.constraintCount) {
        console.log('  Bridge constraint count:', bridge.constraintCount);
      }
    }
    
    // Try accessing constraintFlowStats
    if (globalThis.constraintFlowStats) {
      console.log('\n📍 constraintFlowStats found:');
      console.log('  Type:', typeof globalThis.constraintFlowStats);
      console.log('  Keys:', Object.keys(globalThis.constraintFlowStats));
      console.log('  Value:', globalThis.constraintFlowStats);
    }
    
    // Try accessing __snarky objects
    if (globalThis.__snarky) {
      console.log('\n📍 __snarky object found:');
      const snarky = globalThis.__snarky;
      console.log('  __snarky keys:', Object.keys(snarky));
      
      if (snarky.Snarky) {
        console.log('  Snarky object keys:', Object.keys(snarky.Snarky).slice(0, 10));
        
        // Try to find constraint-related methods
        const constraintMethods = Object.keys(snarky.Snarky).filter(key => 
          key.toLowerCase().includes('constraint') || 
          key.toLowerCase().includes('gate') ||
          key.toLowerCase().includes('circuit')
        );
        console.log('  Constraint-related methods:', constraintMethods);
        
        // Try accessing specific methods
        if (snarky.Snarky.getConstraints) {
          console.log('  Calling Snarky.getConstraints()...');
          try {
            const constraints = snarky.Snarky.getConstraints();
            console.log('  Direct constraints:', constraints);
          } catch (e) {
            console.log('  getConstraints error:', e.message);
          }
        }
      }
      
      if (snarky.Pickles) {
        console.log('  Pickles object keys:', Object.keys(snarky.Pickles).slice(0, 10));
      }
    }
    
  } catch (error) {
    console.error('❌ Global object access failed:', error.message);
  }
}

async function tryConstraintSystemWithWitness() {
  console.log('\n\n👁️ Trying Constraint System with Proper Witness Usage:');
  console.log('======================================================');
  
  try {
    await switchBackend('snarky');
    
    console.log('📍 Testing with explicit witness generation...');
    
    // Try a more complex constraint system that should definitely generate constraints
    const cs = await Provable.constraintSystem(() => {
      console.log('    Inside constraint system...');
      
      // Create witnesses properly
      const secret1 = Provable.witness(Field, () => Field(5));
      const secret2 = Provable.witness(Field, () => Field(3));
      
      console.log('    Created witnesses...');
      
      // Perform operations
      const sum = secret1.add(secret2);
      const product = secret1.mul(secret2);
      
      console.log('    Performed operations...');
      
      // Add constraints
      sum.assertEquals(Field(8));
      product.assertEquals(Field(15));
      
      console.log('    Added constraints...');
      
      // Check if constraints were added
      if (globalThis.__snarky && globalThis.__snarky.Snarky) {
        console.log('    Checking Snarky state after constraints...');
        // Try to access current constraint state
      }
      
      return { sum, product };
    });
    
    console.log('Constraint system with witnesses completed');
    console.log('  Gates:', cs.gates?.length);
    console.log('  Rows:', cs.rows);
    console.log('  Public input size:', cs.publicInputSize);
    
    // Print the constraint system
    if (cs.print) {
      console.log('\nPrinting constraint system:');
      cs.print();
    }
    
    // Get summary
    if (cs.summary) {
      console.log('\nConstraint system summary:');
      const summary = cs.summary();
      console.log('Summary:', summary);
    }
    
    // Try with Sparky to compare
    console.log('\n📍 Same test with Sparky...');
    await switchBackend('sparky');
    
    const sparkyCss = await Provable.constraintSystem(() => {
      const secret1 = Provable.witness(Field, () => Field(5));
      const secret2 = Provable.witness(Field, () => Field(3));
      const sum = secret1.add(secret2);
      const product = secret1.mul(secret2);
      sum.assertEquals(Field(8));
      product.assertEquals(Field(15));
      return { sum, product };
    });
    
    console.log('Sparky constraint system completed');
    console.log('  Gates:', sparkyCss.gates?.length);
    console.log('  Rows:', sparkyCss.rows);
    
    if (sparkyCss.print) {
      console.log('\nSparky constraint system:');
      sparkyCss.print();
    }
    
  } catch (error) {
    console.error('❌ Witness constraint system failed:', error.message);
  }
}

async function tryZkProgramConstraintAccess() {
  console.log('\n\n🔧 Trying ZkProgram Constraint Access:');
  console.log('=====================================');
  
  try {
    await switchBackend('snarky');
    
    const TestProgram = ZkProgram({
      name: 'TestProgram',
      publicInput: Field,
      methods: {
        complexMethod: {
          privateInputs: [Field, Field],
          async method(publicInput, secret1, secret2) {
            // Multiple constraints
            const sum = secret1.add(secret2);
            const product = secret1.mul(secret2);
            const finalResult = sum.add(product).add(publicInput);
            
            // Several assertions
            sum.assertEquals(Field(8));
            product.assertEquals(Field(15));
            
            return finalResult;
          }
        }
      }
    });
    
    console.log('📍 Compiling complex ZkProgram...');
    const { verificationKey } = await TestProgram.compile();
    
    console.log('  Compilation completed');
    console.log('  VK hash:', verificationKey.hash);
    
    // Try to analyze the method directly
    console.log('\n📍 Analyzing method constraints...');
    const methodCs = await Provable.constraintSystem(() => {
      // Simulate the method
      const publicInput = Field(1);
      const secret1 = Provable.witness(Field, () => Field(5));
      const secret2 = Provable.witness(Field, () => Field(3));
      
      const sum = secret1.add(secret2);
      const product = secret1.mul(secret2);
      const finalResult = sum.add(product).add(publicInput);
      
      sum.assertEquals(Field(8));
      product.assertEquals(Field(15));
      
      return finalResult;
    });
    
    console.log('  Method analysis gates:', methodCs.gates?.length);
    console.log('  Method analysis rows:', methodCs.rows);
    
    if (methodCs.gates && methodCs.gates.length > 0) {
      console.log('  ✅ FOUND CONSTRAINTS!');
      console.log('  First gate:', methodCs.gates[0]);
      console.log('  Gate types:', methodCs.gates.map(g => g.type));
    } else {
      console.log('  ❌ Still no constraints found');
    }
    
  } catch (error) {
    console.error('❌ ZkProgram constraint access failed:', error.message);
  }
}

// Run all new approaches
async function runNewApproaches() {
  await tryCircuitAPI();
  await tryGlobalConstraintObjects();
  await tryConstraintSystemWithWitness();
  await tryZkProgramConstraintAccess();
  
  console.log('\n🎯 NEW CONSTRAINT RETRIEVAL APPROACHES COMPLETE');
  console.log('Key findings will help identify the correct constraint access method.');
}

runNewApproaches().catch(console.error);