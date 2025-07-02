/**
 * Try different approaches to retrieve constraints
 */

import { switchBackend, getCurrentBackend, Field, ZkProgram, Provable } from './dist/node/index.js';

async function tryConstraintSystemVariations() {
  console.log('🔧 Trying Different Constraint System Approaches:');
  console.log('================================================');
  
  try {
    await switchBackend('snarky');
    console.log('Testing with Snarky backend...\n');
    
    // Approach 1: Standard constraintSystem
    console.log('📍 Approach 1: Standard Provable.constraintSystem');
    const cs1 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      return x.add(Field(3));
    });
    console.log('  Result keys:', Object.keys(cs1));
    console.log('  Gates length:', cs1.gates?.length);
    console.log('  Rows:', cs1.rows);
    
    // Approach 2: Try with different syntax  
    console.log('\n📍 Approach 2: Direct field operations');
    const cs2 = await Provable.constraintSystem(() => {
      const x = Field(5);
      const y = Field(3);
      const result = x.add(y);
      result.assertEquals(Field(8));
      return result;
    });
    console.log('  Result keys:', Object.keys(cs2));
    console.log('  Gates length:', cs2.gates?.length);
    console.log('  Rows:', cs2.rows);
    
    // Approach 3: Try calling methods on constraint system
    console.log('\n📍 Approach 3: Using constraint system methods');
    if (cs2.print) {
      console.log('  Calling cs.print():');
      cs2.print();
    }
    if (cs2.summary) {
      console.log('  Calling cs.summary():');
      const summary = cs2.summary();
      console.log('  Summary:', summary);
    }
    
    // Approach 4: Access gates array directly
    console.log('\n📍 Approach 4: Direct gates array access');
    if (cs2.gates && Array.isArray(cs2.gates)) {
      console.log('  Gates is array:', true);
      console.log('  Gates length:', cs2.gates.length);
      if (cs2.gates.length > 0) {
        console.log('  First gate:', cs2.gates[0]);
        console.log('  All gate types:', cs2.gates.map(g => g?.type || 'unknown'));
      }
    }
    
    // Approach 5: Try with ZkProgram method analysis
    console.log('\n📍 Approach 5: ZkProgram method analysis');
    const TestProgram = ZkProgram({
      name: 'TestProgram',
      publicInput: Field,
      methods: {
        simple: {
          privateInputs: [],
          async method(input) {
            return input.add(Field(1));
          }
        }
      }
    });
    
    console.log('  Analyzing ZkProgram method...');
    const methodCs = await Provable.constraintSystem(() => {
      const input = Field(5);
      return input.add(Field(1));
    });
    console.log('  Method constraint gates:', methodCs.gates?.length);
    console.log('  Method constraint rows:', methodCs.rows);
    
  } catch (error) {
    console.error('❌ Snarky constraint retrieval failed:', error.message);
  }
  
  // Now try with Sparky
  try {
    console.log('\n' + '='.repeat(50));
    await switchBackend('sparky');
    console.log('Testing with Sparky backend...\n');
    
    // Same approaches with Sparky
    console.log('📍 Approach 1: Standard Provable.constraintSystem (Sparky)');
    const sparkyCs1 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      return x.add(Field(3));
    });
    console.log('  Result keys:', Object.keys(sparkyCs1));
    console.log('  Gates length:', sparkyCs1.gates?.length);
    console.log('  Rows:', sparkyCs1.rows);
    
    console.log('\n📍 Approach 2: Direct field operations (Sparky)');
    const sparkyCs2 = await Provable.constraintSystem(() => {
      const x = Field(5);
      const y = Field(3);
      const result = x.add(y);
      result.assertEquals(Field(8));
      return result;
    });
    console.log('  Result keys:', Object.keys(sparkyCs2));
    console.log('  Gates length:', sparkyCs2.gates?.length);
    console.log('  Rows:', sparkyCs2.rows);
    
    if (sparkyCs2.print) {
      console.log('\n  Calling Sparky cs.print():');
      sparkyCs2.print();
    }
    
  } catch (error) {
    console.error('❌ Sparky constraint retrieval failed:', error.message);
  }
}

