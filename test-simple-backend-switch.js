// Simple test to verify backend switching works
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testBackendSwitch() {
    console.log('Starting backend switch test...');
    
    try {
        // Check initial backend
        console.log('Initial backend:', getCurrentBackend());
        
        // Try switching to sparky
        console.log('Switching to sparky...');
        await switchBackend('sparky');
        console.log('Current backend after switch:', getCurrentBackend());
        
        // Switch back to snarky
        console.log('Switching back to snarky...');
        await switchBackend('snarky');
        console.log('Current backend after switch back:', getCurrentBackend());
        
        console.log('✅ Backend switching test completed successfully');
        
    } catch (error) {
        console.error('❌ Backend switching test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

testBackendSwitch();