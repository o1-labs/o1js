#!/usr/bin/env node

/**
 * DEBUG SCRIPT: ML Array Issue Investigation
 * 
 * This script investigates the exact ML Array format issue where OCaml passes
 * field constants to Sparky in ML Array format [0, field1, field2, field3] 
 * but Sparky expects standard FieldVar format [0, [0, "value"]].
 */

import { switchBackend, getCurrentBackend } from './dist/node/bindings/js/index.js';
import { Field, SmartContract, State, state, method, Mina, PrivateKey, AccountUpdate } from './dist/node/bindings/js/index.js';

console.log('🔍 ML Array Issue Investigation Script');
console.log('=====================================\n');

// Create a simple SmartContract that will trigger the ML Array issue
class TestContract extends SmartContract {
  @state(Field) value = State();
  
  @method update(newValue) {
    // This should trigger the ML Array issue during compilation
    const current = this.value.getAndRequireEquals();
    newValue.assertGreaterThan(current);
    this.value.set(newValue);
  }
}

async function testMLArrayIssue() {
  try {
    console.log('🎯 Step 1: Switch to Sparky backend');
    await switchBackend('sparky');
    console.log(`✅ Current backend: ${getCurrentBackend()}`);
    
    console.log('\n🎯 Step 2: Attempt compilation with Sparky (this should trigger ML Array error)');
    
    // Set up Mina local blockchain
    const Local = Mina.LocalBlockchain({ proofsEnabled: true });
    Mina.setActiveInstance(Local);
    
    const deployerAccount = Local.testAccounts[0].privateKey;
    const deployerKey = deployerAccount;
    const contractAccount = PrivateKey.random();
    
    console.log('📝 Creating test contract instance...');
    const zkApp = new TestContract(contractAccount.toPublicKey());
    
    console.log('🔨 Starting compilation (this is where ML Array error occurs)...');
    
    // This compilation should trigger the ML Array format mismatch error
    const compilationResult = await TestContract.compile();
    
    console.log('🚨 UNEXPECTED: Compilation succeeded!');
    console.log('Compilation result:', compilationResult);
    console.log('Verification key exists:', !!compilationResult.verificationKey);
    console.log('Provers count:', Object.keys(compilationResult.provers || {}).length);
    
  } catch (error) {
    console.log('\n🚨 EXPECTED ERROR CAUGHT:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    // Check if this is the ML Array format error
    if (error.message.includes('Invalid FieldVar format') || 
        error.message.includes('expected constant with 1 argument, got 4 arguments')) {
      console.log('\n✅ CONFIRMED: This is the ML Array format mismatch error!');
      console.log('📊 Error Analysis:');
      console.log('- OCaml passed ML Array format: [tag, elem1, elem2, elem3]');
      console.log('- Sparky expected FieldVar format: [0, [0, "value"]]');
      console.log('- Error occurred during Pickles.compile() phase');
      
      // Extract more details from the error
      if (error.stack) {
        console.log('\n📋 Stack trace (first 10 lines):');
        const stackLines = error.stack.split('\n').slice(0, 10);
        stackLines.forEach((line, i) => console.log(`  ${i}: ${line}`));
      }
      
    } else {
      console.log('\n❌ This is a different error, not the ML Array issue');
    }
  }
}

async function testSnarkyComparison() {
  try {
    console.log('\n🔍 Step 3: Test with Snarky backend for comparison');
    await switchBackend('snarky');
    console.log(`✅ Current backend: ${getCurrentBackend()}`);
    
    // Set up Mina local blockchain
    const Local = Mina.LocalBlockchain({ proofsEnabled: true });
    Mina.setActiveInstance(Local);
    
    console.log('🔨 Compiling with Snarky backend...');
    const compilationResult = await TestContract.compile();
    
    console.log('✅ Snarky compilation succeeded!');
    console.log('Verification key exists:', !!compilationResult.verificationKey);
    console.log('Provers count:', Object.keys(compilationResult.provers || {}).length);
    
  } catch (error) {
    console.log('\n🚨 Snarky compilation failed:');
    console.log('Error message:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting ML Array investigation...\n');
  
  await testMLArrayIssue();
  await testSnarkyComparison();
  
  console.log('\n🎯 Investigation Results:');
  console.log('========================');
  console.log('1. This script tests the exact ML Array format mismatch issue');
  console.log('2. The error occurs when OCaml passes field constants in ML Array format');
  console.log('3. Sparky\'s FieldVar parser expects a different format');
  console.log('4. The fix needs to be in the OCaml→Sparky bridge layer');
  
  console.log('\n🔧 Next Steps:');
  console.log('- Fix ML Array parsing in sparky-core/src/fieldvar_parser.rs');
  console.log('- Add comprehensive ML Array detection and conversion');
  console.log('- Test with various field constant formats from OCaml');
}

main().catch(console.error);