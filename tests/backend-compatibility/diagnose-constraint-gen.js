import { Field, initializeBindings, switchBackend, Provable } from '../../dist/node/index.js';

async function diagnoseConstraintGen() {
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Diagnosing constraint generation ===');
  
  // Test direct Gates.rotate call
  console.log('\n1. Testing direct Gates.rotate call:');
  
  try {
    const result = Provable.constraintSystem(() => {
      // Create some field variables
      const field = Provable.witness(Field, () => Field(15));
      const rotated = Provable.witness(Field, () => Field(240));
      const excess = Provable.witness(Field, () => Field(0));
      
      // Create bound limbs and crumbs
      const limbs = [
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0))
      ];
      
      const crumbs = [
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0)),
        Provable.witness(Field, () => Field(0))
      ];
      
      console.log('About to call Gates.rotate...');
      
      // Import Gates
      const Gates = globalThis.Snarky?.gates;
      if (!Gates) {
        throw new Error('Gates not available');
      }
      
      // Call the rotate gate directly
      Gates.rotate(field, rotated, excess, limbs, crumbs, 16n);
      
      console.log('Gates.rotate call completed');
    });
    
    console.log('✅ Direct Gates.rotate succeeded');
  } catch (e) {
    console.error('❌ Direct Gates.rotate failed:', e.message);
    console.error('Stack:', e.stack);
  }
}

diagnoseConstraintGen().catch(console.error);