#!/usr/bin/env node

/**
 * Debug script to trace exactly where the extra constraint comes from in field addition
 */

import { switchBackend, getCurrentBackend, Field, Provable, ZkProgram, initializeBindings } from './dist/node/index.js';

async function debugFieldAddition() {
    console.log('🔍 Debugging Field Addition Constraint Generation');
    console.log('==================================================');
    
    await initializeBindings();
    
    // Test program that does field addition
    const additionProgram = ZkProgram({
        name: 'additionProgram',
        publicInput: undefined,
        methods: {
            add: {
                privateInputs: [],
                async method() {
                    console.log('📊 Starting field addition...');
                    
                    const x = Provable.witness(Field, () => Field(5));
                    console.log('✅ Created witness x = Field(5)');
                    
                    const y = Provable.witness(Field, () => Field(7));
                    console.log('✅ Created witness y = Field(7)');
                    
                    console.log('🧮 About to call x.add(y)...');
                    const result = x.add(y);
                    console.log('✅ x.add(y) completed, result created');
                    
                    console.log('⚖️  About to call result.assertEquals(Field(12))...');
                    result.assertEquals(Field(12));
                    console.log('✅ assertEquals completed');
                }
            }
        }
    });
    
    // Test with both backends
    for (const backend of ['snarky', 'sparky']) {
        console.log(`\n🎯 Testing with ${backend} backend:`);
        console.log('----------------------------------------');
        
        await switchBackend(backend);
        console.log(`✅ Switched to ${getCurrentBackend()} backend`);
        
        try {
            console.log('🔨 Compiling program...');
            const { verificationKey } = await additionProgram.compile();
            
            console.log('📊 Analyzing constraints...');
            const analysis = await additionProgram.analyzeMethods();
            const constraintCount = Object.values(analysis)[0]?.rows || 0;
            
            console.log(`📈 Results for ${backend}:`);
            console.log(`   Constraint count: ${constraintCount}`);
            console.log(`   VK hash: ${verificationKey.hash}`);
            
        } catch (error) {
            console.error(`❌ Error with ${backend}:`, error.message);
        }
    }
}

debugFieldAddition().catch(console.error);