async function tryLowerLevelAccess() {
  console.log('\n\n🔍 Trying Lower-Level Constraint Access:');
  console.log('=======================================');
  
  try {
    // Try accessing global constraint system state
    console.log('📍 Checking global constraint system state...');
    
    // Check if there are any global constraint system variables
    if (typeof globalThis !== 'undefined') {
      console.log('  Global keys containing "constraint":', 
        Object.keys(globalThis).filter(k => k.toLowerCase().includes('constraint')));
      console.log('  Global keys containing "snarky":', 
        Object.keys(globalThis).filter(k => k.toLowerCase().includes('snarky')));
      console.log('  Global keys containing "gate":', 
        Object.keys(globalThis).filter(k => k.toLowerCase().includes('gate')));
    }
    
    // Try using the constraint system while running
    console.log('\n📍 Trying to access constraint system during execution...');
    await switchBackend('snarky');
    
    let capturedConstraints = null;
    const result = await Provable.constraintSystem(() => {
      console.log('    Inside constraint system generation...');
      
      // Try to access current constraint system state
      if (globalThis.__snarky) {
        console.log('    globalThis.__snarky exists:', !!globalThis.__snarky);
        console.log('    __snarky keys:', Object.keys(globalThis.__snarky || {}));
      }
      
      const x = Field(5);
      const y = Field(3);
      const result = x.add(y);
      
      console.log('    After operations, checking state again...');
      
      return result;
    });
    
    console.log('  Final result keys:', Object.keys(result));
    console.log('  Final gates:', result.gates?.length);
    
  } catch (error) {
    console.error('❌ Lower-level access failed:', error.message);
  }
}

async function tryConstraintSystemDuringCompilation() {
  console.log('\n\n⚙️ Trying Constraint Access During Compilation:');
  console.log('===============================================');
  
  try {
    await switchBackend('snarky');
    
    const CompilationTestProgram = ZkProgram({
      name: 'CompilationTest',
      publicInput: Field,
      methods: {
        addAndAssert: {
          privateInputs: [Field],
          async method(input, secret) {
            console.log('      Inside ZkProgram method execution...');
            
            const sum = input.add(secret);
            sum.assertEquals(Field(8));
            
            // Try to access constraint state here
            if (globalThis.__snarky) {
              console.log('      __snarky available in method');
              console.log('      __snarky keys:', Object.keys(globalThis.__snarky));
            }
            
            return sum;
          }
        }
      }
    });
    
    console.log('Compiling program with detailed constraint monitoring...');
    const compilationResult = await CompilationTestProgram.compile();
    
    console.log('Compilation completed successfully');
    console.log('VK hash:', compilationResult.verificationKey?.hash);
    
  } catch (error) {
    console.error('❌ Compilation constraint access failed:', error.message);
  }
}

async function tryAlternativeConstraintAPIs() {
  console.log('\n\n🛠️ Trying Alternative Constraint APIs:');
  console.log('======================================');
  
  try {
    await switchBackend('snarky');
    
    // Try different import paths
    console.log('📍 Checking available APIs...');
    const o1js = await import('./dist/node/index.js');
    console.log('  o1js keys:', Object.keys(o1js).filter(k => k.toLowerCase().includes('constraint')));
    console.log('  o1js keys:', Object.keys(o1js).filter(k => k.toLowerCase().includes('gate')));
    console.log('  o1js keys:', Object.keys(o1js).filter(k => k.toLowerCase().includes('circuit')));
    
    // Try accessing the Circuit API directly if available
    if (o1js.Circuit) {
      console.log('\n📍 Circuit API found, trying direct access...');
      try {
        const circuit = o1js.Circuit(() => {
          const x = Field(5);
          return x.add(Field(3));
        });
        console.log('  Circuit result:', circuit);
      } catch (e) {
        console.log('  Circuit API error:', e.message);
      }
    }
    
    // Try the Pickles API if available
    if (o1js.Pickles) {
      console.log('\n📍 Pickles API found...');
      console.log('  Pickles keys:', Object.keys(o1js.Pickles));
    }
    
    // Check if there are any other constraint-related exports
    const potentialConstraintAPIs = Object.keys(o1js).filter(key => 
      key.toLowerCase().includes('constraint') || 
      key.toLowerCase().includes('gate') ||
      key.toLowerCase().includes('r1cs') ||
      key.toLowerCase().includes('plonk')
    );
    
    if (potentialConstraintAPIs.length > 0) {
      console.log('\n📍 Found potential constraint APIs:', potentialConstraintAPIs);
      for (const api of potentialConstraintAPIs) {
        try {
          console.log(`  ${api}:`, typeof o1js[api]);
          if (typeof o1js[api] === 'object' && o1js[api]) {
            console.log(`    ${api} keys:`, Object.keys(o1js[api]).slice(0, 5));
          }
        } catch (e) {
          console.log(`    ${api} access error:`, e.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Alternative API access failed:', error.message);
  }
}

// Run all approaches
async function runAllApproaches() {
  await tryConstraintSystemVariations();
  await tryLowerLevelAccess();
  await tryConstraintSystemDuringCompilation();
  await tryAlternativeConstraintAPIs();
  
  console.log('\n🎯 CONSTRAINT RETRIEVAL ANALYSIS COMPLETE');
  console.log('If constraints are still showing as 0/empty, we may need to:');
  console.log('1. Use a different API or import path');
  console.log('2. Access constraints at a different point in the lifecycle');
  console.log('3. Use backend-specific constraint access methods');
  console.log('4. Check if constraints need to be explicitly enabled/configured');
}

runAllApproaches().catch(console.error);