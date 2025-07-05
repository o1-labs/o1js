// Investigate backend structure
// Import from the built distribution instead of source files
import { getCurrentBackend, switchBackend } from './dist/node/bindings.js';

console.log('Investigating backend structure...\n');

// Check Snarky backend
switchBackend('snarky');
const snarkyBackend = getCurrentBackend();
console.log('=== SNARKY BACKEND ===');
console.log('Type:', typeof snarkyBackend);
console.log('Constructor:', snarkyBackend?.constructor?.name);
console.log('Keys:', Object.keys(snarkyBackend || {}).slice(0, 10), '...');

// Look for field or inProver
if (snarkyBackend) {
  console.log('\nSearching for inProver...');
  
  // Direct property
  console.log('backend.inProver:', typeof snarkyBackend.inProver);
  console.log('backend.field:', typeof snarkyBackend.field);
  
  // Try calling getRunModule
  if (typeof snarkyBackend === 'object') {
    const keys = Object.keys(snarkyBackend);
    const hasInProver = keys.some(k => k.toLowerCase().includes('prover'));
    console.log('Has prover-related keys:', hasInProver);
    if (hasInProver) {
      console.log('Prover-related keys:', keys.filter(k => k.toLowerCase().includes('prover')));
    }
  }
}

// Check Sparky backend
console.log('\n=== SPARKY BACKEND ===');
switchBackend('sparky');
const sparkyBackend = getCurrentBackend();
console.log('Type:', typeof sparkyBackend);
console.log('Constructor:', sparkyBackend?.constructor?.name);
console.log('Keys:', Object.keys(sparkyBackend || {}).slice(0, 10), '...');

// Look for field or inProver
if (sparkyBackend) {
  console.log('\nSearching for inProver...');
  
  // Direct property
  console.log('backend.inProver:', typeof sparkyBackend.inProver);
  console.log('backend.field:', typeof sparkyBackend.field);
  
  // Try to find the actual structure
  if (typeof sparkyBackend === 'object') {
    const keys = Object.keys(sparkyBackend);
    const hasInProver = keys.some(k => k.toLowerCase().includes('prover'));
    console.log('Has prover-related keys:', hasInProver);
    if (hasInProver) {
      console.log('Prover-related keys:', keys.filter(k => k.toLowerCase().includes('prover')));
    }
  }
}