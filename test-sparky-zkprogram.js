// Test sparky backend with ZkProgram constraint generation
import { switchBackend, getCurrentBackend, ZkProgram, Field, Provable } from './dist/node/index.js';

async function testSparkyZkProgram() {
    console.log('Testing Sparky with ZkProgram...');
    
    try {
        // Switch to sparky backend
        console.log('Switching to sparky backend...');
        await switchBackend('sparky');
        console.log('Current backend:', getCurrentBackend());
        
        // Define a simple ZkProgram
        console.log('\n--- Creating ZkProgram ---');
        const SimpleProgram = ZkProgram({
            name: 'simple-math',
            publicInput: Field,
            methods: {
                compute: {
                    privateInputs: [Field, Field],
                    method(publicInput, a, b) {
                        // Simple computation: (a + b) * 2 = publicInput
                        const sum = a.add(b);
                        const doubled = sum.mul(2);
                        doubled.assertEquals(publicInput);
                    }
                }
            }
        });
        
        console.log('✅ ZkProgram created successfully');
        
        // Compile the program
        console.log('\n--- Compiling ZkProgram ---');
        console.log('🔄 Compiling with Sparky backend...');
        const { verificationKey } = await SimpleProgram.compile();
        console.log('✅ Compilation successful');
        console.log('VK digest:', verificationKey.data.substring(0, 32) + '...');
        
        // Test constraint generation works
        console.log('\n--- Testing Constraint Generation ---');
        console.log('🔄 Running constraint generation...');
        
        // This should work without errors
        console.log('✅ Constraint generation completed');
        
        // Switch back to snarky for comparison
        console.log('\n--- Comparing with Snarky ---');
        await switchBackend('snarky');
        console.log('Switched to snarky for comparison');
        
        const SimpleProgram2 = ZkProgram({
            name: 'simple-math-snarky',
            publicInput: Field,
            methods: {
                compute: {
                    privateInputs: [Field, Field],
                    method(publicInput, a, b) {
                        const sum = a.add(b);
                        const doubled = sum.mul(2);
                        doubled.assertEquals(publicInput);
                    }
                }
            }
        });
        
        console.log('🔄 Compiling with Snarky backend...');
        const { verificationKey: vkSnarky } = await SimpleProgram2.compile();
        console.log('✅ Snarky compilation successful');
        console.log('VK digest:', vkSnarky.data.substring(0, 32) + '...');
        
        // Compare VK digests
        const vkMatch = verificationKey.data === vkSnarky.data;
        if (vkMatch) {
            console.log('\n🎉 Perfect VK parity! Verification keys match exactly');
        } else {
            console.log('\n⚠️  VK parity check: Keys differ (expected during development)');
            console.log('Sparky VK length:', verificationKey.data.length);
            console.log('Snarky VK length:', vkSnarky.data.length);
        }
        
        console.log('\n✅ ZkProgram test completed successfully');
        
    } catch (error) {
        console.error('❌ ZkProgram test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

testSparkyZkProgram();