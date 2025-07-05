// Debug script to examine exact JSON format output from Sparky vs Snarky
// Created: July 5, 2025 11:45 PM UTC

import { switchBackend, getCurrentBackend, Field, Provable } from './dist/node/index.js';
import { Snarky, initializeBindings } from './dist/node/bindings.js';

async function testJSONFormat() {
    console.log('🔍 JSON FORMAT DEBUG TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    function createSimpleCircuit() {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(10));
        x.add(y).assertEquals(Field(15));
    }
    
    // Test Snarky format
    console.log('\n📋 Testing Snarky JSON format...');
    await switchBackend('snarky');
    await initializeBindings('snarky');
    
    const snarkyCS = await Provable.constraintSystem(createSimpleCircuit);
    
    console.log('Snarky CS object keys:', Object.keys(snarkyCS));
    console.log('Snarky gates type:', typeof snarkyCS.gates);
    console.log('Snarky gates value:', snarkyCS.gates);
    
    // Try toJson
    try {
        const snarkyJSON = Snarky.constraintSystem.toJson(snarkyCS);
        console.log('Snarky toJson result:');
        if (snarkyJSON.gates && snarkyJSON.gates.length > 0) {
            console.log('Snarky gate[0] via toJson:');
            console.log(JSON.stringify(snarkyJSON.gates[0], null, 2));
        }
    } catch (e) {
        console.log('Snarky toJson failed:', e.message);
    }
    
    // Test Sparky format  
    console.log('\n📋 Testing Sparky JSON format...');
    await switchBackend('sparky');
    await initializeBindings('sparky');
    
    const sparkyCS = await Provable.constraintSystem(createSimpleCircuit);
    
    console.log('Sparky CS object keys:', Object.keys(sparkyCS));
    console.log('Sparky gates type:', typeof sparkyCS.gates);
    
    if (sparkyCS.gates && Array.isArray(sparkyCS.gates)) {
        console.log('Sparky gates count:', sparkyCS.gates.length);
        if (sparkyCS.gates.length > 0) {
            console.log('Sparky gate[0] direct access:');
            console.log(JSON.stringify(sparkyCS.gates[0], null, 2));
        }
    }
    
    // Try toJson for Sparky
    try {
        const sparkyJSON = Snarky.constraintSystem.toJson(sparkyCS);
        console.log('Sparky toJson result:');
        if (sparkyJSON.gates && sparkyJSON.gates.length > 0) {
            console.log('Sparky gate[0] via toJson:');
            console.log(JSON.stringify(sparkyJSON.gates[0], null, 2));
        }
    } catch (e) {
        console.log('Sparky toJson failed:', e.message);
    }
    
    console.log('\n🎯 FORMAT COMPARISON COMPLETE');
}

testJSONFormat().catch(console.error);