/**
 * REAL CONSTRAINT EXTRACTION TEST
 * 
 * Tests operations that actually generate constraints to compare
 * the real constraint systems causing permutation failures.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend, Bool } from './dist/node/index.js';

async function testRealConstraints() {
  console.log('🔍 REAL CONSTRAINT GENERATION TEST');
  console.log('='.repeat(60));

  try {
    // Test operations that actually generate constraints
    console.log('\n🧪 TESTING CONSTRAINT-GENERATING OPERATIONS:');
    
    console.log('\n🔵 Snarky backend - Constraint-generating operations:');
    await switchBackend('snarky');
    
    // Test 1: Multiplication (generates constraints)
    console.log('\n1️⃣ Field multiplication:');
    const snarkyMulConstraints = await Provable.constraintSystem(() => {
      const a = Field(3);
      const b = Field(4);
      const c = a.mul(b); // Multiplication generates constraints
      return c;
    });
    console.log(`📊 Snarky mul constraints: ${snarkyMulConstraints.gates?.length || 0} gates`);
    
    // Test 2: Boolean operations (generate constraints)
    console.log('\n2️⃣ Boolean AND operation:');
    const snarkyBoolConstraints = await Provable.constraintSystem(() => {
      const a = Bool(true);
      const b = Bool(false);
      const c = a.and(b); // Boolean AND generates constraints
      return c;
    });
    console.log(`📊 Snarky bool constraints: ${snarkyBoolConstraints.gates?.length || 0} gates`);
    
    // Test 3: Field equality check (generates constraints)
    console.log('\n3️⃣ Field equality assertion:');
    const snarkyEqualConstraints = await Provable.constraintSystem(() => {
      const a = Field(5);
      const b = Field(5);
      a.assertEquals(b); // Equality check generates constraints
      return a;
    });
    console.log(`📊 Snarky equal constraints: ${snarkyEqualConstraints.gates?.length || 0} gates`);
    
    console.log('\n🟠 Sparky backend - Constraint-generating operations:');
    await switchBackend('sparky');
    
    // Test 1: Multiplication (generates constraints)
    console.log('\n1️⃣ Field multiplication:');
    const sparkyMulConstraints = await Provable.constraintSystem(() => {
      const a = Field(3);
      const b = Field(4);
      const c = a.mul(b); // Multiplication generates constraints
      return c;
    });
    console.log(`📊 Sparky mul constraints: ${sparkyMulConstraints.gates?.length || 0} gates`);
    
    // Test 2: Boolean operations (generate constraints)
    console.log('\n2️⃣ Boolean AND operation:');
    const sparkyBoolConstraints = await Provable.constraintSystem(() => {
      const a = Bool(true);
      const b = Bool(false);
      const c = a.and(b); // Boolean AND generates constraints
      return c;
    });
    console.log(`📊 Sparky bool constraints: ${sparkyBoolConstraints.gates?.length || 0} gates`);
    
    // Test 3: Field equality check (generates constraints)
    console.log('\n3️⃣ Field equality assertion:');
    const sparkyEqualConstraints = await Provable.constraintSystem(() => {
      const a = Field(5);
      const b = Field(5);
      a.assertEquals(b); // Equality check generates constraints
      return a;
    });
    console.log(`📊 Sparky equal constraints: ${sparkyEqualConstraints.gates?.length || 0} gates`);
    
    // COMPARISON ANALYSIS
    console.log('\n🔍 CONSTRAINT SYSTEM COMPARISON:');
    
    // Compare multiplication constraints
    if (snarkyMulConstraints.gates?.length > 0 && sparkyMulConstraints.gates?.length > 0) {
      console.log('\n✅ Both backends generated multiplication constraints');
      console.log(`📊 Gate counts: Snarky=${snarkyMulConstraints.gates.length} vs Sparky=${sparkyMulConstraints.gates.length}`);
      
      const snarkyFirstGate = snarkyMulConstraints.gates[0];
      const sparkyFirstGate = sparkyMulConstraints.gates[0];
      
      console.log(`🔍 First gate types: Snarky='${snarkyFirstGate.typ}' vs Sparky='${sparkyFirstGate.typ}'`);
      console.log(`🔍 Wire counts: Snarky=${snarkyFirstGate.wires?.length} vs Sparky=${sparkyFirstGate.wires?.length}`);
      console.log(`🔍 Coeff counts: Snarky=${snarkyFirstGate.coeffs?.length} vs Sparky=${sparkyFirstGate.coeffs?.length}`);
      
      // Print actual constraint data for comparison
      console.log('\n📋 SNARKY MULTIPLICATION CONSTRAINT:');
      console.log(JSON.stringify(snarkyFirstGate, null, 2));
      
      console.log('\n📋 SPARKY MULTIPLICATION CONSTRAINT:');
      console.log(JSON.stringify(sparkyFirstGate, null, 2));
      
      // Check if constraint systems are identical
      const snarkyJson = JSON.stringify(snarkyMulConstraints);
      const sparkyJson = JSON.stringify(sparkyMulConstraints);
      
      if (snarkyJson === sparkyJson) {
        console.log('\n✅ MULTIPLICATION CONSTRAINT SYSTEMS ARE IDENTICAL!');
      } else {
        console.log('\n❌ MULTIPLICATION CONSTRAINT SYSTEMS DIFFER!');
        console.log('🔍 Finding differences...');
        
        // Find first difference
        for (let i = 0; i < Math.min(snarkyJson.length, sparkyJson.length); i++) {
          if (snarkyJson[i] !== sparkyJson[i]) {
            console.log(`🔍 First difference at index ${i}: '${snarkyJson[i]}' vs '${sparkyJson[i]}'`);
            console.log(`🔍 Context: "${snarkyJson.slice(Math.max(0, i-30), i+30)}"`);
            break;
          }
        }
      }
    } else {
      console.log('\n❌ One or both backends failed to generate multiplication constraints');
      console.log(`   Snarky: ${snarkyMulConstraints.gates?.length || 0} gates`);
      console.log(`   Sparky: ${sparkyMulConstraints.gates?.length || 0} gates`);
    }
    
    // Compare boolean constraints
    if (snarkyBoolConstraints.gates?.length > 0 && sparkyBoolConstraints.gates?.length > 0) {
      console.log('\n✅ Both backends generated boolean constraints');
      console.log(`📊 Boolean gate counts: Snarky=${snarkyBoolConstraints.gates.length} vs Sparky=${sparkyBoolConstraints.gates.length}`);
    } else {
      console.log('\n❌ One or both backends failed to generate boolean constraints');
      console.log(`   Snarky bool: ${snarkyBoolConstraints.gates?.length || 0} gates`);
      console.log(`   Sparky bool: ${sparkyBoolConstraints.gates?.length || 0} gates`);
    }
    
    // Now test with a ZkProgram that has constraint-generating operations
    console.log('\n🧪 ZKPROGRAM WITH CONSTRAINT-GENERATING OPERATIONS:');
    
    const ConstraintProgram = ZkProgram({
      name: 'ConstraintProgram',
      publicInput: Field,
      publicOutput: Field,
      methods: {
        multiply: {
          privateInputs: [Field],
          async method(publicInput, privateInput) {
            console.log('🔧 Inside ZkProgram method - about to perform multiplication');
            const result = publicInput.mul(privateInput); // This SHOULD generate constraints
            console.log('🔧 Multiplication completed, returning result');
            return { publicOutput: result };
          },
        },
      },
    });
    
    console.log('\n🔵 Snarky backend - ZkProgram with constraints:');
    await switchBackend('snarky');
    await ConstraintProgram.compile();
    
    try {
      const snarkyProof = await ConstraintProgram.multiply(Field(3), Field(4));
      console.log('✅ Snarky constraint-based proof generation: SUCCESS');
    } catch (error) {
      console.log(`❌ Snarky constraint-based proof generation failed: ${error.message}`);
    }
    
    console.log('\n🟠 Sparky backend - ZkProgram with constraints:');
    await switchBackend('sparky');
    await ConstraintProgram.compile();
    
    try {
      const sparkyProof = await ConstraintProgram.multiply(Field(3), Field(4));
      console.log('✅ Sparky constraint-based proof generation: SUCCESS');
    } catch (error) {
      console.log(`❌ Sparky constraint-based proof generation failed: ${error.message}`);
      console.log('🎯 This is where we should see the real permutation error');
    }

  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the analysis
testRealConstraints().catch(console.error);