#!/usr/bin/env node

/**
 * Specific test for Rot64 gate constraint comparison
 */

import { Field, Provable, switchBackend, Gadgets } from '../../../dist/node/index.js';
import { compareConstraintSystems, analyzeConstraintSystem } from './constraint-comparison.js';

async function testRot64Gate() {
  console.log('🔍 Testing Rot64 Gate Constraint Comparison\n');
  
  const rot64Circuit = () => {
    // Create a 64-bit value for rotation
    const input = Provable.witness(Field, () => Field(0x123456789abcdef0n));
    
    // Perform 64-bit rotation by 8 bits
    const rotated = Gadgets.rotate64(input, 8, 'left');
    
    // Add a constraint to ensure the rotation is computed
    rotated.assertEquals(rotated);
  };
  
  try {
    console.log('🔬 Detailed Constraint Comparison for Rot64 Gate:');
    console.log('=' .repeat(70));
    
    // Run detailed constraint comparison
    const comparison = await compareConstraintSystems(
      'Rot64 Gate Test', 
      rot64Circuit,
      {
        verboseOutput: true,
        maxDifferences: 25,
        showIdentical: false
      }
    );
    
    console.log('\n🔍 Individual Backend Analysis:');
    console.log('=' .repeat(70));
    
    // Analyze each backend individually
    console.log('\n📊 Snarky Backend Analysis:');
    await analyzeConstraintSystem('Rot64 (Snarky)', rot64Circuit, 'snarky');
    
    console.log('\n📊 Sparky Backend Analysis:');
    await analyzeConstraintSystem('Rot64 (Sparky)', rot64Circuit, 'sparky');
    
    // Manual constraint system extraction for detailed inspection
    console.log('\n🔬 Manual Constraint System Inspection:');
    console.log('=' .repeat(70));
    
    // Extract with Snarky
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(rot64Circuit);
    
    console.log('\n📋 Snarky Rot64 Constraint System:');
    console.log(`  Rows: ${snarkyCS.rows}`);
    console.log(`  Digest: ${snarkyCS.digest}`);
    console.log(`  Public Input Size: ${snarkyCS.publicInputSize}`);
    console.log(`  Total Gates: ${snarkyCS.gates?.length || 'N/A'}`);
    
    if (snarkyCS.gates) {
      // Analyze gate types
      const gateTypes: Record<string, number> = {};
      snarkyCS.gates.forEach((gate: any) => {
        gateTypes[gate.type] = (gateTypes[gate.type] || 0) + 1;
      });
      
      console.log('  Gate Type Distribution:');
      Object.entries(gateTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count} gates`);
      });
      
      // Show first few gates
      console.log('\n  First 5 gates:');
      snarkyCS.gates.slice(0, 5).forEach((gate: any, i: number) => {
        console.log(`    Gate ${i}: ${gate.type}`);
        console.log(`      Wires: [${gate.wires?.map((w: any) => `(${w.row},${w.col})`).join(', ') || 'N/A'}]`);
        console.log(`      Coeffs: [${gate.coeffs?.slice(0, 3).join(', ') || 'N/A'}${gate.coeffs?.length > 3 ? '...' : ''}]`);
      });
    }
    
    // Extract with Sparky
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(rot64Circuit);
    
    console.log('\n📋 Sparky Rot64 Constraint System:');
    console.log(`  Rows: ${sparkyCS.rows}`);
    console.log(`  Digest: ${sparkyCS.digest}`);
    console.log(`  Public Input Size: ${sparkyCS.publicInputSize}`);
    console.log(`  Total Gates: ${sparkyCS.gates?.length || 'N/A'}`);
    
    if (sparkyCS.gates) {
      // Same analysis for Sparky
      const gateTypes: Record<string, number> = {};
      sparkyCS.gates.forEach((gate: any) => {
        gateTypes[gate.type] = (gateTypes[gate.type] || 0) + 1;
      });
      
      console.log('  Gate Type Distribution:');
      Object.entries(gateTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count} gates`);
      });
      
      console.log('\n  First 5 gates:');
      sparkyCS.gates.slice(0, 5).forEach((gate: any, i: number) => {
        console.log(`    Gate ${i}: ${gate.type}`);
        console.log(`      Wires: [${gate.wires?.map((w: any) => `(${w.row},${w.col})`).join(', ') || 'N/A'}]`);
        console.log(`      Coeffs: [${gate.coeffs?.slice(0, 3).join(', ') || 'N/A'}${gate.coeffs?.length > 3 ? '...' : ''}]`);
      });
    } else {
      console.log('  ⚠️  No gate details available from Sparky backend');
    }
    
    // Print constraint systems for visual comparison
    console.log('\n📄 Constraint System Printouts:');
    console.log('=' .repeat(70));
    
    console.log('\n🔹 Snarky Rot64 Constraint System:');
    await switchBackend('snarky');
    const snarkyCS2 = await Provable.constraintSystem(rot64Circuit);
    snarkyCS2.print();
    
    console.log('\n🔹 Sparky Rot64 Constraint System:');
    await switchBackend('sparky');
    const sparkyCS2 = await Provable.constraintSystem(rot64Circuit);
    sparkyCS2.print();
    
    // Summary
    console.log('\n📝 Summary:');
    console.log('=' .repeat(70));
    console.log(`✓ Rows:          Snarky=${snarkyCS.rows}, Sparky=${sparkyCS.rows} ${snarkyCS.rows === sparkyCS.rows ? '✅' : '❌'}`);
    console.log(`✓ Public Input:  Snarky=${snarkyCS.publicInputSize}, Sparky=${sparkyCS.publicInputSize} ${snarkyCS.publicInputSize === sparkyCS.publicInputSize ? '✅' : '❌'}`);
    console.log(`✓ Digest:        ${snarkyCS.digest === sparkyCS.digest ? '✅ MATCH' : '❌ DIFFER'}`);
    
    if (snarkyCS.digest !== sparkyCS.digest) {
      console.log(`  Snarky:  ${snarkyCS.digest}`);
      console.log(`  Sparky:  ${sparkyCS.digest}`);
    }
    
    console.log(`✓ Gates:         Snarky=${snarkyCS.gates?.length || 'N/A'}, Sparky=${sparkyCS.gates?.length || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Rot64 gate test failed:', error);
    console.error('Stack trace:', error.stack);
    
    // Try to provide more context about the failure
    if (error.message?.includes('rotate64')) {
      console.log('\n💡 This might be because Rot64 gate is not implemented in one of the backends.');
      console.log('   Let\'s check what Gadgets are available...');
      
      try {
        console.log('\n📚 Available Gadgets methods:');
        const gadgetMethods = Object.getOwnPropertyNames(Gadgets).filter(name => typeof Gadgets[name] === 'function');
        console.log(gadgetMethods.join(', '));
      } catch (gadgetError) {
        console.log('   Failed to inspect Gadgets:', gadgetError.message);
      }
    }
  }
}

testRot64Gate().catch(console.error);